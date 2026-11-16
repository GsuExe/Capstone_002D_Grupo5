'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, Search, Plus, Save, RotateCcw, AlertCircle, CheckCircle2,
  Loader2, MapPin, Calendar, Clock, PauseCircle, CheckCircle, X, ShieldCheck,
  Trash2, AlertTriangle, ShieldAlert, Info, Database, Layers, Users, DollarSign
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { FaenaDB, EstadoFaena } from '@/lib/supabase/types';
import { 
  obtenerFaenas, 
  crearFaena, 
  actualizarFaena, 
  eliminarFaena,
  finalizarFaenaConDatosHistoricos,
  TipoSuelo
} from '@/services/faenas';

const supabase = createClient();

const ESTADOS_PERMITIDOS: { value: EstadoFaena; label: string }[] = [
  { value: 'EN_EJECUCION', label: 'En Ejecución' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'SUSPENDIDA', label: 'Suspendida' },
];

const TIPOS_SUELO_DISPONIBLES: TipoSuelo[] = ['Rocoso', 'Arcilloso', 'Arenoso', 'Grava', 'Mixto'];

const DIVISION_CHILE: Record<string, string[]> = {
  'Valparaíso': [
    'Viña del Mar', 'Valparaíso', 'Quillota', 'Quilpué', 'Villa Alemana', 'Concón', 
    'Calera', 'Limache', 'La Cruz', 'Olmué', 'Hijuelas', 'Nogales', 'Quintero', 
    'Puchuncaví', 'Casablanca', 'San Antonio', 'Algarrobo', 'El Quisco', 'El Tabo', 
    'Cartagena', 'Santo Domingo', 'San Felipe', 'Llaillay', 'Catemu', 'Panquehue', 
    'Putaendo', 'Santa María', 'Los Andes', 'Calle Larga', 'Rinconada', 'San Esteban', 
    'La Ligua', 'Cabildo', 'Papudo', 'Petorca', 'Zapallar', 'Isla de Pascua', 'Juan Fernández'
  ],
  'Metropolitana de Santiago': [
    'Santiago', 'Las Condes', 'Providencia', 'Ñuñoa', 'Maipú', 'Puente Alto', 
    'La Florida', 'San Bernardo', 'Pudahuel', 'Quilicura', 'Colina', 'Lampa', 
    'Huechuraba', 'Vitacura', 'Lo Barnechea', 'Peñalolén', 'La Reina', 'Macul', 
    'Estación Central', 'Recoleta', 'Independencia', 'San Miguel', 'Cerrillos', 
    'Quinta Normal', 'Renca', 'Conchalí', 'Cerro Navia', 'Lo Prado', 'Pedro Aguirre Cerda', 
    'San Joaquín', 'La Cisterna', 'La Granja', 'San Ramón', 'La Pintana', 'El Bosque', 
    'Lo Espejo', 'Pirque', 'San José de Maipo', 'Tiltil', 'Buin', 'Calera de Tango', 
    'Paine', 'Melipilla', 'Curacaví', 'Talagante', 'Peñaflor', 'Padre Hurtado', 'El Monte', 'Isla de Maipo'
  ],
  'Coquimbo': [
    'La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Salamanca', 'Los Vilos', 
    'Vicuña', 'Andacollo', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado', 'Canela', 'La Higuera', 'Paiguano'
  ],
  "Libertador General Bernardo O'Higgins": [
    'Rancagua', 'Machalí', 'Graneros', 'Rengo', 'San Vicente', 'San Fernando', 
    'Santa Cruz', 'Pichilemu', 'Mostazal', 'Requínoa', 'Codegua', 'Doñihue', 'Coltauco', 'Peumo', 'Las Cabras', 'Chimbarongo'
  ],
  'Maule': [
    'Talca', 'Curicó', 'Linares', 'Constitución', 'Molina', 'San Javier', 
    'Parral', 'Cauquenes', 'San Clemente', 'Teno', 'Longaví', 'Colbún'
  ],
  'Biobío': [
    'Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Coronel', 'Chiguayante', 
    'Hualpén', 'Los Ángeles', 'Penco', 'Tomé', 'Lota', 'Arauco', 'Cañete', 'Cabrero', 'Mulchén', 'Nacimiento'
  ],
  'La Araucanía': [
    'Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Lautaro', 
    'Victoria', 'Nueva Imperial', 'Collipulli', 'Traiguén', 'Pitrufquén'
  ],
  'Antofagasta': [
    'Antofagasta', 'Calama', 'Tocopilla', 'Mejillones', 'Taltal', 'San Pedro de Atacama', 'Sierra Gorda', 'María Elena'
  ],
  'Atacama': [
    'Copiapó', 'Vallenar', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro', 'Huasco', 'Freirina'
  ],
  'Tarapacá': [
    'Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara', 'Camiña', 'Colchane'
  ],
  'Arica y Parinacota': [
    'Arica', 'Camarones', 'Putre', 'General Lagos'
  ],
  'Ñuble': [
    'Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Coihueco', 'Yungay', 'Quillón'
  ],
  'Los Ríos': [
    'Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli', 'Paillaco', 'Los Lagos', 'Mariquina', 'Lanco', 'Futrono'
  ],
  'Los Lagos': [
    'Puerto Montt', 'Osorno', 'Puerto Varas', 'Castro', 'Ancud', 'Quellón', 'Frutillar', 'Llanquihue', 'Calbuco'
  ],
  'Aysén': [
    'Coyhaique', 'Aysén', 'Chile Chico', 'Cochrane', 'Cisnes'
  ],
  'Magallanes y Antártica Chilena': [
    'Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos'
  ],
};

