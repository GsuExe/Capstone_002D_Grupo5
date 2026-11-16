'use client';

import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { 
  FaenaDB, 
  TrabajadorDB, 
  AsistenciasDB, 
  EstadoAsistencia,
  CierreMensualDB,
  ResumenAsistenciaMensualDB
} from '@/lib/supabase/types';
import { 
  CalendarDays, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Save, 
  Loader2, 
  AlertCircle,
  Clock,
  Lock,
  X,
  ShieldAlert,
  PauseCircle,
  CheckCircle
} from 'lucide-react';

const supabase = createClient();

interface FormularioNovedadProps {
  operarioActivo: TrabajadorDB | null;
  marcaExistente?: AsistenciasDB;
  guardando: boolean;
  periodoCerrado: boolean;
  faenaOperativa: boolean;
  estadoFaenaTexto: string;
  onGuardar: (datos: {
    estadoDiario: EstadoAsistencia;
    horaEntrada: string;
    horaSalida: string;
    horasOrdinarias: string;
    horasExtras: string;
    observaciones: string;
  }) => Promise<void>;
}

// Subcomponente aislado para el formulario con formato 24 horas y bloqueos de faena
function FormularioNovedadDiaria({
  operarioActivo,
  marcaExistente,
  guardando,
  periodoCerrado,
  faenaOperativa,
  estadoFaenaTexto,
  onGuardar,
}: FormularioNovedadProps) {
  const [estadoDiario, setEstadoDiario] = useState<EstadoAsistencia>(
    marcaExistente?.estado_asistencia || 'PRESENTE'
  );
  const [horaEntrada, setHoraEntrada] = useState<string>(
    marcaExistente?.hora_entrada ? marcaExistente.hora_entrada.substring(0, 5) : '08:00'
  );
  const [horaSalida, setHoraSalida] = useState<string>(
    marcaExistente?.hora_salida ? marcaExistente.hora_salida.substring(0, 5) : '18:00'
  );
  const [horasOrdinarias, setHorasOrdinarias] = useState<string>(
    String(marcaExistente?.horas_ordinarias ?? 10)
  );
  const [horasExtras, setHorasExtras] = useState<string>(
    String(marcaExistente?.horas_extras ?? 0)
  );
  const [observaciones, setObservaciones] = useState<string>(
    marcaExistente?.observaciones || ''
  );

  const deshabilitadoGeneral = !operarioActivo || guardando || periodoCerrado || !faenaOperativa;

  const formatearHora24 = (valor: string): string => {
    const soloNumeros = valor.replace(/[^0-9]/g, '').slice(0, 4);
    if (soloNumeros.length <= 2) return soloNumeros;

    let horas = parseInt(soloNumeros.slice(0, 2), 10);
    if (horas > 23) horas = 23;

    let minutos = soloNumeros.slice(2);
    if (minutos.length === 2 && parseInt(minutos, 10) > 59) {
      minutos = '59';
    }

    const hh = String(horas).padStart(2, '0');
    return `${hh}:${minutos}`;
  };

  const calcularHorasOrdinarias = (entrada: string, salida: string, estado: EstadoAsistencia) => {
    if (estado === 'INASISTENCIA' || estado === 'LICENCIA' || estado === 'PERMISO') {
      setHorasOrdinarias('0');
      return;
    }

    if (!entrada || !salida || entrada.length < 5 || salida.length < 5) return;

    const [hEntrada, mEntrada] = entrada.split(':').map(Number);
    const [hSalida, mSalida] = salida.split(':').map(Number);

    if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSalida) || isNaN(mSalida)) return;

    const minEntrada = hEntrada * 60 + mEntrada;
    const minSalida = hSalida * 60 + mSalida;

    if (minSalida > minEntrada) {
      const minutosTotales = minSalida - minEntrada;
      const horasTotales = Math.round((minutosTotales / 60) * 10) / 10;
      setHorasOrdinarias(String(horasTotales));
    } else {
      setHorasOrdinarias('0');
    }
  };

  const handleEstadoChange = (nuevoEstado: EstadoAsistencia) => {
    setEstadoDiario(nuevoEstado);
    calcularHorasOrdinarias(horaEntrada, horaSalida, nuevoEstado);
    if (nuevoEstado === 'INASISTENCIA' || nuevoEstado === 'LICENCIA' || nuevoEstado === 'PERMISO') {
      setHorasExtras('0');
    }
  };

  const handleEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formateada = formatearHora24(e.target.value);
    setHoraEntrada(formateada);
    if (formateada.length === 5) {
      calcularHorasOrdinarias(formateada, horaSalida, estadoDiario);
    }
  };

  const handleSalidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formateada = formatearHora24(e.target.value);
    setHoraSalida(formateada);
    if (formateada.length === 5) {
      calcularHorasOrdinarias(horaEntrada, formateada, estadoDiario);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onGuardar({
      estadoDiario,
      horaEntrada: horaEntrada.length === 5 ? horaEntrada : '08:00',
      horaSalida: horaSalida.length === 5 ? horaSalida : '18:00',
      horasOrdinarias,
      horasExtras,
      observaciones,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      <div>
        <label className="block font-bold text-slate-700 mb-1">Estado Diario *</label>
        <select
          value={estadoDiario}
          onChange={(e) => handleEstadoChange(e.target.value as EstadoAsistencia)}
          disabled={deshabilitadoGeneral}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none font-bold text-slate-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="PRESENTE">Presente</option>
          <option value="ATRASO">Atraso</option>
          <option value="INASISTENCIA">Inasistencia</option>
          <option value="LICENCIA">Licencia Médica</option>
          <option value="PERMISO">Permiso Administrativo</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1 truncate">
            Entrada (24h)
          </label>
          <input
            type="text"
            maxLength={5}
            placeholder="08:00"
            value={horaEntrada}
            onChange={handleEntradaChange}
            disabled={deshabilitadoGeneral || estadoDiario === 'INASISTENCIA' || estadoDiario === 'LICENCIA'}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none font-mono font-bold text-slate-800 text-center tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1 truncate">
            Salida (24h)
          </label>
          <input
            type="text"
            maxLength={5}
            placeholder="18:00"
            value={horaSalida}
            onChange={handleSalidaChange}
            disabled={deshabilitadoGeneral || estadoDiario === 'INASISTENCIA' || estadoDiario === 'LICENCIA'}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none font-mono font-bold text-slate-800 text-center tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1 truncate">
            Hrs. Ordinarias
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={horasOrdinarias}
            onChange={(e) => setHorasOrdinarias(e.target.value)}
            disabled={deshabilitadoGeneral}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none font-bold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1 truncate">
            Hrs. Extras
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={horasExtras}
            onChange={(e) => setHorasExtras(e.target.value)}
            disabled={deshabilitadoGeneral}
            placeholder="0"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none font-bold text-amber-800 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">Observación / Justificación</label>
        <textarea
          rows={2}
          placeholder="Motivo de atraso, número de licencia..."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={deshabilitadoGeneral}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none disabled:opacity-60 disabled:cursor-not-allowed resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={deshabilitadoGeneral}
        className={`w-full py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs ${
          !faenaOperativa
            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
            : periodoCerrado
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-[#007734] hover:bg-[#009B43] text-white cursor-pointer'
        }`}
      >
        {guardando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : !faenaOperativa ? (
          <PauseCircle className="w-4 h-4 text-slate-500" />
        ) : periodoCerrado ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>
          {!faenaOperativa 
            ? `Faena ${estadoFaenaTexto} (Bloqueada)` 
            : periodoCerrado 
            ? 'Período Cerrado' 
            : 'Guardar Asistencia'}
        </span>
      </button>
    </form>
  );
}

export default function AsistenciaPage() {
  const [montado, setMontado] = useState(false);
  const [fechaHoy, setFechaHoy] = useState<string>('');

  const [faenas, setFaenas] = useState<FaenaDB[]>([]);
  const [faenaSeleccionadaId, setFaenaSeleccionadaId] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string>('');
  const [operarios, setOperarios] = useState<TrabajadorDB[]>([]);
  const [asistenciasDia, setAsistenciasDia] = useState<Record<number, AsistenciasDB>>({});

  const [periodoCerrado, setPeriodoCerrado] = useState<boolean>(false);
  const [detalleCierre, setDetalleCierre] = useState<CierreMensualDB | null>(null);
  const [procesandoCierre, setProcesandoCierre] = useState<boolean>(false);

  const [mostrarModalCierre, setMostrarModalCierre] = useState<boolean>(false);

  const [operarioActivo, setOperarioActivo] = useState<TrabajadorDB | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Inicialización controlada en cliente
  useEffect(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    setFechaHoy(hoyStr);
    setFecha(hoyStr);
    setMontado(true);
  }, []);

  // Faena seleccionada actual y su estado operativo
  const faenaActual = useMemo(() => {
    return faenas.find((f) => f.id === faenaSeleccionadaId) || null;
  }, [faenas, faenaSeleccionadaId]);

  const faenaEsOperativa = faenaActual?.estado === 'EN_EJECUCION';
  const estadoFaenaEtiqueta = faenaActual?.estado === 'SUSPENDIDA' 
    ? 'Suspendida' 
    : faenaActual?.estado === 'FINALIZADA' 
    ? 'Finalizada' 
    : 'En Ejecución';

  const calcularConsolidadoMes = async (faenaId: number, mes: number, anio: number) => {
    const mesPadded = String(mes).padStart(2, '0');
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const fechaDesde = `${anio}-${mesPadded}-01`;
    const fechaHasta = `${anio}-${mesPadded}-${String(ultimoDia).padStart(2, '0')}`;

    const { data: marcas, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('faena_id', faenaId)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta);

    if (error) throw error;

    const asistencias = marcas || [];

    return operarios.map((t) => {
      const marcasOp = asistencias.filter((m: AsistenciasDB) => m.trabajador_id === t.id);

      let diasTrabajados = 0;
      let inasistencias = 0;
      let licencias = 0;
      let permisos = 0;
      let atrasos = 0;
      let horasExtrasTotales = 0;

      marcasOp.forEach((m: AsistenciasDB) => {
        if (m.estado_asistencia === 'PRESENTE') diasTrabajados += 1;
        if (m.estado_asistencia === 'ATRASO') {
          diasTrabajados += 1;
          atrasos += 1;
        }
        if (m.estado_asistencia === 'INASISTENCIA') inasistencias += 1;
        if (m.estado_asistencia === 'LICENCIA') licencias += 1;
        if (m.estado_asistencia === 'PERMISO') permisos += 1;
        horasExtrasTotales += Number(m.horas_extras || 0);
      });

      const selloRaw = `${t.rut}-${anio}-${mesPadded}-${diasTrabajados}D-${horasExtrasTotales}HE`;
      const selloControl = `DT-${btoa(selloRaw).substring(0, 24)}`;

      return {
        trabajador_id: t.id,
        faena_id: faenaId,
        rut: t.rut,
        nombre_completo: `${t.nombres} ${t.apellidos}`,
        cargo: t.cargo,
        mes,
        anio,
        dias_trabajados: diasTrabajados,
        dias_inasistencias: inasistencias,
        dias_licencias: licencias,
        dias_permisos: permisos,
        total_atrasos: atrasos,
        total_horas_extras: horasExtrasTotales,
        sello_digital_control: selloControl,
      };
    });
  };

  // 1. Cargar faenas
  useEffect(() => {
    let cancelado = false;

    async function cargarFaenas() {
      try {
        const { data, error } = await supabase
          .from('faenas')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;

        if (!cancelado && data && data.length > 0) {
          setFaenas(data);
          const activa = data.find((f: FaenaDB) => f.estado === 'EN_EJECUCION') || data[0];
          setFaenaSeleccionadaId(activa.id);
        }
      } catch (err) {
        console.error('Error al cargar faenas:', err);
      }
    }

    void cargarFaenas();

    return () => {
      cancelado = true;
    };
  }, []);

  // 2. Cargar cuadrilla, marcas y estado de cierre mensual
  useEffect(() => {
    if (!faenaSeleccionadaId || !fecha) return;

    let cancelado = false;

    async function cargarDatosFaena() {
      try {
        setCargando(true);
        const [anioStr, mesStr] = fecha.split('-');
        const mesNum = parseInt(mesStr, 10);
        const anioNum = parseInt(anioStr, 10);

        const { data: cierreData } = await supabase
          .from('cierres_mensuales')
          .select('*')
          .eq('faena_id', faenaSeleccionadaId)
          .eq('mes', mesNum)
          .eq('anio', anioNum)
          .eq('esta_cerrado', true)
          .maybeSingle();

        if (cancelado) return;

        if (cierreData) {
          setPeriodoCerrado(true);
          setDetalleCierre(cierreData);
        } else {
          setPeriodoCerrado(false);
          setDetalleCierre(null);
        }

        const { data: listaTrabajadores, error: errOps } = await supabase
          .from('trabajadores')
          .select('*')
          .eq('faena_id', faenaSeleccionadaId)
          .eq('estado', 'ACTIVO')
          .order('apellidos', { ascending: true });

        if (errOps) throw errOps;

        const { data: marcas, error: errMarcas } = await supabase
          .from('asistencias')
          .select('*')
          .eq('faena_id', faenaSeleccionadaId)
          .eq('fecha', fecha);

        if (errMarcas) throw errMarcas;

        if (cancelado) return;

        const trabajadores = listaTrabajadores || [];
        setOperarios(trabajadores);

        const mapaMarcas: Record<number, AsistenciasDB> = {};
        marcas?.forEach((m: AsistenciasDB) => {
          mapaMarcas[m.trabajador_id] = m;
        });
        setAsistenciasDia(mapaMarcas);

        if (trabajadores.length > 0) {
          setOperarioActivo((prev) => {
            if (prev && trabajadores.some((t) => t.id === prev.id)) {
              return prev;
            }
            return trabajadores[0];
          });
        } else {
          setOperarioActivo(null);
        }
      } catch (err) {
        console.error('Error al sincronizar cuadrilla:', err);
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    void cargarDatosFaena();

    return () => {
      cancelado = true;
    };
  }, [faenaSeleccionadaId, fecha]);

  // Guardar asistencia con validaciones de estado de faena
  const handleGuardarAsistencia = async (datos: {
    estadoDiario: EstadoAsistencia;
    horaEntrada: string;
    horaSalida: string;
    horasOrdinarias: string;
    horasExtras: string;
    observaciones: string;
  }) => {
    if (!operarioActivo || !faenaSeleccionadaId) return;

    // 1. Bloqueo si la faena no está en ejecución
    if (!faenaEsOperativa) {
      setMensaje({ 
        tipo: 'error', 
        texto: `Operación bloqueada: La faena se encuentra ${estadoFaenaEtiqueta.toUpperCase()}. No se pueden registrar asistencias en faenas no activas.` 
      });
      return;
    }

    // 2. Bloqueo si el mes está sellado ante la DT
    if (periodoCerrado) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Edición denegada: El período mensual se encuentra cerrado e inmutable ante la DT.' 
      });
      return;
    }

    // 3. Bloqueo de fecha futura
    if (fechaHoy && fecha > fechaHoy) {
      setMensaje({
        tipo: 'error',
        texto: 'No es posible registrar ni consultar asistencias posteriores al día actual.'
      });
      return;
    }

    // 4. Validación cronológica: salida > entrada
    if (datos.estadoDiario === 'PRESENTE' || datos.estadoDiario === 'ATRASO') {
      if (datos.horaEntrada && datos.horaSalida) {
        const [hEnt, mEnt] = datos.horaEntrada.split(':').map(Number);
        const [hSal, mSal] = datos.horaSalida.split(':').map(Number);
        const minEnt = hEnt * 60 + mEnt;
        const minSal = hSal * 60 + mSal;

        if (minSal <= minEnt) {
          setMensaje({
            tipo: 'error',
            texto: `Inconsistencia horaria: La hora de salida (${datos.horaSalida}) no puede ser anterior ni igual a la hora de entrada (${datos.horaEntrada}).`
          });
          return;
        }
      }
    }

    try {
      setGuardando(true);
      setMensaje(null);

      const registro = {
        trabajador_id: operarioActivo.id,
        faena_id: faenaSeleccionadaId,
        fecha,
        hora_entrada: `${datos.horaEntrada}:00`,
        hora_salida: datos.horaSalida ? `${datos.horaSalida}:00` : null,
        estado_asistencia: datos.estadoDiario,
        horas_ordinarias: Number(datos.horasOrdinarias) || 0,
        horas_extras: Number(datos.horasExtras) || 0,
        observaciones: datos.observaciones.trim() || null,
      };

      const { data, error } = await supabase
        .from('asistencias')
        .upsert(registro, { onConflict: 'trabajador_id, fecha' })
        .select()
        .single();

      if (error) {
        if (error.message.includes('violates check constraint') || error.message.includes('hora_salida')) {
          throw new Error(`Inconsistencia en el servidor: La hora de salida debe ser mayor que la hora de entrada.`);
        }
        throw error;
      }

      setAsistenciasDia((prev) => ({
        ...prev,
        [operarioActivo.id]: data as AsistenciasDB,
      }));

      setMensaje({ 
        tipo: 'ok', 
        texto: `Asistencia guardada para ${operarioActivo.nombres} ${operarioActivo.apellidos}.` 
      });
    } catch (err: unknown) {
      setMensaje({ 
        tipo: 'error', 
        texto: err instanceof Error ? err.message : 'Error al registrar la asistencia.' 
      });
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarCierreMensual = async () => {
    if (!faenaSeleccionadaId || operarios.length === 0) return;
    const [anioStr, mesStr] = fecha.split('-');
    const anioNum = parseInt(anioStr, 10);
    const mesNum = parseInt(mesStr, 10);

    setMostrarModalCierre(false);

    try {
      setProcesandoCierre(true);
      setMensaje(null);

      const consolidados = await calcularConsolidadoMes(faenaSeleccionadaId, mesNum, anioNum);

      const { data: cierre, error: errCierre } = await supabase
        .from('cierres_mensuales')
        .insert([{
          faena_id: faenaSeleccionadaId,
          mes: mesNum,
          anio: anioNum,
          esta_cerrado: true,
          fecha_cierre: new Date().toISOString(),
          observaciones: `Cierre mensual procesado para ${operarios.length} operarios.`
        }])
        .select()
        .single();

      if (errCierre) throw errCierre;

      const filasResumen = consolidados.map((c) => ({
        cierre_id: cierre.id,
        trabajador_id: c.trabajador_id,
        faena_id: c.faena_id,
        rut_historico: c.rut,
        nombre_historico: c.nombre_completo,
        mes: c.mes,
        anio: c.anio,
        dias_trabajados: c.dias_trabajados,
        dias_inasistencias: c.dias_inasistencias,
        dias_licencias: c.dias_licencias,
        dias_permisos: c.dias_permisos,
        total_atrasos: c.total_atrasos,
        total_horas_extras: c.total_horas_extras,
        sello_digital_control: c.sello_digital_control,
      }));

      const { error: errResumen } = await supabase
        .from('resumenes_asistencia_mensual')
        .insert(filasResumen);

      if (errResumen) throw errResumen;

      setPeriodoCerrado(true);
      setDetalleCierre(cierre);
      setMensaje({ tipo: 'ok', texto: `Período ${mesNum}/${anioNum} consolidado y sellado exitosamente.` });
    } catch (err: unknown) {
      setMensaje({ 
        tipo: 'error', 
        texto: err instanceof Error ? err.message : 'Error al procesar el cierre mensual.' 
      });
    } finally {
      setProcesandoCierre(false);
    }
  };

  const handleExportarLibroDT = async () => {
    if (!faenaSeleccionadaId) return;
    const [anioStr, mesStr] = fecha.split('-');
    const anioNum = parseInt(anioStr, 10);
    const mesNum = parseInt(mesStr, 10);
    const faenaObj = faenas.find((f) => f.id === faenaSeleccionadaId);
    const nombreObra = faenaObj ? faenaObj.nombre_faena : 'Faena';
    const nombreLimpio = nombreObra.replace(/[^a-zA-Z0-9]/g, '_');

    try {
      setCargando(true);
      const workbook = XLSX.utils.book_new();

      if (periodoCerrado && detalleCierre) {
        const { data: resumenes, error: errRes } = await supabase
          .from('resumenes_asistencia_mensual')
          .select('*')
          .eq('cierre_id', detalleCierre.id);

        if (errRes) throw errRes;

        const filasCerradas = (resumenes || []).map((r: ResumenAsistenciaMensualDB) => ({
          'RUT': r.rut_historico,
          'Nombre Operario': r.nombre_historico,
          'Mes': r.mes,
          'Año': r.anio,
          'Días Trabajados': r.dias_trabajados,
          'Inasistencias': r.dias_inasistencias,
          'Licencias': r.dias_licencias,
          'Permisos': r.dias_permisos,
          'Atrasos': r.total_atrasos,
          'Horas Extras': r.total_horas_extras,
          'Sello Digital DT': r.sello_digital_control,
        }));

        if (filasCerradas.length === 0) {
          alert('No se encontraron registros en el cierre mensual.');
          return;
        }

        const worksheet = XLSX.utils.json_to_sheet(filasCerradas);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado Oficial DT');

        XLSX.writeFile(
          workbook,
          `Libro_DT_Cerrado_${nombreLimpio}_${mesStr}_${anioStr}.xlsx`
        );
        return;
      }

      const mesPadded = String(mesNum).padStart(2, '0');
      const ultimoDia = new Date(anioNum, mesNum, 0).getDate();
      const fechaDesde = `${anioNum}-${mesPadded}-01`;
      const fechaHasta = `${anioNum}-${mesPadded}-${String(ultimoDia).padStart(2, '0')}`;

      const { data: marcasMes, error: errMarcas } = await supabase
        .from('asistencias')
        .select('*')
        .eq('faena_id', faenaSeleccionadaId)
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta)
        .order('fecha', { ascending: true });

      if (errMarcas) throw errMarcas;

      const marcas = marcasMes || [];
      if (marcas.length === 0) {
        alert('No hay asistencias registradas en este mes para generar el libro.');
        return;
      }

      const consolidados = await calcularConsolidadoMes(faenaSeleccionadaId, mesNum, anioNum);
      const filasResumenParcial = consolidados.map((c) => ({
        'RUT': c.rut,
        'Nombre Operario': c.nombre_completo,
        'Cargo': c.cargo,
        'Días Trabajados': c.dias_trabajados,
        'Inasistencias': c.dias_inasistencias,
        'Licencias': c.dias_licencias,
        'Permisos': c.dias_permisos,
        'Atrasos': c.total_atrasos,
        'Total Horas Extras': c.total_horas_extras,
        'Estado Período': 'EN CURSO (NO SELLADO)',
      }));

      const wsResumen = XLSX.utils.json_to_sheet(filasResumenParcial);
      XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Mes');

      const fechasUnicas = Array.from(new Set(marcas.map((m) => m.fecha))).sort();

      fechasUnicas.forEach((fechaDia) => {
        const marcasDelDia = marcas.filter((m) => m.fecha === fechaDia);

        const filasDelDia = marcasDelDia.map((m) => {
          const trabajador = operarios.find((op) => op.id === m.trabajador_id);
          return {
            'RUT': trabajador ? trabajador.rut : 'S/R',
            'Nombre Operario': trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : 'No encontrado',
            'Cargo': trabajador ? trabajador.cargo : '',
            'Estado': m.estado_asistencia,
            'Entrada': m.hora_entrada ? m.hora_entrada.substring(0, 5) : '--:--',
            'Salida': m.hora_salida ? m.hora_salida.substring(0, 5) : '--:--',
            'Hrs Ordinarias': m.horas_ordinarias ?? 0,
            'Hrs Extras': m.horas_extras ?? 0,
            'Observaciones': m.observaciones || '',
          };
        });

        const [, mMes, dDia] = fechaDia.split('-');
        const nombrePestana = `Día ${dDia}-${mMes}`;

        const wsDia = XLSX.utils.json_to_sheet(filasDelDia);
        XLSX.utils.book_append_sheet(workbook, wsDia, nombrePestana);
      });

      XLSX.writeFile(
        workbook,
        `Libro_DT_En_Curso_${nombreLimpio}_${mesStr}_${anioStr}.xlsx`
      );
    } catch (err) {
      console.error('Error al exportar libro en Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setCargando(false);
    }
  };

  const totalOperarios = operarios.length;
  const presentes = Object.values(asistenciasDia).filter(
    (a) => a.estado_asistencia === 'PRESENTE' || a.estado_asistencia === 'ATRASO'
  ).length;
  const justificados = Object.values(asistenciasDia).filter(
    (a) => a.estado_asistencia === 'LICENCIA' || a.estado_asistencia === 'PERMISO'
  ).length;
  const inasistencias = Object.values(asistenciasDia).filter(
    (a) => a.estado_asistencia === 'INASISTENCIA'
  ).length;

  const [anioActualStr, mesActualStr] = fecha ? fecha.split('-') : ['', ''];

  return (
    <div className="space-y-6">
      {/* CABECERA EN 2 NIVELES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#007734] flex items-center justify-center font-bold shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  Libro Digital de Asistencias
                </h1>
                
                {/* Badge de estado de faena */}
                {!faenaEsOperativa && faenaActual && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    faenaActual.estado === 'SUSPENDIDA'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {faenaActual.estado === 'SUSPENDIDA' ? <PauseCircle className="w-3 h-3 text-amber-700" /> : <CheckCircle className="w-3 h-3 text-slate-500" />}
                    <span>Faena {estadoFaenaEtiqueta}</span>
                  </span>
                )}

                {periodoCerrado && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 border border-amber-300 text-amber-900 shrink-0">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Período Cerrado DT</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cumplimiento DT • Cómputo de Días y Sello Digital Inmutable
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={faenaSeleccionadaId || ''}
              onChange={(e) => setFaenaSeleccionadaId(Number(e.target.value))}
              disabled={!montado || cargando}
              className="text-xs bg-slate-50 border border-slate-300 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007734] cursor-pointer max-w-64 truncate disabled:opacity-60"
            >
              {faenas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre_faena} ({f.codigo_centro_costo || 'Sin CC'}) - {f.estado === 'EN_EJECUCION' ? 'Activa' : f.estado}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fecha}
              max={fechaHoy || undefined}
              disabled={!montado}
              onChange={(e) => {
                const seleccionada = e.target.value;
                if (fechaHoy && seleccionada > fechaHoy) {
                  setMensaje({
                    tipo: 'error',
                    texto: 'No se pueden registrar ni consultar asistencias posteriores al día actual.',
                  });
                  return;
                }
                setFecha(seleccionada);
              }}
              className="text-xs bg-slate-50 border border-slate-300 font-bold rounded-xl px-3 py-2 outline-none cursor-pointer disabled:opacity-60"
            />
          </div>

          <div className="flex items-center gap-2">
            {!periodoCerrado ? (
              <button
                type="button"
                onClick={() => setMostrarModalCierre(true)}
                disabled={!montado || procesandoCierre || cargando || !faenaEsOperativa}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {procesandoCierre ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Cerrar Mes</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3 text-slate-400" /> Mes Liquidado
              </span>
            )}

            <button 
              type="button"
              onClick={handleExportarLibroDT}
              disabled={!montado || cargando}
              className="bg-[#007734] hover:bg-[#009B43] text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#00FF6F]" />
              <span>Exportar Libro DT</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER 1: FAENA NO OPERATIVA (SUSPENDIDA O FINALIZADA) */}
      {!faenaEsOperativa && faenaActual && (
        <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-xs ${
          faenaActual.estado === 'SUSPENDIDA'
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-slate-100 border-slate-300 text-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              faenaActual.estado === 'SUSPENDIDA' ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
            }`}>
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide">
                Faena en Estado: {estadoFaenaEtiqueta} (Registro Diario Inhabilitado)
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {faenaActual.estado === 'SUSPENDIDA'
                  ? 'Esta obra se encuentra temporalmente paralizada. No se permite registrar jornadas laborales activas.'
                  : 'Esta obra ha concluido sus faenas formalmente. La asistencia diaria se encuentra cerrada.'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center text-xs font-mono font-bold px-3 py-1.5 bg-white/80 rounded-lg border border-slate-200">
            <span>Operaciones Pausadas</span>
          </div>
        </div>
      )}

      {/* BANNER 2: PERÍODO MENSUAL CERRADO */}
      {periodoCerrado && faenaEsOperativa && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                Período Mensual Cerrado y Protegido (Modo Solo Lectura)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Las asistencias del mes {mesActualStr}/{anioActualStr} han sido selladas digitalmente para nómina y no admiten modificaciones manuales.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-amber-900 bg-white/80 border border-amber-200 px-3 py-1.5 rounded-lg font-mono">
            <span>Sello Inmutable Activo</span>
          </div>
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs">DOT</div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dotación Faena</p>
            <p className="text-xl font-black text-slate-900">{!montado ? '-' : totalOperarios}</p>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Presentes</p>
            <p className="text-xl font-black text-emerald-900">{!montado ? '-' : presentes}</p>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Permiso / Licencia</p>
            <p className="text-xl font-black text-amber-900">{!montado ? '-' : justificados}</p>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Inasistencias</p>
            <p className="text-xl font-black text-rose-900">{!montado ? '-' : inasistencias}</p>
          </div>
        </div>
      </div>

      {/* DETALLE PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nómina de Operarios */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-slate-800">
              Nómina de Operarios ({!montado ? '...' : operarios.length})
            </h2>
          </div>

          {!montado || cargando ? (
            <div className="p-12 text-center text-xs text-slate-400 flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#007734]" /> Sincronizando cuadrilla...
            </div>
          ) : operarios.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              No hay operarios activos asignados a esta faena.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {operarios.map((op) => {
                const marca = asistenciasDia[op.id];
                const seleccionado = operarioActivo?.id === op.id;

                return (
                  <div
                    key={op.id}
                    onClick={() => setOperarioActivo(op)}
                    className={`p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      seleccionado
                        ? 'bg-emerald-50/80 border border-emerald-300'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900">
                        {op.nombres} {op.apellidos}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {op.rut} • <span className="font-sans font-medium">{op.cargo}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {marca ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            marca.estado_asistencia === 'PRESENTE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : marca.estado_asistencia === 'ATRASO'
                              ? 'bg-amber-100 text-amber-800'
                              : marca.estado_asistencia === 'INASISTENCIA'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {marca.estado_asistencia} ({marca.hora_entrada ? marca.hora_entrada.substring(0, 5) : '--:--'})
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Sin Marca</span>
                      )}
                      <Clock className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario de Registro Diario */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Registrar Novedad Diaria</h2>
            <p className="text-xs text-emerald-700 font-bold truncate mt-0.5">
              {operarioActivo
                ? `${operarioActivo.nombres} ${operarioActivo.apellidos}`
                : 'Seleccione un operario de la lista'}
            </p>
          </div>

          {mensaje && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                mensaje.tipo === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium leading-tight">{mensaje.texto}</span>
            </div>
          )}

          <FormularioNovedadDiaria
            key={operarioActivo && fecha ? `${operarioActivo.id}-${fecha}-${faenaSeleccionadaId}` : 'sin-operario'}
            operarioActivo={operarioActivo}
            marcaExistente={operarioActivo ? asistenciasDia[operarioActivo.id] : undefined}
            guardando={guardando}
            periodoCerrado={periodoCerrado}
            faenaOperativa={faenaEsOperativa}
            estadoFaenaTexto={estadoFaenaEtiqueta}
            onGuardar={handleGuardarAsistencia}
          />
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE CIERRE MENSUAL DT */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCierre(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                ¿Cerrar período {mesActualStr}/{anioActualStr}?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta acción ejecutará el <strong className="font-bold text-slate-800">cómputo consolidado oficial</strong> para los <span className="font-semibold text-slate-800">{operarios.length} operarios</span> de la obra, generando un <span className="font-semibold text-[#007734]">sello digital inmutable</span> para fiscalizaciones de la Dirección del Trabajo (DT).
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-[11px] font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Una vez cerrado, las asistencias de este mes no admitirán modificaciones.</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalCierre(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarCierreMensual}
                disabled={procesandoCierre}
                className="w-1/2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {procesandoCierre ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Confirmar y Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}