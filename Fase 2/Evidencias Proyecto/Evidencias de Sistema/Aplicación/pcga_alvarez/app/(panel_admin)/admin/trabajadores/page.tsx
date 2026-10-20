'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  FaenaDB, 
  CargoTrabajador, 
  TipoContrato, 
  EstadoTrabajador 
} from '@/lib/supabase/types';
import { 
  obtenerTrabajadores, 
  crearTrabajador, 
  actualizarTrabajador,
  eliminarTrabajador,
  validarRutChileno, 
  validarNombreOApellido,
  formatearRutEnVivo, 
  descargarFichaIngresoPDF,
  TrabajadorConFaena 
} from '@/services/trabajadores';
import { 
  Users, UserCheck, UserX, UserMinus, Plus, Search, 
  Phone, Mail, Building2, ShieldCheck, HeartPulse, X, 
  Loader2, AlertCircle, Download, FileText, CheckCircle2,
  Pencil, Trash2, AlertTriangle, ShieldAlert, Info, Calendar
} from 'lucide-react';

// Validador estricto de teléfono chileno (acepta +569XXXXXXXX o 9XXXXXXXX)
function validarTelefonoChilenoEstricto(tel: string): boolean {
  const limpio = tel.replace(/[\s\-]/g, '');
  const regex = /^(\+?56)?9\d{8}$/;
  return regex.test(limpio);
}

// Validador de formato de correo electrónico
function validarEmailFormato(correo: string): boolean {
  if (!correo.trim()) return true; // Si es vacío, es válido porque es opcional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(correo.trim());
}