const REGIONES_DISPONIBLES = Object.keys(DIVISION_CHILE);

export default function GestionFaenasPage() {
  const [faenas, setFaenas] = useState<FaenaDB[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');

  // Selección y Formulario General
  const [faenaSeleccionada, setFaenaSeleccionada] = useState<FaenaDB | null>(null);
  const [nombreFaena, setNombreFaena] = useState('');
  const [mandante, setMandante] = useState('');
  const [codigoCentroCosto, setCodigoCentroCosto] = useState('');

  // Región, Comuna y Dirección
  const [region, setRegion] = useState<string>('Valparaíso');
  const [comuna, setComuna] = useState<string>('Viña del Mar');
  const [direccionDetalle, setDireccionDetalle] = useState<string>('');

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaTermino, setFechaTermino] = useState('');
  const [estado, setEstado] = useState<EstadoFaena>('EN_EJECUCION');

  // Parámetros Técnicos ML para Cierre de Obra (SCRUM-137)
  const [tipoSuelo, setTipoSuelo] = useState<TipoSuelo>('Mixto');
  const [volumenObra, setVolumenObra] = useState<string>('');
  const [dotacionPersonal, setDotacionPersonal] = useState<string>('');
  const [semanasDuracion, setSemanasDuracion] = useState<string>('');
  const [costoManoObraReal, setCostoManoObraReal] = useState<string>('');
  const [observacionesCierre, setObservacionesCierre] = useState<string>('');

  // Modales
  const [mostrarModalConfirmar, setMostrarModalConfirmar] = useState(false);
  const [faenaAEliminar, setFaenaAEliminar] = useState<FaenaDB | null>(null);
  const [alertaBloqueoDT, setAlertaBloqueoDT] = useState<{ faena: FaenaDB; motivo: string } | null>(null);

  // Feedback
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const parsearUbicacion = useCallback((textoUbicacion?: string | null) => {
    if (!textoUbicacion) {
      setRegion('Valparaíso');
      setComuna('Viña del Mar');
      setDireccionDetalle('');
      return;
    }

    let regionDetectada = 'Valparaíso';
    let comunaDetectada = 'Viña del Mar';
    let detalleLimpio = textoUbicacion;

    for (const reg of REGIONES_DISPONIBLES) {
      for (const com of DIVISION_CHILE[reg]) {
        if (textoUbicacion.toLowerCase().includes(com.toLowerCase())) {
          regionDetectada = reg;
          comunaDetectada = com;
          detalleLimpio = detalleLimpio
            .replace(new RegExp(com, 'gi'), '')
            .replace(new RegExp(`Región de ${reg}|Región ${reg}|${reg}`, 'gi'), '')
            .replace(/^[,\s-]+|[,\s-]+$/g, '')
            .trim();
          break;
        }
      }
    }

    setRegion(regionDetectada);
    setComuna(comunaDetectada);
    setDireccionDetalle(detalleLimpio);
  }, []);

  const cargarFormulario = useCallback((f: FaenaDB | null) => {
    if (f) {
      setFaenaSeleccionada(f);
      setNombreFaena(f.nombre_faena || '');
      setMandante(f.mandante || '');
      setCodigoCentroCosto(f.codigo_centro_costo || '');
      parsearUbicacion(f.ubicacion);
      setFechaInicio(f.fecha_inicio || '');
      setFechaTermino(f.fecha_termino || '');
      setEstado((f.estado as EstadoFaena) || 'EN_EJECUCION');
      
      // Cargar datos ML si ya fueron registrados
      const fAny = f as any;
      setTipoSuelo(fAny.tipo_suelo || 'Mixto');
      setVolumenObra(fAny.volumen_obra ? String(fAny.volumen_obra) : '');
      setDotacionPersonal(fAny.dotacion_personal ? String(fAny.dotacion_personal) : '');
      setSemanasDuracion(fAny.semanas_duracion ? String(fAny.semanas_duracion) : '');
      setCostoManoObraReal(fAny.costo_mano_obra_real ? String(fAny.costo_mano_obra_real) : '');
      setObservacionesCierre(fAny.observaciones_cierre || '');
    } else {
      setFaenaSeleccionada(null);
      setNombreFaena('');
      setMandante('');
      setCodigoCentroCosto('');
      setRegion('Valparaíso');
      setComuna('Viña del Mar');
      setDireccionDetalle('');
      setFechaInicio(new Date().toISOString().split('T')[0]);
      setFechaTermino('');
      setEstado('EN_EJECUCION');

      setTipoSuelo('Mixto');
      setVolumenObra('');
      setDotacionPersonal('');
      setSemanasDuracion('');
      setCostoManoObraReal('');
      setObservacionesCierre('');
    }
    setError(null);
    setExito(null);
  }, [parsearUbicacion]);

  useEffect(() => {
    let activo = true;

    async function fetchData() {
      try {
        setCargando(true);
        const data = await obtenerFaenas();
        if (activo) {
          const lista = (data as unknown as FaenaDB[]) || [];
          setFaenas(lista);
          if (lista.length > 0) {
            cargarFormulario(lista[0]);
          } else {
            cargarFormulario(null);
          }
        }
      } catch (err: unknown) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'Error al conectar con la base de datos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void fetchData();

    return () => {
      activo = false;
    };
  }, [cargarFormulario]);

  const refrescarDatos = async (idSeleccionar?: number) => {
    try {
      setCargando(true);
      const data = await obtenerFaenas();
      const lista = (data as unknown as FaenaDB[]) || [];
      setFaenas(lista);
      if (idSeleccionar) {
        const encontrada = lista.find((x) => x.id === idSeleccionar);
        cargarFormulario(encontrada || lista[0] || null);
      }
    } catch {
      setError('Error al actualizar listado de faenas.');
    } finally {
      setCargando(false);
    }
  };

  const handleRegionChange = (nuevaRegion: string) => {
    setRegion(nuevaRegion);
    const comunasDeRegion = DIVISION_CHILE[nuevaRegion] || [];
    setComuna(comunasDeRegion[0] || '');
  };

  // KPIs
  const metricas = useMemo(() => {
    let ejecucion = 0;
    let finalizadas = 0;
    let suspendidas = 0;

    faenas.forEach((f) => {
      if (f.estado === 'EN_EJECUCION') ejecucion++;
      else if (f.estado === 'FINALIZADA') finalizadas++;
      else if (f.estado === 'SUSPENDIDA') suspendidas++;
    });

    return {
      total: faenas.length,
      ejecucion,
      finalizadas,
      suspendidas,
    };
  }, [faenas]);

  // Filtros
  const faenasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return faenas.filter((f) => {
      const coincideNombre = f.nombre_faena ? f.nombre_faena.toLowerCase().includes(texto) : false;
      const coincideMandante = f.mandante ? f.mandante.toLowerCase().includes(texto) : false;
      const coincideUbicacion = f.ubicacion ? f.ubicacion.toLowerCase().includes(texto) : false;
      
      const coincideBusqueda = coincideNombre || coincideMandante || coincideUbicacion;
      const coincideEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [faenas, busqueda, filtroEstado]);

  const ubicacionFinal = useMemo(() => {
    const detalle = direccionDetalle.trim();
    if (detalle) {
      return `${detalle}, ${comuna}`;
    }
    return `${comuna}, Región ${region}`;
  }, [direccionDetalle, comuna, region]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!nombreFaena.trim()) {
      setError('El nombre de la faena es obligatorio.');
      return;
    }
    if (!comuna) {
      setError('Debe seleccionar la comuna de emplazamiento de la faena.');
      return;
    }
    if (!fechaInicio) {
      setError('La fecha de inicio de obras es obligatoria.');
      return;
    }

    if (estado === 'FINALIZADA') {
      if (!fechaTermino) {
        setError('Para obras con estado Finalizada debe indicar la fecha de término.');
        return;
      }
      if (Number(volumenObra) <= 0 || Number(dotacionPersonal) <= 0 || Number(semanasDuracion) <= 0 || Number(costoManoObraReal) <= 0) {
        setError('Para finalizar una obra y registrar sus datos en el modelo de Machine Learning, debe completar todos los parámetros técnicos reales (volumen, dotación, semanas y costo).');
        return;
      }
    }

    if (fechaTermino && fechaInicio && fechaTermino < fechaInicio) {
      setError('La fecha de término no puede ser anterior a la fecha de inicio de la obra.');
      return;
    }

    setMostrarModalConfirmar(true);
  };

  const ejecutarGuardarFaena = async () => {
    setMostrarModalConfirmar(false);
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const payloadBase = {
        nombre_faena: String(nombreFaena).trim(),
        mandante: mandante ? String(mandante).trim() : null,
        codigo_centro_costo: codigoCentroCosto ? String(codigoCentroCosto).trim() : null,
        ubicacion: ubicacionFinal,
        fecha_inicio: fechaInicio,
        fecha_termino: estado === 'FINALIZADA' && fechaTermino ? fechaTermino : null,
        estado: estado,
      };

      if (faenaSeleccionada) {
        if (estado === 'FINALIZADA') {
          await finalizarFaenaConDatosHistoricos(faenaSeleccionada.id, {
            fecha_termino: fechaTermino,
            tipo_suelo: tipoSuelo,
            volumen_obra: Number(volumenObra),
            dotacion_personal: parseInt(dotacionPersonal, 10),
            semanas_duracion: parseInt(semanasDuracion, 10),
            costo_mano_obra_real: Number(costoManoObraReal),
            observaciones_cierre: observacionesCierre.trim() || undefined,
          });
          setExito(`Faena "${payloadBase.nombre_faena}" finalizada e indexada en el dataset histórico de Machine Learning.`);
        } else {
          await actualizarFaena(faenaSeleccionada.id, payloadBase as unknown as Partial<FaenaDB>);
          setExito(`Faena "${payloadBase.nombre_faena}" actualizada correctamente.`);
        }
        await refrescarDatos(faenaSeleccionada.id);
      } else {
        const respuestaFaena = await crearFaena(payloadBase as unknown as Omit<FaenaDB, 'id'>);
        
        const faenaId = Array.isArray(respuestaFaena) 
          ? respuestaFaena[0]?.id 
          : (respuestaFaena as any)?.id;

        const tituloAlerta = `Nueva Obra: ${payloadBase.nombre_faena}`;

        const { data: alertaInsertada } = await supabase
          .from('alertas_vencimiento')
          .insert([{
            origen_entidad: 'FAENAS',
            entidad_id: faenaId || null,
            titulo: tituloAlerta,
            tipo_alerta: 'PREVENTIVA_30D',
            estado: 'PENDIENTE',
            fecha_generada: new Date().toISOString()
          }])
          .select()
          .single();

        await fetch('/api/notificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origen_entidad: 'FAENAS',
            entidad_id: alertaInsertada?.id || faenaId || 0,
            titulo: tituloAlerta,
            tipo_alerta: 'PREVENTIVA_30D',
            mensaje_adicional: `Se ha dado alta a la nueva faena "${payloadBase.nombre_faena}" con mandante ${payloadBase.mandante || 'Particular'} en: ${payloadBase.ubicacion}.`,
          }),
        }).catch((mailErr) => console.error('Error al enviar correo de faena:', mailErr));

        setExito(`Faena "${payloadBase.nombre_faena}" creada exitosamente.`);
        await refrescarDatos();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la faena.');
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarEliminacionFaena = async () => {
    if (!faenaAEliminar) return;
    const f = faenaAEliminar;
    setFaenaAEliminar(null);
    setEliminandoId(f.id);
    setError(null);
    setExito(null);

    try {
      const { count: countTrabajadores } = await supabase
        .from('trabajadores')
        .select('*', { count: 'exact', head: true })
        .eq('faena_id', f.id);

      if (countTrabajadores && countTrabajadores > 0) {
        setAlertaBloqueoDT({
          faena: f,
          motivo: `Posee ${countTrabajadores} operario(s) asignado(s) en sus nóminas contractuales.`
        });
        return;
      }

      const { count: countAsistencias } = await supabase
        .from('asistencias')
        .select('*', { count: 'exact', head: true })
        .eq('faena_id', f.id);

      if (countAsistencias && countAsistencias > 0) {
        setAlertaBloqueoDT({
          faena: f,
          motivo: `Cuenta con ${countAsistencias} registros de asistencia en el Libro Digital de Faena.`
        });
        return;
      }

      const { count: countCierres } = await supabase
        .from('cierres_mensuales')
        .select('*', { count: 'exact', head: true })
        .eq('faena_id', f.id);

      if (countCierres && countCierres > 0) {
        setAlertaBloqueoDT({
          faena: f,
          motivo: `Mantiene ${countCierres} período(s) sellado(s) ante la Dirección del Trabajo (DT).`
        });
        return;
      }

      await eliminarFaena(f.id);
      setExito(`Faena "${f.nombre_faena}" eliminada permanentemente.`);
      if (faenaSeleccionada?.id === f.id) {
        cargarFormulario(null);
      }
      await refrescarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la faena.';
      setAlertaBloqueoDT({ faena: f, motivo: msg });
    } finally {
      setEliminandoId(null);
    }
  };

  const renderBadgeEstado = (estadoFaena?: string | null) => {
    switch (estadoFaena) {
      case 'EN_EJECUCION':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
            En Ejecución
          </span>
        );
      case 'FINALIZADA':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
            Finalizada (ML)
          </span>
        );
      case 'SUSPENDIDA':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
            Suspendida
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-medium inline-block">
            Sin Estado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      
      {/* 1. BARRA SUPERIOR INTEGRADA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#007734]/10 text-[#007734] flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">Gestión de Faenas</h1>
            <p className="text-xs text-slate-500 mt-1">Control de obras, centros de costo y calibración histórica ML</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs w-44">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              disabled={cargando}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer w-full truncate disabled:opacity-60"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="EN_EJECUCION">En Ejecución</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="SUSPENDIDA">Suspendida</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => cargarFormulario(null)}
            disabled={cargando}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#00FF6F]" />
            <span>Nueva Faena</span>
          </button>
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-xs">
          <Building2 className="w-6 h-6 text-slate-500 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Obras</p>
            <p className="text-xl font-black text-slate-800 leading-none mt-0.5">
              {cargando ? '-' : metricas.total}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 flex items-center space-x-3 shadow-xs">
          <Clock className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">En Ejecución</p>
            <p className="text-xl font-black text-emerald-900 leading-none mt-0.5">
              {cargando ? '-' : metricas.ejecucion}
            </p>
          </div>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 flex items-center space-x-3 shadow-xs">
          <PauseCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Suspendidas</p>
            <p className="text-xl font-black text-amber-900 leading-none mt-0.5">
              {cargando ? '-' : metricas.suspendidas}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-xs">
          <CheckCircle className="w-6 h-6 text-slate-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Finalizadas (Dataset)</p>
            <p className="text-xl font-black text-slate-800 leading-none mt-0.5">
              {cargando ? '-' : metricas.finalizadas}
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABLA Y FORMULARIO */}
      <div className="grid grid-cols-12 gap-4 items-start min-w-0">
        
        {/* TABLA LISTADO */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">
              Obras Registradas ({cargando ? '...' : faenasFiltradas.length})
            </span>
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o lugar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#007734]"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs table-fixed">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold w-[40%]">Faena / Mandante</th>
                  <th className="pb-2 font-semibold w-[22%]">Estado</th>
                  <th className="pb-2 font-semibold w-[28%]">Ubicación / Fechas</th>
                  <th className="pb-2 font-semibold w-[10%] text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3"><div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1" /><div className="h-2.5 bg-slate-100 rounded w-1/2" /></td>
                      <td className="py-3"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                      <td className="py-3"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                      <td className="py-3 text-right"><div className="h-6 w-6 bg-slate-100 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : faenasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No se encontraron faenas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  faenasFiltradas.map((f) => {
                    const activo = faenaSeleccionada?.id === f.id;
                    return (
                      <tr 
                        key={f.id}
                        onClick={() => cargarFormulario(f)}
                        className={`cursor-pointer transition-colors ${activo ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-3 truncate pr-2">
                          <p className="text-slate-900 leading-tight truncate font-bold">{f.nombre_faena}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {f.mandante || 'Sin mandante'} {f.codigo_centro_costo ? `• ${f.codigo_centro_costo}` : ''}
                          </p>
                        </td>
                        <td className="py-3">
                          {renderBadgeEstado(f.estado)}
                        </td>
                        <td className="py-3 text-slate-600 truncate font-mono text-[11px]">
                          <p className="truncate flex items-center gap-1 font-sans">
                            <MapPin className="w-3 h-3 text-[#007734] shrink-0" />
                            <span className="truncate">{f.ubicacion}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {f.fecha_inicio}
                              {f.fecha_termino ? ` → ${f.fecha_termino}` : ''}
                            </span>
                          </p>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            title="Eliminar Faena"
                            disabled={eliminandoId === f.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFaenaAEliminar(f);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {eliminandoId === f.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 min-w-0">
          <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 leading-tight">
                {faenaSeleccionada ? 'Modificar Faena' : 'Registrar Nueva Faena'}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {faenaSeleccionada ? faenaSeleccionada.nombre_faena : 'Ingresa los parámetros de la nueva obra'}
              </p>
            </div>
            {faenaSeleccionada && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                  Editando #{faenaSeleccionada.id}
                </span>
                <button
                  type="button"
                  title="Eliminar Faena Seleccionada"
                  onClick={() => setFaenaAEliminar(faenaSeleccionada)}
                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 text-xs flex items-center space-x-2 rounded-r-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold truncate">{error}</span>
            </div>
          )}
          {exito && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 text-xs flex items-center space-x-2 rounded-r-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{exito}</span>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre de la Faena *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Edificio Nativo Bellavista"
                value={nombreFaena}
                onChange={(e) => setNombreFaena(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Mandante
                </label>
                <input
                  type="text"
                  placeholder="Ej: Construk SpA"
                  value={mandante}
                  onChange={(e) => setMandante(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white transition-all"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Centro Costo
                </label>
                <input
                  type="text"
                  placeholder="Ej: CC-114"
                  value={codigoCentroCosto}
                  onChange={(e) => setCodigoCentroCosto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* SECCIÓN GEOGRÁFICA */}
            <div className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-2xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                    Región *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] transition-all cursor-pointer"
                  >
                    {REGIONES_DISPONIBLES.map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                    Comuna *
                  </label>
                  <select
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] transition-all cursor-pointer"
                  >
                    {(DIVISION_CHILE[region] || []).map((com) => (
                      <option key={com} value={com}>{com}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Detalle Dirección / Calle <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 14 Norte, Reñaca, Ruta 62..."
                  value={direccionDetalle}
                  onChange={(e) => setDireccionDetalle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] transition-all"
                />
              </div>

              <p className="text-[10px] text-slate-500 font-mono truncate">
                Ubicación resultante: <strong className="text-slate-800">{ubicacionFinal}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Fecha Inicio *
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white transition-all"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Estado Operativo
                </label>
                <select
                  value={estado}
                  onChange={(e) => {
                    const nuevo = e.target.value as EstadoFaena;
                    setEstado(nuevo);
                    if (nuevo === 'FINALIZADA' && !fechaTermino) {
                      setFechaTermino(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white transition-all cursor-pointer"
                >
                  {ESTADOS_PERMITIDOS.map((est) => (
                    <option key={est.value} value={est.value}>{est.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN TÉCNICA ML CUANDO ESTADO = FINALIZADA (SCRUM-137) */}
            {estado === 'FINALIZADA' && (
              <div className="bg-amber-50/70 border border-amber-300/80 p-4 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center space-x-2 border-b border-amber-200/80 pb-2">
                  <Database className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                    Cierre Técnico para Machine Learning
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Fecha Término *
                    </label>
                    <input
                      type="date"
                      required
                      min={fechaInicio || undefined}
                      value={fechaTermino}
                      onChange={(e) => setFechaTermino(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Tipo de Suelo *
                    </label>
                    <select
                      value={tipoSuelo}
                      onChange={(e) => setTipoSuelo(e.target.value as TipoSuelo)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                    >
                      {TIPOS_SUELO_DISPONIBLES.map((ts) => (
                        <option key={ts} value={ts}>{ts}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Volumen (m³) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      required
                      placeholder="1200"
                      value={volumenObra}
                      onChange={(e) => setVolumenObra(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Dotación Real *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="14"
                      value={dotacionPersonal}
                      onChange={(e) => setDotacionPersonal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Semanas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="8"
                      value={semanasDuracion}
                      onChange={(e) => setSemanasDuracion(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Costo Total Mano de Obra Real ($ CLP) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="18500000"
                    value={costoManoObraReal}
                    onChange={(e) => setCostoManoObraReal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Este valor servirá como target objetivo para calibrar el modelo predictivo de costos.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              {faenaSeleccionada && (
                <button
                  type="button"
                  onClick={() => cargarFormulario(null)}
                  className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
              <button
                type="submit"
                disabled={guardando}
                className={`py-3 bg-[#007734] hover:bg-[#009B43] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer shadow-xs ${
                  faenaSeleccionada ? 'w-2/3' : 'w-full'
                }`}
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{faenaSeleccionada ? 'Guardar Cambios' : 'Crear Faena'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* MODAL CONFIRMACIÓN */}
      {mostrarModalConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#007734] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalConfirmar(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {faenaSeleccionada ? '¿Actualizar Parámetros de Faena?' : '¿Confirmar Registro de Nueva Faena?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {faenaSeleccionada ? (
                  <>
                    Estás a punto de actualizar los antecedentes de la obra <strong className="font-bold text-slate-900">{nombreFaena}</strong> (ID #{faenaSeleccionada.id}).
                  </>
                ) : (
                  <>
                    Se creará un nuevo centro operacional para la obra <strong className="font-bold text-slate-900">{nombreFaena}</strong>.
                  </>
                )}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mandante:</span>
                  <span className="font-semibold text-slate-800">{mandante.trim() || 'Sin Mandante'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Ubicación:</span>
                  <span className="font-bold text-emerald-800">{ubicacionFinal}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Estado Asignado:</span>
                  <div>{renderBadgeEstado(estado)}</div>
                </div>

                {estado === 'FINALIZADA' && (
                  <div className="pt-2 border-t border-amber-200 text-amber-900 font-mono text-[11px] space-y-1">
                    <p className="font-bold font-sans text-amber-950">Datos Históricos ML:</p>
                    <p>• Terreno: {tipoSuelo} | Volumen: {volumenObra} m³</p>
                    <p>• Dotación: {dotacionPersonal} ops | Plazo: {semanasDuracion} sem.</p>
                    <p>• Costo Real: ${Number(costoManoObraReal).toLocaleString('es-CL')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmar(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Volver y Revisar
              </button>
              <button
                type="button"
                onClick={ejecutarGuardarFaena}
                disabled={guardando}
                className="w-1/2 py-2.5 px-4 bg-[#007734] hover:bg-[#009B43] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{faenaSeleccionada ? 'Confirmar y Guardar' : 'Confirmar y Crear'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN */}
      {faenaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setFaenaAEliminar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                ¿Eliminar permanentemente la faena?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás a punto de desvincular la obra <strong className="font-bold text-slate-900">{faenaAEliminar.nombre_faena}</strong>.
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-2xl text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Esta acción es irreversible y eliminará el centro de costo del catálogo activo.</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFaenaAEliminar(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacionFaena}
                disabled={eliminandoId === faenaAEliminar.id}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {eliminandoId === faenaAEliminar.id ? (
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

      {/* MODAL BLOQUEO DT */}
      {alertaBloqueoDT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setAlertaBloqueoDT(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Faena Protegida por Trazabilidad DT
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                La obra <strong className="font-bold text-slate-900">{alertaBloqueoDT.faena.nombre_faena}</strong> no puede ser eliminada porque {alertaBloqueoDT.motivo}
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-[11px] font-medium flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Para dar cumplimiento a la Dirección del Trabajo (DT), se recomienda cambiar su estado operativo a <strong className="font-bold">FINALIZADA</strong> o <strong className="font-bold">SUSPENDIDA</strong> en lugar de suprimir su historial.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAlertaBloqueoDT(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = alertaBloqueoDT.faena;
                  setAlertaBloqueoDT(null);
                  cargarFormulario(target);
                }}
                className="w-1/2 py-2.5 px-4 bg-[#007734] hover:bg-[#009B43] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Editar Estado</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}