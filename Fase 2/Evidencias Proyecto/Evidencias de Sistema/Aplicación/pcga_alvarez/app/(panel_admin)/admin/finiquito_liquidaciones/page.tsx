'use client';

import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { 
  Search, FileText, Save, Loader2, AlertCircle, CheckCircle2, 
  DollarSign, Calendar, Edit, X, History, TrendingUp, Receipt, 
  ShieldCheck, Download, Import, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  TrabajadorDB, LiquidacionDB, FiniquitoDB, ParametroLegalDB, TasaAfpDB 
} from '@/lib/supabase/types';
import { 
  obtenerTrabajadoresActivos, crearLiquidacion, obtenerLiquidacionesTrabajador, 
  actualizarLiquidacion, importarAsistenciaCerrada, descargarLiquidacionPDF 
} from '@/services/liquidaciones';
import { 
  crearFiniquito, obtenerFiniquitosTrabajador, actualizarFiniquito,
  verificarEstadoPrevisional, descargarFiniquitoPDF
} from '@/services/finiquitos';

const CAUSALES_TERMINO = [
  { id: 'ART_161', label: 'Art. 161 - Necesidades de la empresa (Aplica Indemnización y Aviso Previo)' },
  { id: 'ART_159_1', label: 'Art. 159 N° 1 - Mutuo acuerdo de las partes' },
  { id: 'ART_159_2', label: 'Art. 159 N° 2 - Renuncia voluntaria del trabajador' },
  { id: 'ART_159_4', label: 'Art. 159 N° 4 - Vencimiento del plazo del contrato' },
  { id: 'ART_159_5', label: 'Art. 159 N° 5 - Conclusión del trabajo o servicio' },
  { id: 'ART_160', label: 'Art. 160 - Despido por falta grave (Sin indemnización)' },
];

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const suscribirVacio = () => () => {};
function useClienteMontado() { return useSyncExternalStore(suscribirVacio, () => true, () => false); }