export default function TrabajadoresPage() {
  const supabase = createClient();

  const [trabajadores, setTrabajadores] = useState<TrabajadorConFaena[]>([]);
  const [faenas, setFaenas] = useState<FaenaDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  
  // Control de Modales Principales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [trabajadorEnEdicion, setTrabajadorEnEdicion] = useState<TrabajadorConFaena | null>(null);
  const [trabajadorPerfil, setTrabajadorPerfil] = useState<TrabajadorConFaena | null>(null);

  // Modales de Eliminación y Alerta DT
  const [trabajadorAEliminar, setTrabajadorAEliminar] = useState<TrabajadorConFaena | null>(null);
  const [alertaDT, setAlertaDT] = useState<{ operario: TrabajadorConFaena; mensaje: string } | null>(null);

  // Estados del Formulario
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, boolean>>({});
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [ultimoRegistrado, setUltimoRegistrado] = useState<TrabajadorConFaena | null>(null);

  const fechaHoy = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Campos del Formulario
  const [faenaId, setFaenaId] = useState<number | ''>('');
  const [rut, setRut] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('1995-05-15');
  const [telefono, setTelefono] = useState('+569');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cargo, setCargo] = useState<CargoTrabajador>('Jornal');
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>('POR_OBRA');
  const [fechaIngreso, setFechaIngreso] = useState(fechaHoy);
  const [sueldoBase, setSueldoBase] = useState('600000');
  const [afp, setAfp] = useState('Provida');
  const [sistemaSalud, setSistemaSalud] = useState('Fonasa');
  const [estadoOperario, setEstadoOperario] = useState<EstadoTrabajador>('ACTIVO');

  // Cálculo reactivo de edad exacta
  const edadCalculada = useMemo(() => {
    if (!fechaNacimiento) return 0;
    const [anioNac, mesNac, diaNac] = fechaNacimiento.split('-').map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anioNac;
    const mesDiff = (hoy.getMonth() + 1) - mesNac;
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < diaNac)) {
      edad--;
    }
    return edad;
  }, [fechaNacimiento]);

  const esMenorDeEdad = edadCalculada < 18;

  // Validación reactiva de teléfono
  const esTelefonoInvalido = useMemo(() => {
    if (!telefono) return true;
    return !validarTelefonoChilenoEstricto(telefono);
  }, [telefono]);

  // Validación reactiva de correo
  const esEmailInvalido = useMemo(() => {
    return !validarEmailFormato(email);
  }, [email]);

  // Carga inicial
  useEffect(() => {
    let cancelado = false;

    async function cargarDatosIniciales() {
      try {
        const { data: listaFaenas } = await supabase
          .from('faenas')
          .select('*')
          .order('id', { ascending: true });

        const listaTrabajadores = await obtenerTrabajadores();

        if (cancelado) return;

        if (listaFaenas && listaFaenas.length > 0) {
          setFaenas(listaFaenas);
          const activa = listaFaenas.find(f => f.estado === 'EN_EJECUCION') || listaFaenas[0];
          setFaenaId(activa.id);
        }

        setTrabajadores(listaTrabajadores);
      } catch (err: unknown) {
        console.error('Error al cargar datos de dotación:', err);
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    void cargarDatosIniciales();

    return () => {
      cancelado = true;
    };
  }, [supabase]);

  const abrirModalCrear = () => {
    setModoModal('crear');
    setTrabajadorEnEdicion(null);
    setRut('');
    setNombres('');
    setApellidos('');
    setFechaNacimiento('1995-05-15');
    setTelefono('+569');
    setEmail('');
    setDireccion('');
    setCargo('Jornal');
    setTipoContrato('POR_OBRA');
    setFechaIngreso(fechaHoy);
    setSueldoBase('600000');
    setAfp('Provida');
    setSistemaSalud('Fonasa');
    setEstadoOperario('ACTIVO');
    const activa = faenas.find(f => f.estado === 'EN_EJECUCION') || faenas[0];
    if (activa) setFaenaId(activa.id);
    setErrorModal(null);
    setErroresCampos({});
    setModalAbierto(true);
  };

  const abrirModalEditar = (t: TrabajadorConFaena) => {
    setModoModal('editar');
    setTrabajadorEnEdicion(t);
    setFaenaId(t.faena_id);
    setRut(t.rut);
    setNombres(t.nombres);
    setApellidos(t.apellidos);
    setFechaNacimiento(t.fecha_nacimiento || '1995-05-15');
    setTelefono(t.telefono || '+569');
    setEmail(t.email || '');
    setDireccion(t.direccion || '');
    setCargo(t.cargo);
    setTipoContrato(t.tipo_contrato);
    setFechaIngreso(t.fecha_ingreso);
    setSueldoBase(String(t.sueldo_base));
    setAfp(t.afp);
    setSistemaSalud(t.sistema_salud);
    setEstadoOperario(t.estado);
    setErrorModal(null);
    setErroresCampos({});
    setModalAbierto(true);
  };

  // Manejador inteligente de escritura para el teléfono móvil chileno
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/[^\d+]/g, '');

    // Mantener siempre el inicio +569 si el usuario escribe
    if (!valor.startsWith('+569')) {
      if (valor.startsWith('9')) {
        valor = `+56${valor}`;
      } else if (valor.startsWith('569')) {
        valor = `+${valor}`;
      } else if (valor === '' || valor === '+') {
        valor = '+569';
      }
    }

    // Limitar a +569 seguido de máximo 8 dígitos (12 caracteres en total)
    if (valor.length > 12) {
      valor = valor.slice(0, 12);
    }

    setTelefono(valor);
    if (erroresCampos.telefono) {
      setErroresCampos(prev => ({ ...prev, telefono: false }));
      setErrorModal(null);
    }
  };

  // Guardar (Crear o Modificar)
  const handleGuardarOperario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    const nuevosErrores: Record<string, boolean> = {};

    if (!faenaId) {
      setErrorModal('Debe asignar obligatoriamente una faena al trabajador.');
      return;
    }

    if (!validarNombreOApellido(nombres)) {
      nuevosErrores.nombres = true;
      setErrorModal('El nombre ingresado no es válido (solo se permiten letras, mínimo 2 caracteres).');
      setErroresCampos(nuevosErrores);
      return;
    }

    if (!validarNombreOApellido(apellidos)) {
      nuevosErrores.apellidos = true;
      setErrorModal('El apellido ingresado no es válido (solo se permiten letras, mínimo 2 caracteres).');
      setErroresCampos(nuevosErrores);
      return;
    }

    // Validación de Mayoría de Edad
    if (esMenorDeEdad) {
      nuevosErrores.fechaNacimiento = true;
      setErrorModal(`Restricción legal: El operario debe ser mayor de edad para ingresar a faena (Edad calculada: ${edadCalculada} años).`);
      setErroresCampos(nuevosErrores);
      return;
    }

    // Validación cronológica (Ingreso vs Nacimiento)
    const [aNac, mNac, dNac] = fechaNacimiento.split('-').map(Number);
    const fechaMinIngresoLegal = `${aNac + 18}-${String(mNac).padStart(2, '0')}-${String(dNac).padStart(2, '0')}`;
    if (fechaIngreso < fechaMinIngresoLegal) {
      nuevosErrores.fechaIngreso = true;
      setErrorModal('Incoherencia cronológica: La fecha de ingreso laboral no puede ser anterior a la fecha en que el trabajador cumplió los 18 años.');
      setErroresCampos(nuevosErrores);
      return;
    }

    // Validación de Teléfono Móvil
    if (esTelefonoInvalido) {
      nuevosErrores.telefono = true;
      setErrorModal('El teléfono debe tener formato chileno válido completo (+569XXXXXXXX con sus 8 dígitos móviles).');
      setErroresCampos(nuevosErrores);
      return;
    }

    // Validación de Correo Electrónico
    if (esEmailInvalido) {
      nuevosErrores.email = true;
      setErrorModal('El correo electrónico ingresado no tiene un formato válido (ejemplo: usuario@correo.cl).');
      setErroresCampos(nuevosErrores);
      return;
    }

    if (modoModal === 'crear') {
      if (!validarRutChileno(rut)) {
        nuevosErrores.rut = true;
        setErrorModal('El RUT ingresado no es válido según el algoritmo del Registro Civil.');
        setErroresCampos(nuevosErrores);
        return;
      }

      const rutLimpio = rut.replace(/[.\-\s]/g, '').toUpperCase();
      const existeEnMemoria = trabajadores.some(
        t => t.rut.replace(/[.\-\s]/g, '').toUpperCase() === rutLimpio
      );

      if (existeEnMemoria) {
        nuevosErrores.rut = true;
        setErrorModal('El RUT ingresado ya se encuentra registrado en el sistema.');
        setErroresCampos(nuevosErrores);
        return;
      }
    }

    setErroresCampos({});

    try {
      setGuardando(true);

      if (modoModal === 'crear') {
        const nuevoOperario = await crearTrabajador({
          faena_id: Number(faenaId),
          rut: formatearRutEnVivo(rut),
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          fecha_nacimiento: fechaNacimiento,
          telefono: telefono.trim(),
          email: email.trim() || null,
          direccion: direccion.trim() || 'Quillota, Región de Valparaíso',
          cargo,
          tipo_contrato: tipoContrato,
          fecha_ingreso: fechaIngreso,
          sueldo_base: Number(sueldoBase) || 0,
          afp,
          sistema_salud: sistemaSalud,
          estado: 'ACTIVO' as EstadoTrabajador,
        });

        setTrabajadores(prev => [nuevoOperario, ...prev]);
        setUltimoRegistrado(nuevoOperario);
        setMensajeExito(`Operario ${nuevoOperario.nombres} ${nuevoOperario.apellidos} registrado exitosamente.`);
      } else if (modoModal === 'editar' && trabajadorEnEdicion) {
        const actualizado = await actualizarTrabajador(trabajadorEnEdicion.id, {
          faena_id: Number(faenaId),
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          fecha_nacimiento: fechaNacimiento,
          telefono: telefono.trim(),
          email: email.trim() || null,
          direccion: direccion.trim(),
          cargo,
          tipo_contrato: tipoContrato,
          fecha_ingreso: fechaIngreso,
          sueldo_base: Number(sueldoBase) || 0,
          afp,
          sistema_salud: sistemaSalud,
          estado: estadoOperario,
        });

        setTrabajadores(prev =>
          prev.map(item => (item.id === actualizado.id ? actualizado : item))
        );
        if (trabajadorPerfil?.id === actualizado.id) {
          setTrabajadorPerfil(actualizado);
        }
        setMensajeExito(`Ficha de ${actualizado.nombres} ${actualizado.apellidos} actualizada con éxito.`);
      }

      setModalAbierto(false);
    } catch (err: unknown) {
      setErrorModal(
        err instanceof Error
          ? err.message
          : 'Error al procesar los datos del operario.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // Ejecución final de eliminación desde el modal
  const ejecutarEliminacionDefinitiva = async () => {
    if (!trabajadorAEliminar) return;
    const t = trabajadorAEliminar;

    try {
      setEliminandoId(t.id);
      await eliminarTrabajador(t.id);

      setTrabajadores(prev => prev.filter(item => item.id !== t.id));
      if (trabajadorPerfil?.id === t.id) {
        setTrabajadorPerfil(null);
      }
      setTrabajadorAEliminar(null);
      setMensajeExito(`Operario ${t.nombres} ${t.apellidos} eliminado correctamente de la dotación.`);
    } catch (err: unknown) {
      setTrabajadorAEliminar(null);
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar el operario.';
      setAlertaDT({ operario: t, mensaje });
    } finally {
      setEliminandoId(null);
    }
  };

  // KPIs
  const totalDotacion = trabajadores.length;
  const activos = trabajadores.filter(t => t.estado === 'ACTIVO').length;
  const finiquitados = trabajadores.filter(t => t.estado === 'FINIQUITADO').length;
  const inactivos = trabajadores.filter(t => t.estado === 'INACTIVO').length;

  // Filtrado
  const filtrados = trabajadores.filter(t => {
    const coincideTexto = 
      t.rut.toLowerCase().includes(busqueda.toLowerCase()) ||
      `${t.nombres} ${t.apellidos}`.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'TODOS' || t.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#007734] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Registro Histórico y Dotación de Personal</h1>
              <p className="text-xs text-slate-500">Gestión de contratos, datos previsionales y expedientes laborales DT</p>
            </div>
          </div>
        </div>
        <button
          onClick={abrirModalCrear}
          className="bg-[#007734] hover:bg-[#009B43] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Operario</span>
        </button>
      </div>

      {/* CONFIRMACIÓN DE ACCIÓN */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#007734] shrink-0" />
            <p className="text-xs font-bold text-emerald-950">{mensajeExito}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ultimoRegistrado && (
              <button
                onClick={() => descargarFichaIngresoPDF(ultimoRegistrado)}
                className="bg-[#007734] hover:bg-[#009B43] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#00FF6F]" />
                <span>Emitir Ficha de Ingreso (PDF)</span>
              </button>
            )}
            <button
              onClick={() => {
                setMensajeExito(null);
                setUltimoRegistrado(null);
              }}
              className="p-1.5 text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600"><Users className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dotación Total</p>
            <p className="text-xl font-black text-slate-900">{totalDotacion}</p>
          </div>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700"><UserCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Activos en Faena</p>
            <p className="text-xl font-black text-emerald-900">{activos}</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-slate-200 rounded-xl text-slate-600"><UserMinus className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Finiquitados</p>
            <p className="text-xl font-black text-slate-700">{finiquitados}</p>
          </div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700"><UserX className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Inactivos</p>
            <p className="text-xl font-black text-rose-900">{inactivos}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por RUT o Nombre de operario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#007734]"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none cursor-pointer"
        >
          <option value="TODOS">Todos los Estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="FINIQUITADO">Finiquitados</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      {/* LISTADO DE OPERARIOS */}
      {cargando ? (
        <div className="p-12 text-center text-xs text-slate-400 flex justify-center items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#007734]" /> Cargando dotación...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
          No se encontraron operarios registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((t) => (
            <div 
              key={t.id} 
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {t.rut}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' :
                      t.estado === 'FINIQUITADO' ? 'bg-slate-100 text-slate-700' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {t.estado === 'ACTIVO' ? '• Activo' : t.estado === 'FINIQUITADO' ? 'Finiquitado' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{t.nombres} {t.apellidos}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-bold text-slate-800">{t.cargo}</span> • ${Number(t.sueldo_base).toLocaleString('es-CL')} Base
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md mt-2 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#007734] shrink-0" />
                    <span className="truncate">{t.faenas?.nombre_faena || 'Sin Faena'}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" /> <span>{t.telefono}</span>
                  </p>
                  {t.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" /> <span className="truncate">{t.email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-slate-600 font-medium pt-0.5">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-[#007734]" /> AFP {t.afp}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><HeartPulse className="w-3 h-3 text-rose-500" /> {t.sistema_salud}</span>
                  </p>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTrabajadorPerfil(t)}
                    title="Ver Perfil Detallado"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirModalEditar(t)}
                    title="Modificar Operario"
                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrabajadorAEliminar(t)}
                    disabled={eliminandoId === t.id}
                    title="Eliminar Operario"
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {eliminandoId === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => descargarFichaIngresoPDF(t)}
                  title="Emitir y Descargar Ficha de Ingreso DT"
                  className="bg-[#007734] hover:bg-[#009B43] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-[#00FF6F]" />
                  <span>Emitir Ficha DT</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / MODIFICAR OPERARIO                                     */}
      {/* ========================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {modoModal === 'crear' ? 'Registrar Nuevo Operario' : 'Modificar Datos del Operario'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modoModal === 'crear' 
                    ? 'Ficha contractual y asignación a faena' 
                    : `Actualizando ficha de ${trabajadorEnEdicion?.nombres} ${trabajadorEnEdicion?.apellidos}`}
                </p>
              </div>
              <button 
                onClick={() => setModalAbierto(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorModal && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-r-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-bold">{errorModal}</span>
              </div>
            )}

            <form onSubmit={handleGuardarOperario} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 bg-emerald-50/50 border border-emerald-200 p-3 rounded-2xl space-y-1.5">
                  <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#007734]" />
                    Faena / Centro de Costo *
                  </label>
                  <select
                    value={faenaId}
                    onChange={(e) => setFaenaId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#007734] cursor-pointer"
                  >
                    <option value="">-- Seleccionar Faena --</option>
                    {faenas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre_faena} ({f.codigo_centro_costo || 'Sin CC'}) - {f.estado}
                      </option>
                    ))}
                  </select>
                </div>

                {modoModal === 'editar' && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Estado Operario *
                    </label>
                    <select
                      value={estadoOperario}
                      onChange={(e) => setEstadoOperario(e.target.value as EstadoTrabajador)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="FINIQUITADO">Finiquitado</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    RUT * {modoModal === 'editar' && <span className="text-[10px] text-slate-400 font-normal">(Inmutable)</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    required
                    disabled={modoModal === 'editar'}
                    value={rut}
                    onChange={(e) => {
                      const formateado = formatearRutEnVivo(e.target.value);
                      setRut(formateado);
                      if (erroresCampos.rut) {
                        setErroresCampos(prev => ({ ...prev, rut: false }));
                        setErrorModal(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl outline-none font-mono transition-all ${
                      modoModal === 'editar'
                        ? 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
                        : erroresCampos.rut
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                        : 'bg-slate-50 border border-slate-300 focus:border-[#007734]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    placeholder="Solo letras"
                    required
                    value={nombres}
                    onChange={(e) => {
                      const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                      setNombres(soloLetras);
                      if (erroresCampos.nombres) {
                        setErroresCampos(prev => ({ ...prev, nombres: false }));
                        setErrorModal(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl outline-none transition-all ${
                      erroresCampos.nombres
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900'
                        : 'bg-slate-50 border border-slate-300 focus:border-[#007734]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    placeholder="Solo letras"
                    required
                    value={apellidos}
                    onChange={(e) => {
                      const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                      setApellidos(soloLetras);
                      if (erroresCampos.apellidos) {
                        setErroresCampos(prev => ({ ...prev, apellidos: false }));
                        setErrorModal(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl outline-none transition-all ${
                      erroresCampos.apellidos
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900'
                        : 'bg-slate-50 border border-slate-300 focus:border-[#007734]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo *</label>
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value as CargoTrabajador)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="Jornal">Jornal</option>
                    <option value="Maestro Primera">Maestro Primera</option>
                    <option value="Maestro Segunda">Maestro Segunda</option>
                    <option value="Maestro Enfierrador">Maestro Enfierrador</option>
                    <option value="Operador Maquinaria">Operador Maquinaria</option>
                    <option value="Supervisor de Obra">Supervisor de Obra</option>
                    <option value="Administrativo / RRHH">Administrativo / RRHH</option>
                    <option value="Contadora">Contadora</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo Contrato *</label>
                  <select
                    value={tipoContrato}
                    onChange={(e) => setTipoContrato(e.target.value as TipoContrato)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="POR_OBRA">Por Obra o Faena</option>
                    <option value="PLAZO_FIJO">Plazo Fijo</option>
                    <option value="INDEFINIDO">Indefinido</option>
                    <option value="HONORARIOS">Honorarios</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sueldo Base ($) *</label>
                  <input
                    type="number"
                    min="500000"
                    step="10000"
                    required
                    value={sueldoBase}
                    onChange={(e) => setSueldoBase(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">AFP *</label>
                  <select
                    value={afp}
                    onChange={(e) => setAfp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="Capital">Capital</option>
                    <option value="Cuprum">Cuprum</option>
                    <option value="Habitat">Habitat</option>
                    <option value="Modelo">Modelo</option>
                    <option value="Planvital">Planvital</option>
                    <option value="Provida">Provida</option>
                    <option value="Uno">Uno</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salud *</label>
                  <select
                    value={sistemaSalud}
                    onChange={(e) => setSistemaSalud(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Fonasa">Fonasa</option>
                    <option value="Isapre Banmédica">Isapre Banmédica</option>
                    <option value="Isapre Colmena">Isapre Colmena</option>
                    <option value="Isapre Consalud">Isapre Consalud</option>
                    <option value="Isapre CruzBlanca">Isapre CruzBlanca</option>
                    <option value="Isapre Nueva Masvida">Isapre Nueva Masvida</option>
                    <option value="Isapre Vida Tres">Isapre Vida Tres</option>
                    <option value="Isapre Esencial">Isapre Esencial</option>
                  </select>
                </div>
              </div>

              {/* BLOQUE DE FECHAS: CALENDARIO LIBRE Y VALIDACIÓN INTELIGENTE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Fecha Nacimiento *
                    </label>
                    <span className={`text-[10px] font-bold ${esMenorDeEdad ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {edadCalculada > 0 ? `${edadCalculada} años` : ''}
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={fechaNacimiento}
                    onChange={(e) => {
                      setFechaNacimiento(e.target.value);
                      if (erroresCampos.fechaNacimiento) {
                        setErroresCampos(prev => ({ ...prev, fechaNacimiento: false }));
                        setErrorModal(null);
                      }
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none cursor-pointer transition-colors ${
                      esMenorDeEdad 
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-300' 
                        : 'border-slate-300 focus:ring-2 focus:ring-[#007734]'
                    }`}
                  />
                  {esMenorDeEdad && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Debe ser mayor de 18 años (+18)
                    </p>
                  )}
                </div>

                {/* TELÉFONO MÓVIL CON VALIDACIÓN ESTRICTA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Teléfono Móvil *</label>
                    <span className="text-[10px] text-slate-400 font-mono">9 dígitos</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="+56912345678"
                    required
                    value={telefono}
                    onChange={handleTelefonoChange}
                    className={`w-full px-3 py-2 rounded-xl outline-none font-mono transition-all ${
                      erroresCampos.telefono || (telefono.length > 4 && esTelefonoInvalido)
                        ? 'bg-rose-50 border-2 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border border-slate-300 focus:border-[#007734]'
                    }`}
                  />
                  {telefono.length > 4 && esTelefonoInvalido ? (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                      Faltan dígitos (+569 seguido de 8 números)
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">Ej: +56912345678</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha Ingreso *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaIngreso}
                    onChange={(e) => {
                      setFechaIngreso(e.target.value);
                      if (erroresCampos.fechaIngreso) {
                        setErroresCampos(prev => ({ ...prev, fechaIngreso: false }));
                        setErrorModal(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
                  />
                  {fechaIngreso > fechaHoy && (
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Ingreso programado
                    </p>
                  )}
                </div>
              </div>

              {/* CORREO ELECTRÓNICO CON VALIDACIÓN RFC Y DIRECCIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Correo Electrónico</label>
                    <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </div>
                  <input
                    type="email"
                    placeholder="operario@ejemplo.cl"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (erroresCampos.email) {
                        setErroresCampos(prev => ({ ...prev, email: false }));
                        setErrorModal(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl outline-none transition-all ${
                      erroresCampos.email || esEmailInvalido
                        ? 'bg-rose-50 border-2 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border border-slate-300 focus:border-[#007734]'
                    }`}
                  />
                  {esEmailInvalido && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                      Formato de correo no válido (ej: nombre@correo.cl)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dirección / Comuna</label>
                  <input
                    type="text"
                    placeholder="Calle, número, comuna..."
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || esMenorDeEdad || esTelefonoInvalido || esEmailInvalido}
                  className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                    esMenorDeEdad || esTelefonoInvalido || esEmailInvalido
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#007734] hover:bg-[#009B43] text-white cursor-pointer'
                  }`}
                >
                  {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {esMenorDeEdad 
                      ? 'Menor de 18 años (Bloqueado)' 
                      : esTelefonoInvalido
                      ? 'Teléfono Incompleto'
                      : esEmailInvalido
                      ? 'Correo Inválido'
                      : modoModal === 'crear' 
                      ? 'Guardar Operario' 
                      : 'Actualizar Operario'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PERFIL COMPLETO DEL OPERARIO                                     */}
      {/* ========================================================================= */}
      {trabajadorPerfil && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Perfil Contractual del Operario</h2>
                <p className="text-xs text-slate-500 mt-0.5">Expediente formal para archivo y fiscalización DT</p>
              </div>
              <button 
                onClick={() => setTrabajadorPerfil(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {trabajadorPerfil.nombres} {trabajadorPerfil.apellidos}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">RUT: {trabajadorPerfil.rut}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                  {trabajadorPerfil.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-2xl">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Cargo</p>
                  <p className="font-bold text-slate-800">{trabajadorPerfil.cargo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Sueldo Base</p>
                  <p className="font-black text-emerald-700">${Number(trabajadorPerfil.sueldo_base).toLocaleString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Faena Asignada</p>
                  <p className="font-bold text-slate-800">{trabajadorPerfil.faenas?.nombre_faena || 'Sin Asignar'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tipo de Contrato</p>
                  <p className="font-bold text-slate-800">{trabajadorPerfil.tipo_contrato}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Previsión (AFP)</p>
                  <p className="font-bold text-slate-800">AFP {trabajadorPerfil.afp}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Salud</p>
                  <p className="font-bold text-slate-800">{trabajadorPerfil.sistema_salud}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const temp = trabajadorPerfil;
                    setTrabajadorPerfil(null);
                    abrirModalEditar(temp);
                  }}
                  className="px-3 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Modificar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const temp = trabajadorPerfil;
                    setTrabajadorPerfil(null);
                    setTrabajadorAEliminar(temp);
                  }}
                  className="px-3 py-2 border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrabajadorPerfil(null)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={() => descargarFichaIngresoPDF(trabajadorPerfil)}
                  className="bg-[#007734] hover:bg-[#009B43] text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#00FF6F]" />
                  <span>Ficha PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CONFIRMACIÓN DE ELIMINACIÓN DE OPERARIO               */}
      {/* ============================================================== */}
      {trabajadorAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setTrabajadorAEliminar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                ¿Eliminar permanentemente al operario?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás a punto de desvincular del sistema a <strong className="font-bold text-slate-900">{trabajadorAEliminar.nombres} {trabajadorAEliminar.apellidos}</strong> (RUT: <span className="font-mono font-semibold text-slate-800">{trabajadorAEliminar.rut}</span>).
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-2xl text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Esta acción no se puede deshacer. Se removerá de las planillas de obra.</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTrabajadorAEliminar(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacionDefinitiva}
                disabled={eliminandoId === trabajadorAEliminar.id}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {eliminandoId === trabajadorAEliminar.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ALERTA DE BLOQUEO POR TRAZABILIDAD Y NORMATIVA DT     */}
      {/* ============================================================== */}
      {alertaDT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setAlertaDT(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Acción Restringida por Normativa DT
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No es posible eliminar el expediente de <strong className="font-bold text-slate-900">{alertaDT.operario.nombres} {alertaDT.operario.apellidos}</strong> porque cuenta con registros históricos asociados (marcas de asistencia o liquidaciones emitidas).
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-[11px] font-medium flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Para mantener la trazabilidad ante fiscalizaciones de la Dirección del Trabajo, se recomienda cambiar su estado a <strong className="font-bold">INACTIVO</strong> o procesar su <strong className="font-bold">FINIQUITADO</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAlertaDT(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
              <button
                type="button"
                onClick={() => {
                  const op = alertaDT.operario;
                  setAlertaDT(null);
                  abrirModalEditar(op);
                }}
                className="w-1/2 py-2.5 px-4 bg-[#007734] hover:bg-[#009B43] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Cambiar Estado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}