export default function RemuneracionesPage() {
  const montado = useClienteMontado();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'liquidacion' | 'finiquito' | 'busqueda'>('liquidacion');
  const [trabajadores, setTrabajadores] = useState<TrabajadorDB[]>([]);
  const [cargando, setCargando] = useState(true);

  const [parametrosMes, setParametrosMes] = useState<ParametroLegalDB | null>(null);
  const [tasasAfpMes, setTasasAfpMes] = useState<Record<string, number>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<TrabajadorDB | null>(null);

  // Referencia para cerrar el menú desplegable al hacer clic fuera del buscador
  const buscadorRef = useRef<HTMLDivElement>(null);

  const [liquidacionesHistorial, setLiquidacionesHistorial] = useState<LiquidacionDB[]>([]);
  const [finiquitosHistorial, setFiniquitosHistorial] = useState<FiniquitoDB[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [liquidacionEditar, setLiquidacionEditar] = useState<LiquidacionDB | null>(null);
  const [finiquitoEditar, setFiniquitoEditar] = useState<FiniquitoDB | null>(null);

  // Parámetros y campos de liquidación
  const [mes, setMes] = useState<number>(() => new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(() => new Date().getFullYear());
  const [diasTrabajados, setDiasTrabajados] = useState<number>(30);
  const [diasAusentes, setDiasAusentes] = useState<number>(0);
  const [diasLicencia, setDiasLicencia] = useState<number>(0);

  const [sueldoBasePactado, setSueldoBasePactado] = useState<number>(0);
  const [horasExtraCant, setHorasExtraCant] = useState<number>(0);
  const [montoHorasExtra, setMontoHorasExtra] = useState<number>(0);
  const [bonosImponibles, setBonosImponibles] = useState<number>(0);
  const [colacion, setColacion] = useState<number>(0);
  const [movilizacion, setMovilizacion] = useState<number>(0);
  const [desgasteHerramientas, setDesgasteHerramientas] = useState<number>(0);
  const [viaticos, setViaticos] = useState<number>(0);
  const [asignacionFamiliar, setAsignacionFamiliar] = useState<number>(0);

  const [porcentajeAfp, setPorcentajeAfp] = useState<number>(0);
  const [porcentajeSalud, setPorcentajeSalud] = useState<number>(7);
  const [descuentoCesantia, setDescuentoCesantia] = useState<number>(0);
  const [anticipos, setAnticipos] = useState<number>(0);

  // Campos de finiquito
  const [fechaTermino, setFechaTermino] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [causalTermino, setCausalTermino] = useState<string>('ART_161');
  const [diasVacacionesTomados, setDiasVacacionesTomados] = useState<number>(0);
  const [avisoPrevioOtorgado, setAvisoPrevioOtorgado] = useState<boolean>(false);
  const [colacionFiniquito, setColacionFiniquito] = useState<number>(0);
  const [movilizacionFiniquito, setMovilizacionFiniquito] = useState<number>(0);
  const [remuneracionPendiente, setRemuneracionPendiente] = useState<number>(0);
  const [descuentosPendientesFiniquito, setDescuentosPendientesFiniquito] = useState<number>(0);

  // Estados de control de modales de confirmación
  const [mostrarModalConfirmarLiquidacion, setMostrarModalConfirmarLiquidacion] = useState(false);
  const [mostrarModalConfirmarFiniquito, setMostrarModalConfirmarFiniquito] = useState(false);
  const [liquidacionExistenteId, setLiquidacionExistenteId] = useState<number | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const [alertaLeyBustos, setAlertaLeyBustos] = useState<boolean>(false);

  // Listener para cerrar opciones al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)) {
        setMostrarOpciones(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Verificación protegida contra null para liquidaciones existentes
  useEffect(() => {
    if (!selectedWorker || !mes || !anio) {
      setLiquidacionExistenteId(null);
      return;
    }

    const trabajadorId = selectedWorker.id;
    let cancelado = false;

    async function verificarLiquidacionPrevia() {
      try {
        const { data, error: errConsulta } = await supabase
          .from('liquidaciones')
          .select('id')
          .eq('trabajador_id', trabajadorId)
          .eq('mes', mes)
          .eq('anio', anio)
          .maybeSingle();

        if (!cancelado && !errConsulta && data) {
          setLiquidacionExistenteId(data.id);
        } else if (!cancelado) {
          setLiquidacionExistenteId(null);
        }
      } catch {
        if (!cancelado) setLiquidacionExistenteId(null);
      }
    }

    void verificarLiquidacionPrevia();
    return () => { cancelado = true; };
  }, [selectedWorker, mes, anio, supabase]);

  const cargarHistorial = async (trabajadorId: number) => {
    try {
      setCargandoHistorial(true);
      const [liqData, finData] = await Promise.all([
        obtenerLiquidacionesTrabajador(trabajadorId),
        obtenerFiniquitosTrabajador(trabajadorId)
      ]);

      const hace12Meses = new Date();
      hace12Meses.setMonth(hace12Meses.getMonth() - 12);

      const liqFiltradas = liqData.filter((liq) => {
        const fechaLiq = new Date(liq.anio, liq.mes - 1, 1);
        return fechaLiq >= hace12Meses;
      });

      setLiquidacionesHistorial(liqFiltradas);
      setFiniquitosHistorial(finData);
    } catch {
      setError('Error al obtener el historial del trabajador.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleSelectTrabajador = (t: TrabajadorDB) => {
    setSelectedWorker(t);
    setSearchTerm(`${t.nombres} ${t.apellidos}`);
    setMostrarOpciones(false);

    setSueldoBasePactado(t.sueldo_base || 0);
    setDiasTrabajados(30);
    setDiasAusentes(0);
    setDiasLicencia(0);
    setHorasExtraCant(0);
    setMontoHorasExtra(0);
    setBonosImponibles(0);
    setColacion(0);
    setMovilizacion(0);
    setDesgasteHerramientas(0);
    setViaticos(0);
    setAsignacionFamiliar(0);
    setAnticipos(0);

    if (t.afp && tasasAfpMes[t.afp.toLowerCase()]) {
      setPorcentajeAfp(tasasAfpMes[t.afp.toLowerCase()]);
    } else {
      setPorcentajeAfp(0);
    }

    setColacionFiniquito(0);
    setMovilizacionFiniquito(0);
    setRemuneracionPendiente(0);
    setDescuentosPendientesFiniquito(0);
    setDiasVacacionesTomados(0);
    setAvisoPrevioOtorgado(false);

    setError(null);
    setExito(false);

    void cargarHistorial(t.id);
  };

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        setCargando(true);
        const data = await obtenerTrabajadoresActivos();
        if (activo) {
          setTrabajadores(data);
          if (data.length > 0) {
            const primero = data[0];
            setSelectedWorker(primero);
            setSearchTerm(`${primero.nombres} ${primero.apellidos}`);
            setSueldoBasePactado(primero.sueldo_base || 0);
            void cargarHistorial(primero.id);
          }
        }
      } catch (err: unknown) {
        if (activo) setError(err instanceof Error ? err.message : 'Error al cargar nómina.');
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    async function sincronizarParametros() {
      try {
        const { data: paramData } = await supabase.from('parametros_legales').select('*').eq('mes', mes).eq('anio', anio).maybeSingle();
        const { data: afpData } = await supabase.from('tasas_afp').select('*').eq('mes', mes).eq('anio', anio);

        if (activo) {
          setParametrosMes(paramData || null);
          const mapaAfp: Record<string, number> = {};
          if (afpData && afpData.length > 0) {
            afpData.forEach((item: TasaAfpDB) => {
              mapaAfp[item.nombre_afp.toLowerCase()] = Number(item.tasa_total_dependiente);
            });
            setTasasAfpMes(mapaAfp);

            if (selectedWorker?.afp) {
              const tasaTrabajador = mapaAfp[selectedWorker.afp.toLowerCase()];
              if (tasaTrabajador) setPorcentajeAfp(tasaTrabajador);
            }
          }
        }
      } catch (err) {
        console.error('Error sincronizando parámetros legales:', err);
      }
    }
    void sincronizarParametros();
    return () => { activo = false; };
  }, [mes, anio, selectedWorker, supabase]);

  useEffect(() => {
    let activo = true;
    async function validarLeyBustos() {
      if (activeTab === 'finiquito' && selectedWorker && fechaTermino) {
        const alDia = await verificarEstadoPrevisional(selectedWorker.id, fechaTermino);
        if (activo) setAlertaLeyBustos(!alDia);
      }
    }
    void validarLeyBustos();
    return () => { activo = false; };
  }, [activeTab, selectedWorker, fechaTermino]);

  const handleImportarAsistencia = async () => {
    if (!selectedWorker) return;
    try {
      setImportando(true);
      setError(null);
      const asistenciaMes = await importarAsistenciaCerrada(selectedWorker.id, mes, anio);

      if (!asistenciaMes) {
        setError(`No se encontraron asistencias en el período cerrado para ${NOMBRES_MESES[mes - 1]} ${anio}. Verifique que el mes esté cerrado en el Libro de Asistencias.`);
        return;
      }

      setDiasTrabajados(asistenciaMes.dias_trabajados);
      setDiasAusentes(asistenciaMes.dias_inasistencias);
      setDiasLicencia(asistenciaMes.dias_licencias);
      setHorasExtraCant(asistenciaMes.total_horas_extras);
      
      const valorHoraOrdinaria = ((selectedWorker.sueldo_base || 0) / 30) * (28 / 44);
      const valorHoraExtra = Math.round(valorHoraOrdinaria * 1.5);
      setMontoHorasExtra(Math.round(valorHoraExtra * Number(asistenciaMes.total_horas_extras)));

      setExito(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al importar datos de asistencia.');
    } finally {
      setImportando(false);
      setTimeout(() => setExito(false), 4000);
    }
  };

  const trabajadoresFiltrados = useMemo(() => {
    const texto = searchTerm.trim().toLowerCase();
    if (!texto) return trabajadores;
    return trabajadores.filter((t) => {
      const nombreCompleto = `${t.nombres} ${t.apellidos}`.toLowerCase();
      return nombreCompleto.includes(texto) || t.rut.toLowerCase().includes(texto);
    });
  }, [trabajadores, searchTerm]);

  // Motor Cálculo Liquidaciones
  const sueldoBaseMes = Math.max(0, Math.round((sueldoBasePactado / 30) * diasTrabajados));
  const totalImponibleBruto = sueldoBaseMes + montoHorasExtra + bonosImponibles;
  const topeGratificacionCalculado = useMemo(() => {
    if (!parametrosMes?.sueldo_minimo) return 0;
    return Math.round((4.75 * Number(parametrosMes.sueldo_minimo)) / 12);
  }, [parametrosMes]);
  const gratificacionLegal = Math.min(Math.round(totalImponibleBruto * 0.25), topeGratificacionCalculado > 0 ? topeGratificacionCalculado : 197917);
  const totalImponible = totalImponibleBruto + gratificacionLegal;
  const totalHaberesNoImponibles = colacion + movilizacion + desgasteHerramientas + viaticos + asignacionFamiliar;
  const totalHaberes = totalImponible + totalHaberesNoImponibles;
  const descuentoAfp = Math.round((totalImponible * porcentajeAfp) / 100);
  const descuentoSalud = Math.round((totalImponible * porcentajeSalud) / 100);
  const totalDescuentosPrevisionales = descuentoAfp + descuentoSalud + descuentoCesantia;
  const totalDescuentos = totalDescuentosPrevisionales + anticipos;
  const sueldoLiquido = Math.max(0, totalHaberes - totalDescuentos);

  const faltanAntecedentesPrevisionales = useMemo(() => {
    if (!selectedWorker) return false;
    return !selectedWorker.afp || !selectedWorker.sistema_salud || porcentajeAfp === 0;
  }, [selectedWorker, porcentajeAfp]);

  const esLiquidacionEnCero = useMemo(() => {
    return diasTrabajados <= 0 && totalHaberes <= 0;
  }, [diasTrabajados, totalHaberes]);

  // Motor Cálculo Finiquitos
  const metricasFiniquito = useMemo(() => {
    if (!selectedWorker || !selectedWorker.fecha_ingreso || !fechaTermino) {
      return { aniosServicio: 0, diasTotalesTrabajados: 0, diasVacacionesPendientes: 0, montoFeriadoProporcional: 0, montoIndemnizacionAnios: 0, montoAvisoPrevio: 0, totalFiniquito: 0 };
    }

    const inicio = new Date(selectedWorker.fecha_ingreso);
    const fin = new Date(fechaTermino);
    const diffTime = Math.max(0, fin.getTime() - inicio.getTime());
    const diasTotalesTrabajados = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const aniosCompletos = Math.floor(diasTotalesTrabajados / 365);
    const diasRestantes = diasTotalesTrabajados % 365;
    let aniosServicio = aniosCompletos;
    if (diasRestantes >= 180) aniosServicio += 1;

    const aniosIndemnizables = Math.min(aniosServicio, 11);
    const sueldoBase = selectedWorker.sueldo_base || 0;
    const topeGrat = topeGratificacionCalculado > 0 ? topeGratificacionCalculado : 197917;
    const gratificacionEstimada = Math.min(Math.round(sueldoBase * 0.25), topeGrat);
    
    const remuneracionBase = sueldoBase + gratificacionEstimada + colacionFiniquito + movilizacionFiniquito;
    const valorDiaTrabajo = remuneracionBase / 30;

    const diasVacacionesDevengados = (diasTotalesTrabajados / 365) * 15;
    const diasVacacionesPendientes = Math.max(0, diasVacacionesDevengados - diasVacacionesTomados);
    const montoFeriadoProporcional = Math.round(diasVacacionesPendientes * valorDiaTrabajo * 1.4);

    let montoIndemnizacionAnios = 0;
    let montoAvisoPrevio = 0;

    if (causalTermino === 'ART_161') {
      montoIndemnizacionAnios = Math.round(aniosIndemnizables * remuneracionBase);
      if (!avisoPrevioOtorgado) {
        montoAvisoPrevio = Math.round(remuneracionBase);
      }
    }

    const totalFiniquito = Math.max(
      0,
      montoIndemnizacionAnios + montoAvisoPrevio + montoFeriadoProporcional + remuneracionPendiente - descuentosPendientesFiniquito
    );

    return {
      aniosServicio,
      diasTotalesTrabajados,
      diasVacacionesPendientes: Number(diasVacacionesPendientes.toFixed(1)),
      montoFeriadoProporcional,
      montoIndemnizacionAnios,
      montoAvisoPrevio,
      totalFiniquito
    };
  }, [selectedWorker, fechaTermino, causalTermino, diasVacacionesTomados, avisoPrevioOtorgado, colacionFiniquito, movilizacionFiniquito, remuneracionPendiente, descuentosPendientesFiniquito, topeGratificacionCalculado]);

  const esFiniquitoEnCero = useMemo(() => {
    return metricasFiniquito.totalFiniquito <= 0;
  }, [metricasFiniquito.totalFiniquito]);

  // Pre-submit para liquidación: valida condiciones laborales y abre modal
  const handlePreSubmitLiquidacion = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(false);

    if (!selectedWorker) {
      setError('Debe seleccionar un operario para emitir la liquidación.');
      return;
    }
    if (faltanAntecedentesPrevisionales) {
      setError('Faltan antecedentes previsionales obligatorios (AFP o salud) en la ficha del operario.');
      return;
    }
    if (esLiquidacionEnCero) {
      setError('Operación bloqueada: No es posible emitir una liquidación sin días trabajados ni haberes computables ($0). Si el trabajador estuvo ausente todo el mes, debe registrarse la novedad en el Libro de Asistencias.');
      return;
    }
    if (sueldoLiquido <= 0) {
      setError('Operación bloqueada: El alcance líquido final no puede ser $0. Revise los días laborados o la proporción de descuentos.');
      return;
    }

    setMostrarModalConfirmarLiquidacion(true);
  };

  // Guardado definitivo de liquidación
  const ejecutarGuardarLiquidacion = async () => {
    if (!selectedWorker) return;
    setMostrarModalConfirmarLiquidacion(false);
    setError(null);
    setExito(false);

    try {
      setGuardando(true);
      const payload: Omit<LiquidacionDB, 'id' | 'fecha_emision'> = {
        trabajador_id: selectedWorker.id, 
        faena_id: selectedWorker.faena_id, 
        mes, 
        anio,
        dias_trabajados: Number(diasTrabajados), 
        dias_ausentes: Number(diasAusentes), 
        dias_licencia: Number(diasLicencia),
        sueldo_base_pactado: Number(sueldoBasePactado), 
        sueldo_base_mes: Number(sueldoBaseMes),
        horas_extras_cantidad: Number(horasExtraCant), 
        monto_horas_extras: Number(montoHorasExtra),
        gratificacion_legal: Number(gratificacionLegal), 
        bonos_imponibles: Number(bonosImponibles), 
        total_imponible: Number(totalImponible),
        colacion: Number(colacion), 
        movilizacion: Number(movilizacion), 
        desgaste_herramientas: Number(desgasteHerramientas),
        viaticos: Number(viaticos), 
        asignacion_familiar: Number(asignacionFamiliar), 
        total_haberes_no_imponibles: Number(totalHaberesNoImponibles),
        total_haberes: Number(totalHaberes), 
        porcentaje_afp: Number(porcentajeAfp), 
        descuento_afp: Number(descuentoAfp),
        porcentaje_salud: Number(porcentajeSalud), 
        descuento_salud: Number(descuentoSalud), 
        descuento_cesantia: Number(descuentoCesantia),
        total_descuentos_previsionales: Number(totalDescuentosPrevisionales), 
        anticipos: Number(anticipos), 
        total_descuentos: Number(totalDescuentos),
        sueldo_liquido: Number(sueldoLiquido), 
        estado_pago: 'A_PAGO',
      };

      if (liquidacionExistenteId) {
        await actualizarLiquidacion(liquidacionExistenteId, payload);
      } else {
        await crearLiquidacion(payload);
      }

      setExito(true);
      await cargarHistorial(selectedWorker.id);
      setActiveTab('busqueda');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('uq_trabajador_mes_anio_liq') || err.message.includes('duplicate key')) {
          setError(`Ya existe una liquidación registrada para ${selectedWorker.nombres} ${selectedWorker.apellidos} en ${NOMBRES_MESES[mes - 1]} ${anio}. Utilice el botón de confirmación para recalcularla.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Error al procesar la liquidación en la base de datos.');
      }
    } finally { 
      setGuardando(false); 
    }
  };

  // Pre-submit para finiquito: valida montos y abre modal
  const handlePreSubmitFiniquito = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(false);

    if (!selectedWorker) {
      setError('Debe seleccionar un operario para emitir la propuesta de finiquito.');
      return;
    }
    if (!fechaTermino) {
      setError('La fecha de término de contrato es obligatoria.');
      return;
    }
    if (esFiniquitoEnCero) {
      setError('Operación bloqueada: El finiquito no puede ser emitido en $0. Debe existir al menos un concepto indemnizable devengado (feriado proporcional o remuneraciones pendientes).');
      return;
    }

    setMostrarModalConfirmarFiniquito(true);
  };

  // Guardado definitivo de finiquito
  const ejecutarGuardarFiniquito = async () => {
    if (!selectedWorker) return;
    setMostrarModalConfirmarFiniquito(false);
    setError(null);
    setExito(false);

    try {
      setGuardando(true);
      const payload: Omit<FiniquitoDB, 'id' | 'fecha_calculo'> = {
        trabajador_id: selectedWorker.id,
        fecha_termino: fechaTermino,
        causal_termino: causalTermino,
        anios_servicio: metricasFiniquito.aniosServicio,
        monto_indemnizacion_anios: metricasFiniquito.montoIndemnizacionAnios,
        monto_aviso_previo: metricasFiniquito.montoAvisoPrevio,
        monto_feriado_proporcional: metricasFiniquito.montoFeriadoProporcional,
        total_finiquito: metricasFiniquito.totalFiniquito,
        firmado: false
      };
      await crearFiniquito(payload);
      setExito(true);
      await cargarHistorial(selectedWorker.id);
      setActiveTab('busqueda');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar y guardar el finiquito.');
    } finally { 
      setGuardando(false); 
    }
  };

  const handleUpdateLiquidacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidacionEditar?.id) return;

    if (liquidacionEditar.dias_trabajados <= 0) {
      setError('La liquidación no puede quedar con 0 días trabajados.');
      return;
    }

    try {
      setGuardando(true);
      
      const sBaseMes = Math.max(0, Math.round((liquidacionEditar.sueldo_base_pactado / 30) * liquidacionEditar.dias_trabajados));
      const totImpBruto = sBaseMes + (liquidacionEditar.monto_horas_extras || 0) + (liquidacionEditar.bonos_imponibles || 0);
      const grat = Math.min(Math.round(totImpBruto * 0.25), topeGratificacionCalculado > 0 ? topeGratificacionCalculado : 197917);
      const totImp = totImpBruto + grat;
      const descAfp = Math.round((totImp * liquidacionEditar.porcentaje_afp) / 100);
      const descSalud = Math.round((totImp * (liquidacionEditar.porcentaje_salud || 7)) / 100);
      const totPrevisionales = descAfp + descSalud + (liquidacionEditar.descuento_cesantia || 0);
      const totDesc = totPrevisionales + (liquidacionEditar.anticipos || 0);
      const sNoImponibles = (liquidacionEditar.colacion || 0) + (liquidacionEditar.movilizacion || 0) + (liquidacionEditar.desgaste_herramientas || 0) + (liquidacionEditar.viaticos || 0) + (liquidacionEditar.asignacion_familiar || 0);
      const totHab = totImp + sNoImponibles;
      const sLiquido = Math.max(0, totHab - totDesc);

      if (sLiquido <= 0) {
        setError('El sueldo líquido recalculado no puede ser $0.');
        setGuardando(false);
        return;
      }

      const payloadActualizado: Partial<LiquidacionDB> = {
        ...liquidacionEditar,
        sueldo_base_mes: sBaseMes,
        gratificacion_legal: grat,
        total_imponible: totImp,
        descuento_afp: descAfp,
        descuento_salud: descSalud,
        total_descuentos_previsionales: totPrevisionales,
        total_descuentos: totDesc,
        total_haberes: totHab,
        sueldo_liquido: sLiquido
      };

      await actualizarLiquidacion(liquidacionEditar.id, payloadActualizado);
      setLiquidacionEditar(null);
      if (selectedWorker) await cargarHistorial(selectedWorker.id);
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : 'Error al actualizar liquidación.'); 
    } finally { 
      setGuardando(false); 
    }
  };

  const handleUpdateFiniquito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finiquitoEditar?.id) return;

    if ((finiquitoEditar.total_finiquito || 0) <= 0) {
      setError('El total del finiquito no puede ser $0.');
      return;
    }

    try {
      setGuardando(true);
      await actualizarFiniquito(finiquitoEditar.id, finiquitoEditar);
      setFiniquitoEditar(null);
      if (selectedWorker) await cargarHistorial(selectedWorker.id);
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : 'Error al actualizar finiquito.'); 
    } finally { 
      setGuardando(false); 
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#007734]/10 text-[#007734] flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-none">Gestión de Remuneraciones</h1>
            <p className="text-xs text-slate-500 mt-1">Liquidaciones mensuales, cálculo de finiquitos y registro legal</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('liquidacion'); setError(null); setExito(false); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === 'liquidacion' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'}`}
          >Liquidación</button>
          <button
            type="button"
            onClick={() => { setActiveTab('finiquito'); setError(null); setExito(false); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === 'finiquito' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'}`}
          >Finiquitos</button>
          <button
            type="button"
            onClick={() => { setActiveTab('busqueda'); setError(null); setExito(false); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === 'busqueda' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'}`}
          >Historial</button>
        </div>
      </div>

      {/* CONTENEDOR DEL BUSCADOR CON DESPLIEGUE INMEDIATO AL CLIC */}
      <div ref={buscadorRef} className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs relative">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por operario o RUT..."
              value={searchTerm}
              onClick={() => setMostrarOpciones(true)}
              onFocus={() => setMostrarOpciones(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setMostrarOpciones(true);
                if (!e.target.value) setSelectedWorker(null);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007734]"
            />
          </div>

          {selectedWorker && (
            <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="font-bold text-slate-900">{selectedWorker.nombres} {selectedWorker.apellidos}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">RUT: {selectedWorker.rut}</span>
              <span className="text-slate-400">•</span>
              <span className="text-[#007734] font-bold">${selectedWorker.sueldo_base?.toLocaleString('es-CL')} Base</span>
              <span className="text-slate-400">•</span>
              <span className={`font-sans font-semibold ${faltanAntecedentesPrevisionales ? 'text-rose-600' : 'text-slate-500'}`}>
                {selectedWorker.afp ? `AFP ${selectedWorker.afp}` : 'Sin AFP'}
              </span>
            </div>
          )}
        </div>

        {/* El menú se despliega inmediatamente al hacer foco o clic */}
        {mostrarOpciones && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
            {trabajadoresFiltrados.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">No se encontraron trabajadores</div>
            ) : (
              trabajadoresFiltrados.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTrabajador(t)}
                  className="p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{t.nombres} {t.apellidos}</p>
                    <p className="text-[11px] font-mono text-slate-500">RUT: {t.rut} • {t.cargo} (AFP {t.afp || 'Sin Registro'})</p>
                  </div>
                  <span className="font-bold text-[#007734] font-mono">${t.sueldo_base?.toLocaleString('es-CL')}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-800 p-3 rounded-r-xl flex items-center space-x-2 text-xs font-semibold shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="bg-emerald-50 border-l-3 border-[#007734] text-emerald-900 p-3 rounded-r-xl flex items-center space-x-2 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#007734] shrink-0" />
          <span>Operación procesada y guardada con éxito.</span>
        </div>
      )}

      {cargando ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#007734]" />
        </div>
      ) : !selectedWorker ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2 shadow-xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Selecciona un trabajador de la nómina para cargar su información previsional y remuneraciones.</p>
        </div>
      ) : activeTab === 'busqueda' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#007734]" />
                <span>Liquidaciones de Sueldo (Últimos 12 Meses)</span>
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{liquidacionesHistorial.length} Emitidas</span>
            </div>

            {cargandoHistorial ? (
              <div className="flex justify-center py-6 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : liquidacionesHistorial.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No registra liquidaciones en el último año.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="pb-2 w-[18%]">Período</th>
                      <th className="pb-2 w-[12%]">Días Trab.</th>
                      <th className="pb-2 w-[18%]">Total Imponible</th>
                      <th className="pb-2 w-[18%]">Descuentos</th>
                      <th className="pb-2 w-[16%]">Líquido</th>
                      <th className="pb-2 text-right w-[18%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liquidacionesHistorial.map((liq) => (
                      <tr key={liq.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold text-slate-800">{NOMBRES_MESES[liq.mes - 1]} {liq.anio}</td>
                        <td className="py-2.5">{liq.dias_trabajados}</td>
                        <td className="py-2.5 font-mono">${liq.total_imponible?.toLocaleString('es-CL')}</td>
                        <td className="py-2.5 font-mono text-rose-600">-${liq.total_descuentos?.toLocaleString('es-CL')}</td>
                        <td className="py-2.5 font-bold text-[#007734] font-mono">${liq.sueldo_liquido?.toLocaleString('es-CL')}</td>
                        <td className="py-2.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLiquidacionEditar(liq)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                            title="Modificar liquidación"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => descargarLiquidacionPDF(liq, selectedWorker)}
                            className="bg-[#007734] hover:bg-[#009B43] text-white px-2 py-1 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Descargar Comprobante DT en PDF"
                          >
                            <Download className="w-3 h-3 text-[#00FF6F]" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#007734]" />
                <span>Registro de Finiquitos</span>
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{finiquitosHistorial.length} Documentos</span>
            </div>

            {finiquitosHistorial.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No registra finiquitos emitidos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="pb-2 w-[20%]">Fecha Término</th>
                      <th className="pb-2 w-[25%]">Causal</th>
                      <th className="pb-2 w-[15%]">Años Serv.</th>
                      <th className="pb-2 w-[20%]">Monto Finiquito</th>
                      <th className="pb-2 text-right w-[20%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {finiquitosHistorial.map((fin) => (
                      <tr key={fin.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-mono text-slate-800 font-bold">{fin.fecha_termino}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-600 truncate">{fin.causal_termino}</td>
                        <td className="py-2.5">{fin.anios_servicio}</td>
                        <td className="py-2.5 font-bold text-slate-900 font-mono">${fin.total_finiquito?.toLocaleString('es-CL')}</td>
                        <td className="py-2.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFiniquitoEditar(fin)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                            title="Modificar finiquito"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => descargarFiniquitoPDF(fin, selectedWorker)}
                            className="bg-[#007734] hover:bg-[#009B43] text-white px-2 py-1 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Descargar Propuesta Finiquito PDF"
                          >
                            <Download className="w-3 h-3 text-[#00FF6F]" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'finiquito' ? (
        <form onSubmit={handlePreSubmitFiniquito} className="space-y-4">
          {alertaLeyBustos && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-black text-amber-900 uppercase">Advertencia de Cumplimiento (Ley Bustos)</h3>
                <p className="text-[11px] text-amber-800 mt-1 font-bold">
                  No se registran liquidaciones pagadas en el mes inmediatamente anterior al cese laboral de {selectedWorker?.nombres}.
                </p>
                <p className="text-[10px] text-amber-700 mt-1">
                  Asegúrate de que las cotizaciones previsionales, de salud y AFC estén declaradas y pagadas para resguardar la validez jurídica del despido según el Art. 177 del Código del Trabajo.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#007734]" />
                <span>Condiciones de Término Laboral</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Término *</label>
                  <input
                    type="date"
                    required
                    value={fechaTermino}
                    onChange={(e) => setFechaTermino(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Vacaciones Tomadas</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={diasVacacionesTomados}
                    onChange={(e) => setDiasVacacionesTomados(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Causal de Desvinculación *</label>
                <select
                  value={causalTermino}
                  onChange={(e) => setCausalTermino(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                >
                  {CAUSALES_TERMINO.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {causalTermino === 'ART_161' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="avisoPrevio"
                    checked={avisoPrevioOtorgado}
                    onChange={(e) => setAvisoPrevioOtorgado(e.target.checked)}
                    className="w-4 h-4 rounded text-[#007734] focus:ring-[#007734]"
                  />
                  <label htmlFor="avisoPrevio" className="text-xs font-bold text-amber-900 cursor-pointer">
                    ¿Se notificó carta de aviso previo con 30 días de anticipación?
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Remuneración Pendiente ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={remuneracionPendiente}
                    onChange={(e) => setRemuneracionPendiente(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Descuentos Pendientes ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={descuentosPendientesFiniquito}
                    onChange={(e) => setDescuentosPendientesFiniquito(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-rose-600 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Resumen de Liquidación de Finiquito</h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                  <span className="text-slate-600">Años de Servicio:</span>
                  <span className="font-bold text-slate-900">{metricasFiniquito.aniosServicio} años ({metricasFiniquito.diasTotalesTrabajados} días)</span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                  <span className="text-slate-600">Feriado Proporcional:</span>
                  <span className="font-bold text-slate-900 font-mono">${metricasFiniquito.montoFeriadoProporcional.toLocaleString('es-CL')}</span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                  <span className="text-slate-600">Indemnización Años de Servicio:</span>
                  <span className="font-bold text-slate-900 font-mono">${metricasFiniquito.montoIndemnizacionAnios.toLocaleString('es-CL')}</span>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                  <span className="text-slate-600">Indemnización Sustitutiva Aviso:</span>
                  <span className="font-bold text-slate-900 font-mono">${metricasFiniquito.montoAvisoPrevio.toLocaleString('es-CL')}</span>
                </div>

                <div className="pt-2">
                  <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Finiquito</p>
                      <p className="text-xl font-extrabold text-[#00FF6F] leading-tight">${metricasFiniquito.totalFiniquito.toLocaleString('es-CL')}</p>
                    </div>
                    <span className="text-[11px] bg-[#007734] px-2.5 py-1 rounded text-white font-bold">A Pagar</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardando || esFiniquitoEnCero}
                  className={`w-full py-3 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs ${
                    esFiniquitoEnCero
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#007734] hover:bg-[#009B43] text-white cursor-pointer'
                  }`}
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{esFiniquitoEnCero ? 'Finiquito en $0 (Bloqueado)' : 'Guardar Propuesta de Finiquito'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePreSubmitLiquidacion} className="space-y-4">
          {faltanAntecedentesPrevisionales && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs mb-4">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-black text-rose-900 uppercase">Cálculo Bloqueado</h3>
                <p className="text-[11px] text-rose-800 mt-1 font-bold">No es posible calcular la liquidación: faltan antecedentes previsionales obligatorios en la ficha del operario</p>
                <p className="text-[10px] text-rose-600 mt-1">El trabajador no cuenta con AFP válida o sistema de salud asignado en su ficha contractual.</p>
              </div>
            </div>
          )}

          {esLiquidacionEnCero && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-black text-amber-900 uppercase">Liquidación con 0 Días Trabajados</h3>
                <p className="text-[11px] text-amber-800 mt-0.5 font-bold">
                  No se puede generar una liquidación formal con alcance de $0.
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Si el operario no registra asistencia o estuvo ausente todo el mes, debe mantenerse en el Libro de Asistencias o justificar sus licencias médicas.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mes</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 cursor-pointer outline-none"
                  >
                    {NOMBRES_MESES.map((nombre, idx) => (
                      <option key={idx + 1} value={idx + 1}>{nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Año</label>
                  <input
                    type="number"
                    min="2024"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {liquidacionExistenteId && (
                  <span className="bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Liquidación Ya Registrada</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleImportarAsistencia}
                  disabled={importando}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {importando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Import className="w-3.5 h-3.5" />}
                  <span>Importar Asistencia Cerrada</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Días Trab. *</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={diasTrabajados}
                  onChange={(e) => setDiasTrabajados(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Días Ausentes</label>
                <input
                  type="number"
                  min="0"
                  value={diasAusentes}
                  onChange={(e) => setDiasAusentes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Días Licencia</label>
                <input
                  type="number"
                  min="0"
                  value={diasLicencia}
                  onChange={(e) => setDiasLicencia(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#007734]" />
                  <span>Haberes e Ingresos</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Imponibles y No Imponibles</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Sueldo Base Pactado ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={sueldoBasePactado}
                    onChange={(e) => setSueldoBasePactado(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Sueldo Base Mes ($)</label>
                  <input
                    type="number"
                    readOnly
                    value={sueldoBaseMes}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Horas Extra (Cant.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={horasExtraCant}
                    onChange={(e) => setHorasExtraCant(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Monto Horas Extra ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={montoHorasExtra}
                    onChange={(e) => setMontoHorasExtra(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Gratificación Legal ($) <span className="text-[9px] text-[#007734] font-normal lowercase">(dinámica)</span></label>
                  <input
                    type="number"
                    readOnly
                    value={gratificacionLegal}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Bonos Imponibles ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonosImponibles}
                    onChange={(e) => setBonosImponibles(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 px-3.5 py-2.5 rounded-lg flex justify-between font-bold text-emerald-900 text-xs">
                <span>Total Imponible:</span>
                <span className="font-mono text-sm">${totalImponible.toLocaleString('es-CL')}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asignaciones No Imponibles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Colación ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={colacion}
                      onChange={(e) => setColacion(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Movilización ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={movilizacion}
                      onChange={(e) => setMovilizacion(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Desgaste Herram.</label>
                    <input
                      type="number"
                      min="0"
                      value={desgasteHerramientas}
                      onChange={(e) => setDesgasteHerramientas(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Viáticos</label>
                    <input
                      type="number"
                      min="0"
                      value={viaticos}
                      onChange={(e) => setViaticos(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Asig. Familiar</label>
                    <input
                      type="number"
                      min="0"
                      value={asignacionFamiliar}
                      onChange={(e) => setAsignacionFamiliar(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg flex justify-between font-bold text-slate-800 text-xs">
                <span>Total Haberes:</span>
                <span className="font-mono text-sm">${totalHaberes.toLocaleString('es-CL')}</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Descuentos Previsionales</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Leyes Sociales</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">% AFP</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={porcentajeAfp}
                    onChange={(e) => setPorcentajeAfp(Number(e.target.value))}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] ${porcentajeAfp === 0 ? 'border-rose-400' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Descuento AFP</label>
                  <input
                    type="number"
                    readOnly
                    value={descuentoAfp}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-rose-700 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">% Salud</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={porcentajeSalud}
                    onChange={(e) => setPorcentajeSalud(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Descuento Salud</label>
                  <input
                    type="number"
                    readOnly
                    value={descuentoSalud}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-rose-700 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Cesantía</label>
                  <input
                    type="number"
                    min="0"
                    value={descuentoCesantia}
                    onChange={(e) => setDescuentoCesantia(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Anticipos</label>
                  <input
                    type="number"
                    min="0"
                    value={anticipos}
                    onChange={(e) => setAnticipos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 px-3.5 py-2.5 rounded-lg flex justify-between font-bold text-rose-900 text-xs">
                <span>Total Descuentos:</span>
                <span className="font-mono text-sm">-${totalDescuentos.toLocaleString('es-CL')}</span>
              </div>

              <div className="pt-2">
                <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Alcance Líquido Final</p>
                    <p className="text-xl font-extrabold text-[#00FF6F] leading-tight">
                      ${sueldoLiquido.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <span className="text-[11px] bg-[#007734] px-2.5 py-1 rounded text-white font-bold tracking-wide">A Pago</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={guardando || faltanAntecedentesPrevisionales || esLiquidacionEnCero}
                className={`w-full py-3 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs ${
                  esLiquidacionEnCero
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : liquidacionExistenteId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                    : 'bg-[#007734] hover:bg-[#009B43] text-white cursor-pointer'
                }`}
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : liquidacionExistenteId ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {esLiquidacionEnCero 
                    ? 'Liquidación en $0 (Bloqueada)'
                    : liquidacionExistenteId 
                    ? 'Recalcular y Sobrescribir Liquidación' 
                    : 'Emitir Liquidación'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CONFIRMACIÓN / SOBRESCRITURA DE LIQUIDACIÓN            */}
      {/* ============================================================== */}
      {mostrarModalConfirmarLiquidacion && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                liquidacionExistenteId ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-[#007734]'
              }`}>
                {liquidacionExistenteId ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalConfirmarLiquidacion(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {liquidacionExistenteId ? '¿Recalcular y Sobrescribir Liquidación?' : '¿Confirmar Registro de Liquidación?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {liquidacionExistenteId ? (
                  <>
                    Ya existe una liquidación para <strong className="font-bold text-slate-900">{selectedWorker.nombres} {selectedWorker.apellidos}</strong> en <strong className="text-slate-800">{NOMBRES_MESES[mes - 1]} {anio}</strong>. Esta acción actualizará los valores con los nuevos cálculos.
                  </>
                ) : (
                  <>
                    Estás a punto de emitir la liquidación salarial oficial para <strong className="font-bold text-slate-900">{selectedWorker.nombres} {selectedWorker.apellidos}</strong> correspondiente a <strong className="text-slate-800">{NOMBRES_MESES[mes - 1]} {anio}</strong>.
                  </>
                )}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Días Trabajados:</span>
                  <span className="font-semibold text-slate-800">{diasTrabajados} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Total Imponible:</span>
                  <span className="font-semibold text-slate-800 font-mono">${totalImponible.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Descuentos Previsionales:</span>
                  <span className="font-semibold text-rose-600 font-mono">-${totalDescuentos.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-800 font-black uppercase text-[11px]">Líquido a Pagar:</span>
                  <span className="font-black text-[#007734] text-sm font-mono">${sueldoLiquido.toLocaleString('es-CL')}</span>
                </div>
              </div>

              {liquidacionExistenteId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Los comprobantes y cómputos anteriores serán actualizados con los nuevos valores.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmarLiquidacion(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarGuardarLiquidacion}
                disabled={guardando}
                className={`w-1/2 py-2.5 px-4 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  liquidacionExistenteId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#007734] hover:bg-[#009B43]'
                }`}
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{liquidacionExistenteId ? 'Recalcular y Guardar' : 'Confirmar Emisión'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMACIÓN DE FINIQUITO                             */}
      {/* ============================================================== */}
      {mostrarModalConfirmarFiniquito && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalConfirmarFiniquito(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                ¿Registrar Propuesta de Finiquito?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás a punto de generar el expediente de término de contrato para <strong className="font-bold text-slate-900">{selectedWorker.nombres} {selectedWorker.apellidos}</strong> con fecha de cese al <strong className="text-slate-800">{fechaTermino}</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Años de Servicio:</span>
                  <span className="font-semibold text-slate-800">{metricasFiniquito.aniosServicio} años</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Feriado Proporcional:</span>
                  <span className="font-semibold text-slate-800 font-mono">${metricasFiniquito.montoFeriadoProporcional.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Indemnización Años:</span>
                  <span className="font-semibold text-slate-800 font-mono">${metricasFiniquito.montoIndemnizacionAnios.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-800 font-black uppercase text-[11px]">Total a Finiquitar:</span>
                  <span className="font-black text-[#007734] text-sm font-mono">${metricasFiniquito.totalFiniquito.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmarFiniquito(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Volver y Revisar
              </button>
              <button
                type="button"
                onClick={ejecutarGuardarFiniquito}
                disabled={guardando}
                className="w-1/2 py-2.5 px-4 bg-[#007734] hover:bg-[#009B43] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Confirmar y Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDITAR LIQUIDACIÓN                                       */}
      {/* ============================================================== */}
      {liquidacionEditar && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                <Edit className="w-4 h-4 text-[#007734]" />
                <span>Editar Liquidación ({NOMBRES_MESES[liquidacionEditar.mes - 1]} {liquidacionEditar.anio})</span>
              </h3>
              <button 
                onClick={() => setLiquidacionEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLiquidacion} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Días Trab.</label>
                  <input
                    type="number"
                    value={liquidacionEditar.dias_trabajados}
                    onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, dias_trabajados: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Días Ausentes</label>
                  <input
                    type="number"
                    value={liquidacionEditar.dias_ausentes || 0}
                    onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, dias_ausentes: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Días Licencia</label>
                  <input
                    type="number"
                    value={liquidacionEditar.dias_licencia || 0}
                    onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, dias_licencia: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              {/* SECCIÓN HABERES E INGRESOS IMPONIBLES */}
              <div className="space-y-2 border-t pt-2">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-[#007734]">1. Haberes e Ingresos Imponibles</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sueldo Base Pactado ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.sueldo_base_pactado}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, sueldo_base_pactado: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Horas Extra ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.monto_horas_extras || 0}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, monto_horas_extras: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bonos Imponibles ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.bonos_imponibles || 0}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, bonos_imponibles: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gratificación Legal ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.gratificacion_legal || 0}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, gratificacion_legal: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN DESCUENTOS PREVISIONALES Y LEGALES */}
              <div className="space-y-2 border-t pt-2">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-rose-700">2. Descuentos Previsionales y Legales</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">% AFP</label>
                    <input
                      type="number"
                      step="0.01"
                      value={liquidacionEditar.porcentaje_afp}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, porcentaje_afp: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">% Salud</label>
                    <input
                      type="number"
                      step="0.1"
                      value={liquidacionEditar.porcentaje_salud || 7}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, porcentaje_salud: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Seguro Cesantía ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.descuento_cesantia || 0}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, descuento_cesantia: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Anticipos ($)</label>
                    <input
                      type="number"
                      value={liquidacionEditar.anticipos || 0}
                      onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, anticipos: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* LÍQUIDO A PAGO FINAL */}
              <div className="pt-2 border-t">
                <label className="block font-bold text-slate-900 mb-1 uppercase tracking-wider text-[11px]">Sueldo Líquido Final a Pago ($)</label>
                <input
                  type="number"
                  value={liquidacionEditar.sueldo_liquido || 0}
                  onChange={(e) => setLiquidacionEditar({ ...liquidacionEditar, sueldo_liquido: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-extrabold text-[#007734] bg-emerald-50 text-base"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLiquidacionEditar(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-[#007734] text-white font-bold rounded-lg hover:bg-[#009B43] flex items-center space-x-1.5 cursor-pointer"
                >
                  {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDITAR FINIQUITO                                         */}
      {/* ============================================================== */}
      {finiquitoEditar && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                <Edit className="w-4 h-4 text-[#007734]" />
                <span>Editar Finiquito ({finiquitoEditar.fecha_termino})</span>
              </h3>
              <button 
                onClick={() => setFiniquitoEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFiniquito} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Término</label>
                  <input
                    type="date"
                    value={finiquitoEditar.fecha_termino}
                    onChange={(e) => setFiniquitoEditar({ ...finiquitoEditar, fecha_termino: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Años de Servicio</label>
                  <input
                    type="number"
                    value={finiquitoEditar.anios_servicio}
                    onChange={(e) => setFiniquitoEditar({ ...finiquitoEditar, anios_servicio: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Causal de Término</label>
                <select
                  value={finiquitoEditar.causal_termino}
                  onChange={(e) => setFiniquitoEditar({ ...finiquitoEditar, causal_termino: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white"
                >
                  {CAUSALES_TERMINO.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Feriado Proporcional ($)</label>
                  <input
                    type="number"
                    value={finiquitoEditar.monto_feriado_proporcional}
                    onChange={(e) => {
                      const nuevoFeriado = Number(e.target.value);
                      const delta = nuevoFeriado - (finiquitoEditar.monto_feriado_proporcional || 0);
                      setFiniquitoEditar({
                        ...finiquitoEditar,
                        monto_feriado_proporcional: nuevoFeriado,
                        total_finiquito: Math.max(0, (finiquitoEditar.total_finiquito || 0) + delta)
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Indemnización Años Servicio ($)</label>
                  <input
                    type="number"
                    value={finiquitoEditar.monto_indemnizacion_anios || 0}
                    onChange={(e) => {
                      const nuevaIndem = Number(e.target.value);
                      const delta = nuevaIndem - (finiquitoEditar.monto_indemnizacion_anios || 0);
                      setFiniquitoEditar({
                        ...finiquitoEditar,
                        monto_indemnizacion_anios: nuevaIndem,
                        total_finiquito: Math.max(0, (finiquitoEditar.total_finiquito || 0) + delta)
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              {finiquitoEditar.causal_termino === 'ART_161' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="avisoPrevioEditar"
                    checked={(finiquitoEditar.monto_aviso_previo || 0) === 0}
                    onChange={(e) => {
                      const seOtorgoCarta = e.target.checked;
                      const sueldoBaseTrabajador = selectedWorker?.sueldo_base || 0;
                      const topeGrat = topeGratificacionCalculado > 0 ? topeGratificacionCalculado : 197917;
                      const gratificacionEstimada = Math.min(Math.round(sueldoBaseTrabajador * 0.25), topeGrat);
                      const remuneracionBase = sueldoBaseTrabajador + gratificacionEstimada;

                      let nuevoMontoAviso = 0;
                      if (!seOtorgoCarta) {
                        nuevoMontoAviso = Math.round(remuneracionBase);
                      }

                      const montoAnteriorAviso = finiquitoEditar.monto_aviso_previo || 0;
                      const diferenciaAviso = nuevoMontoAviso - montoAnteriorAviso;

                      setFiniquitoEditar({
                        ...finiquitoEditar,
                        monto_aviso_previo: nuevoMontoAviso,
                        total_finiquito: Math.max(0, (finiquitoEditar.total_finiquito || 0) + diferenciaAviso)
                      });
                    }}
                    className="w-4 h-4 rounded text-[#007734] focus:ring-[#007734] cursor-pointer"
                  />
                  <label htmlFor="avisoPrevioEditar" className="text-xs font-bold text-amber-900 cursor-pointer">
                    ¿Se notificó carta de aviso previo con 30 días de anticipación?
                  </label>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-900 mb-1 uppercase tracking-wider text-[11px]">Total Finiquito Final ($)</label>
                <input
                  type="number"
                  value={finiquitoEditar.total_finiquito}
                  onChange={(e) => setFiniquitoEditar({ ...finiquitoEditar, total_finiquito: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-extrabold text-slate-900 bg-slate-100 text-base"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFiniquitoEditar(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-[#007734] text-white font-bold rounded-lg hover:bg-[#009B43] flex items-center space-x-1.5 cursor-pointer"
                >
                  {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}