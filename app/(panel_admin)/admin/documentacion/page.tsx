'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { 
  Folder, 
  Search, 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  X, 
  Upload, 
  AlertCircle, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  UserCheck, 
  Building2, 
  Loader2,
  FileSpreadsheet,
  FileArchive,
  Eye,
  Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  listarDocumentosGlobales, 
  descargarExpedienteCuadrillaZip, 
  obtenerUrlVisualizacion,
  subirDocumentoLaboral,
  CATEGORIAS_VALIDAS,
  DocumentoRegistro,
  CategoriaDocumento
} from '@/services/documentos';
import { obtenerFaenas } from '@/services/faenas';

export interface DocumentoStorage {
  id: string;
  name: string;
  pathCompleto: string;
  created_at: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
  tipo: 'DOCUMENTO' | 'CV' | 'COTIZACION';
  categoria?: string;
  rut?: string;
}

const BUCKETS = {
  cotizaciones: { bucket: 'cotizaciones', carpeta: 'especificaciones' },
  cvs: { bucket: 'curriculums', carpeta: 'postulaciones' },
  documentos: { bucket: 'documentos_empresa', carpeta: '' },
} as const;

type TipoTab = keyof typeof BUCKETS | 'expedientes';

const CATEGORIAS_DOCUMENTOS = [
  'Certificado F30/F30-1',
  'Contrato de Obra',
  'Finiquito Notarial',
  'Mandato de Representación',
  'Reglamento y Seguridad',
  'Otros Documentos',
];

const CATEGORIAS_CVS = [
  'Postulante General',
  'Operador Maquinaria',
  'Jornal / Albañil',
  'Capataz / Supervisor',
  'Prevencionista de Riesgos',
];

const CATEGORIAS_COTIZACIONES = [
  'Presupuesto Construcción',
  'Especificación Técnica',
  'Cotización Empresa / SAS',
  'Licitación / Mandante',
];

function extraerRut(nombre: string): string | undefined {
  const match = nombre.match(/cv_(\d{7,9})/i);
  if (match) {
    const raw = match[1];
    return raw.slice(0, -1) + '-' + raw.slice(-1);
  }
  return undefined;
}

function deducirCategoria(nombre: string, tipo: keyof typeof BUCKETS): string {
  const nom = nombre.toLowerCase();
  if (tipo === 'documentos') {
    if (nom.includes('f30')) return 'Certificado F30/F30-1';
    if (nom.includes('contrato')) return 'Contrato de Obra';
    if (nom.includes('mandato')) return 'Mandato de Representación';
    if (nom.includes('reglamento')) return 'Reglamento y Seguridad';
    if (nom.includes('finiquito')) return 'Finiquito Notarial';
    return 'Otros Documentos';
  } else if (tipo === 'cvs') {
    if (nom.includes('maquinaria') || nom.includes('retro')) return 'Operador Maquinaria';
    if (nom.includes('prevencion') || nom.includes('seguridad')) return 'Prevencionista de Riesgos';
    if (nom.includes('capataz')) return 'Capataz / Supervisor';
    if (nom.includes('jornal')) return 'Jornal / Albañil';
    return 'Postulante General';
  } else {
    if (nom.includes('construccion')) return 'Presupuesto Construcción';
    if (nom.includes('empresa') || nom.includes('sas')) return 'Cotización Empresa / SAS';
    if (nom.includes('tecnica') || nom.includes('especificacion')) return 'Especificación Técnica';
    return 'Licitación / Mandante';
  }
}

function formatearTamano(bytes?: number): string {
  if (!bytes) return '1.5 MB';
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(0) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const suscribirVacio = () => () => {};
function useClienteMontado() {
  return useSyncExternalStore(
    suscribirVacio,
    () => true,
    () => false
  );
}

export default function DocumentacionPage() {
  const montado = useClienteMontado();
  const supabase = createClient();

  const [tabActiva, setTabActiva] = useState<TipoTab>('expedientes');
  const [archivos, setArchivos] = useState<DocumentoStorage[]>([]);
  const [documentosLaborales, setDocumentosLaborales] = useState<DocumentoRegistro[]>([]);
  const [faenas, setFaenas] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Conteo para las pestañas
  const [totales, setTotales] = useState<Record<TipoTab, number>>({
    cotizaciones: 0,
    cvs: 0,
    documentos: 0,
    expedientes: 0,
  });

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [faenaFiltro, setFaenaFiltro] = useState<string>('');
  const [soloVigentes, setSoloVigentes] = useState<boolean>(true);

  // Modal de Subida
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tituloArchivo, setTituloArchivo] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [faenaModalId, setFaenaModalId] = useState<string>('');
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState<string>('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [fechaEmision, setFechaEmision] = useState('');
  const [requiereVencimiento, setRequiereVencimiento] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Feedback y estados
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoPath, setEliminandoPath] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | number | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Descarga ZIP de cuadrilla
  const [descargandoZip, setDescargandoZip] = useState(false);
  const [progresoZip, setProgresoZip] = useState<{ actual: number; total: number } | null>(null);

  // Modal visor
  const [urlModal, setUrlModal] = useState<string | null>(null);
  const [tituloModal, setTituloModal] = useState<string>('');

  useEffect(() => {
    async function cargarAuxiliares() {
      try {
        const dataFaenas = await obtenerFaenas();
        setFaenas(dataFaenas || []);

        const { data: dataTrab } = await supabase
          .from('trabajadores')
          .select('id, nombres, apellidos, rut, faena_id')
          .order('apellidos');
        setTrabajadores(dataTrab || []);
      } catch (err) {
        console.error('Error cargando datos auxiliares:', err);
      }
    }
    void cargarAuxiliares();
  }, [supabase]);

  const refrescarArchivos = useCallback(async () => {
    try {
      setCargando(true);

      if (tabActiva === 'expedientes') {
        const data = await listarDocumentosGlobales({
          faenaId: faenaFiltro ? parseInt(faenaFiltro) : null,
          categoria: categoriaFiltro === 'Todas' ? undefined : categoriaFiltro,
          termino: busqueda,
          soloVigentes
        });
        setDocumentosLaborales(data);
        setTotales(prev => ({ ...prev, expedientes: data.length }));
      } else {
        const config = BUCKETS[tabActiva];
        const { data, error } = await supabase.storage
          .from(config.bucket)
          .list(config.carpeta, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (error) {
          setArchivos([]);
          return;
        }

        if (data) {
          const filtrados = data.filter(
            (item) => 
              item.name !== '.emptyFolderPlaceholder' && 
              item.name !== 'postulaciones' && 
              item.name !== 'especificaciones'
          );

          const formateados: DocumentoStorage[] = filtrados.map((item) => {
            const pathCompleto = config.carpeta ? `${config.carpeta}/${item.name}` : item.name;
            return {
              id: item.id || item.name,
              name: item.name,
              pathCompleto,
              created_at: item.created_at ? item.created_at.split('T')[0] : '2026-10-10',
              metadata: {
                size: item.metadata?.size || 0,
                mimetype: item.metadata?.mimetype || 'application/pdf',
              },
              tipo: tabActiva === 'documentos' ? 'DOCUMENTO' : tabActiva === 'cvs' ? 'CV' : 'COTIZACION',
              categoria: deducirCategoria(item.name, tabActiva),
              rut: tabActiva === 'cvs' ? extraerRut(item.name) : undefined,
            };
          });

          setArchivos(formateados);
          setTotales((prev) => ({ ...prev, [tabActiva]: formateados.length }));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar archivos.';
      setErrorModal(msg);
    } finally {
      setCargando(false);
    }
  }, [tabActiva, supabase, faenaFiltro, categoriaFiltro, busqueda, soloVigentes]);

  useEffect(() => {
    void refrescarArchivos();
  }, [refrescarArchivos]);

  const categoriasActuales = useMemo(() => {
    if (tabActiva === 'expedientes') return CATEGORIAS_VALIDAS as readonly string[];
    if (tabActiva === 'documentos') return CATEGORIAS_DOCUMENTOS;
    if (tabActiva === 'cvs') return CATEGORIAS_CVS;
    return CATEGORIAS_COTIZACIONES;
  }, [tabActiva]);

  const archivosFiltrados = useMemo(() => {
    if (tabActiva === 'expedientes') return [];
    const texto = busqueda.toLowerCase();
    return archivos.filter((doc) => {
      const coincideTexto = doc.name.toLowerCase().includes(texto) || (doc.rut && doc.rut.includes(texto));
      const coincideCategoria = categoriaFiltro === 'Todas' || doc.categoria === categoriaFiltro;
      return coincideTexto && coincideCategoria;
    });
  }, [archivos, busqueda, categoriaFiltro, tabActiva]);

  const handleAbrirCrear = () => {
    setTituloArchivo('');
    setCategoriaSeleccionada(categoriasActuales[0]);
    setFaenaModalId(faenaFiltro || (faenas[0]?.id ? String(faenas[0].id) : ''));
    setTrabajadorSeleccionadoId('');
    setArchivoSeleccionado(null);
    setFechaEmision('');
    setRequiereVencimiento(false);
    setFechaVencimiento('');
    setErrorModal(null);
    setModalAbierto(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorModal(null);
    const file = e.target.files?.[0];
    if (file) {
      const extensionValida = /\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg|dwg)$/i.test(file.name);
      if (!extensionValida) {
        setErrorModal('Formato no permitido. Solo se aceptan PDF, Word, Excel, Planos o Imágenes.');
        setArchivoSeleccionado(null);
        e.target.value = '';
        return;
      }

      const limiteMB = tabActiva === 'expedientes' ? 25 : tabActiva === 'cvs' ? 5 : 50;
      if (file.size > limiteMB * 1024 * 1024) {
        setErrorModal(`El archivo supera el límite de ${limiteMB} MB.`);
        setArchivoSeleccionado(null);
        e.target.value = '';
        return;
      }

      setArchivoSeleccionado(file);
      if (!tituloArchivo) {
        setTituloArchivo(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubirArchivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      setErrorModal('Selecciona un archivo antes de continuar.');
      return;
    }

    try {
      setSubiendo(true);
      setErrorModal(null);

      const fechaFinalVencimiento = requiereVencimiento && fechaVencimiento ? fechaVencimiento : null;
      let nuevoDocId: number | null = null;

      if (tabActiva === 'expedientes') {
        const trab = trabajadorSeleccionadoId 
          ? trabajadores.find(t => t.id === parseInt(trabajadorSeleccionadoId))
          : null;

        const docCreado = await subirDocumentoLaboral({
          archivo: archivoSeleccionado,
          categoria: categoriaSeleccionada as CategoriaDocumento,
          trabajador_id: trab ? trab.id : null,
          rut_trabajador: trab ? trab.rut : null,
          faena_id: faenaModalId ? parseInt(faenaModalId) : null,
          fecha_emision: fechaEmision || null,
          fecha_vencimiento: fechaFinalVencimiento,
          usuario_email: 'admin@pcga.cl'
        });

        nuevoDocId = docCreado?.id || null;
        setMensajeExito(`Documento "${archivoSeleccionado.name}" indexado en Cloud Storage.`);
      } else {
        const config = BUCKETS[tabActiva];
        const prefijo = categoriaSeleccionada.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const nombreArchivo = `${prefijo}_${Date.now()}_${archivoSeleccionado.name.replace(/\s+/g, '_')}`;
        const pathDestino = config.carpeta ? `${config.carpeta}/${nombreArchivo}` : nombreArchivo;

        const { error: uploadError } = await supabase.storage
          .from(config.bucket)
          .upload(pathDestino, archivoSeleccionado, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw new Error(uploadError.message);
        setMensajeExito(`Archivo "${archivoSeleccionado.name}" guardado exitosamente.`);
      }

      // Registro de alerta y notificación si requiere vencimiento
      if (requiereVencimiento && fechaFinalVencimiento) {
        const hoy = new Date();
        const termino = new Date(fechaFinalVencimiento);
        const diffDays = Math.ceil((termino.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        let tipoAlerta: 'PREVENTIVA_30D' | 'CRITICA_15D' | 'VENCIDA_7D' = 'PREVENTIVA_30D';
        if (diffDays <= 7) tipoAlerta = 'VENCIDA_7D';
        else if (diffDays <= 15) tipoAlerta = 'CRITICA_15D';

        const tituloAlerta = `Vencimiento: ${archivoSeleccionado.name.replace(/\.[^/.]+$/, '')}`;

        const { data: alertaInsertada, error: alertaError } = await supabase
          .from('alertas_vencimiento')
          .insert([{
            origen_entidad: 'DOCUMENTOS',
            entidad_id: nuevoDocId,
            titulo: tituloAlerta,
            tipo_alerta: tipoAlerta,
            estado: 'PENDIENTE',
            fecha_generada: new Date().toISOString()
          }])
          .select()
          .single();

        if (!alertaError) {
          await fetch('/api/notificaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origen_entidad: 'DOCUMENTOS',
              entidad_id: alertaInsertada?.id || 0,
              titulo: tituloAlerta,
              tipo_alerta: tipoAlerta,
              mensaje_adicional: `Nuevo documento en categoría "${categoriaSeleccionada}" con fecha límite el ${fechaFinalVencimiento}.`,
            }),
          }).catch((mailErr) => console.error('Error al emitir notificación por correo:', mailErr));
        }
      }

      setModalAbierto(false);
      setRequiereVencimiento(false);
      setFechaVencimiento('');
      await refrescarArchivos();
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el archivo.';
      setErrorModal(msg);
    } finally {
      setSubiendo(false);
    }
  };

  const handleDescargarCuadrilla = async () => {
    if (!faenaFiltro) {
      alert('Seleccione una faena en el filtro para descargar el expediente consolidado.');
      return;
    }

    const faenaObj = faenas.find(f => f.id === parseInt(faenaFiltro));
    const nombreFaena = faenaObj ? faenaObj.nombre_faena : `Faena_${faenaFiltro}`;

    setDescargandoZip(true);
    setProgresoZip(null);

    try {
      const res = await descargarExpedienteCuadrillaZip(
        parseInt(faenaFiltro),
        nombreFaena,
        'admin@pcga.cl',
        (actual, total) => setProgresoZip({ actual, total })
      );
      setMensajeExito(`¡Expediente descargado! ${res.procesados} de ${res.total} archivos vigentes empaquetados en el ZIP.`);
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al generar el archivo ZIP de la faena.');
    } finally {
      setDescargandoZip(false);
    }
  };

  const handleVerDocumentoLaboral = async (doc: DocumentoRegistro) => {
    setTituloModal(doc.titulo);
    try {
      const url = await obtenerUrlVisualizacion(doc.storage_path, doc.id, 'admin@pcga.cl');
      setUrlModal(url);
    } catch (err: any) {
      alert(err.message || 'No fue posible abrir el documento.');
    }
  };

  const handleEliminarArchivo = async (pathCompleto: string) => {
    if (!confirm('¿Deseas eliminar permanentemente este archivo del servidor de Supabase?')) {
      return;
    }

    try {
      setEliminandoPath(pathCompleto);
      const config = BUCKETS[tabActiva as keyof typeof BUCKETS];
      
      const { error } = await supabase.storage
        .from(config.bucket)
        .remove([pathCompleto]);

      if (error) throw new Error(error.message);

      setMensajeExito('Archivo eliminado permanentemente de Supabase Storage.');
      setArchivos((prev) => prev.filter((a) => a.pathCompleto !== pathCompleto));
      setTotales((prev) => ({ ...prev, [tabActiva]: Math.max(0, prev[tabActiva] - 1) }));
      setTimeout(() => setMensajeExito(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar el archivo. Revisa las políticas RLS.';
      alert(msg);
    } finally {
      setEliminandoPath(null);
    }
  };

  const handleDescargar = async (doc: DocumentoStorage) => {
    try {
      setDescargandoId(doc.id);
      const config = BUCKETS[tabActiva as keyof typeof BUCKETS];

      if (tabActiva === 'cotizaciones') {
        const { data: urlData } = supabase.storage.from(config.bucket).getPublicUrl(doc.pathCompleto);
        if (urlData?.publicUrl) {
          window.open(urlData.publicUrl, '_blank');
          return;
        }
      }
      
      const { data, error } = await supabase.storage
        .from(config.bucket)
        .createSignedUrl(doc.pathCompleto, 120);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'No se pudo generar el enlace seguro.');
      }

      window.open(data.signedUrl, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar el archivo.';
      alert(msg);
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      
      {/* 1. BARRA SUPERIOR ESTRUCTURADA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Título e Indicador */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#007734]/10 text-[#007734] flex items-center justify-center font-bold shrink-0">
              {tabActiva === 'expedientes' ? <FileArchive className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                {tabActiva === 'expedientes' ? 'Expediente y Documentación' : 'Repositorio Documental'}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {tabActiva === 'expedientes' ? (
                  <>Bucket: <span className="text-[#007734] font-bold">expedientes_laborales</span> | Respaldo para auditorías, obras y fiscalización</>
                ) : (
                  <>Bucket: <span className="text-[#007734] font-bold">{BUCKETS[tabActiva].bucket}</span>
                  {BUCKETS[tabActiva].carpeta && <span className="text-slate-400">/{BUCKETS[tabActiva].carpeta}</span>}</>
                )}
              </p>
            </div>
          </div>

          {/* Pestañas de Navegación */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 gap-1 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => { setTabActiva('expedientes'); setCategoriaFiltro('Todas'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                tabActiva === 'expedientes'
                  ? 'bg-[#007734] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Expedientes y Planos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                tabActiva === 'expedientes' ? 'bg-white/20 text-white' : 'bg-[#007734]/10 text-[#007734]'
              }`}>
                {totales.expedientes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setTabActiva('cotizaciones'); setCategoriaFiltro('Todas'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                tabActiva === 'cotizaciones'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#007734]" />
              <span>Cotizaciones</span>
              <span className="text-[10px] bg-[#007734]/10 text-[#007734] px-1.5 py-0.2 rounded font-mono font-bold">
                {totales.cotizaciones}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setTabActiva('cvs'); setCategoriaFiltro('Todas'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                tabActiva === 'cvs'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#007734]" />
              <span>Currículums</span>
              <span className="text-[10px] bg-[#007734]/10 text-[#007734] px-1.5 py-0.2 rounded font-mono font-bold">
                {totales.cvs}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setTabActiva('documentos'); setCategoriaFiltro('Todas'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                tabActiva === 'documentos'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#007734]" />
              <span>Empresa</span>
              <span className="text-[10px] bg-[#007734]/10 text-[#007734] px-1.5 py-0.2 rounded font-mono font-bold">
                {totales.documentos}
              </span>
            </button>
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-50 border-l-4 border-[#007734] text-emerald-900 p-3.5 rounded-r-xl flex items-center space-x-2 text-xs font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#007734] shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* 2. CONSOLA DE FILTROS Y ACCIONES */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
        {/* Fila 1: Filtros de Selección y Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Buscador */}
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={tabActiva === 'expedientes' ? 'Buscar documento, RUT o personal...' : `Buscar en ${BUCKETS[tabActiva].bucket}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007734] font-medium"
            />
          </div>

          {/* Filtro Faena */}
          {tabActiva === 'expedientes' && (
            <div className="lg:col-span-3">
              <select
                value={faenaFiltro}
                onChange={(e) => setFaenaFiltro(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007734]"
              >
                <option value="">Todas las Faenas</option>
                {faenas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre_faena}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Categoría */}
          <div className={tabActiva === 'expedientes' ? 'lg:col-span-3' : 'lg:col-span-5'}>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007734]"
            >
              <option value="Todas">Todas las Categorías</option>
              {categoriasActuales.map((cat, idx) => (
                <option key={idx} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Checkbox Vigentes */}
          {tabActiva === 'expedientes' && (
            <div className="lg:col-span-2 flex items-center justify-start sm:justify-end">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={soloVigentes}
                  onChange={(e) => setSoloVigentes(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007734] focus:ring-[#007734]"
                />
                <span>Solo vigentes</span>
              </label>
            </div>
          )}
        </div>

        {/* Fila 2: Separador y Botones de Acción */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            {tabActiva === 'expedientes' ? (
              <span>Mostrando <strong className="text-slate-800">{documentosLaborales.length}</strong> documentos indexados</span>
            ) : (
              <span>Mostrando <strong className="text-slate-800">{archivosFiltrados.length}</strong> registros</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {tabActiva === 'expedientes' && (
              <button
                type="button"
                onClick={handleDescargarCuadrilla}
                disabled={descargandoZip || !faenaFiltro}
                title={!faenaFiltro ? 'Selecciona una faena para descargar el expediente completo' : 'Descargar ZIP con respaldos vigentes'}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                  !faenaFiltro
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95'
                }`}
              >
                {descargandoZip ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{progresoZip ? `Empaquetando (${progresoZip.actual}/${progresoZip.total})...` : 'Generando ZIP...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Cuadrilla (ZIP)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleAbrirCrear}
              disabled={!montado || cargando}
              className="px-4 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-[#00FF6F]" />
              <span>
                {tabActiva === 'expedientes'
                  ? 'Subir Documento'
                  : tabActiva === 'cotizaciones' 
                  ? 'Subir Cotización' 
                  : tabActiva === 'documentos' 
                  ? 'Subir Archivo' 
                  : 'Subir CV'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE EXPEDIENTES / GRID */}
      {cargando ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#007734] mx-auto" />
          <p className="text-xs font-bold text-slate-600">Sincronizando con Supabase Storage...</p>
        </div>
      ) : tabActiva === 'expedientes' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {documentosLaborales.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileArchive className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron documentos en esta vista.</p>
              <p className="text-xs text-slate-400">Presione &quot;Subir Documento&quot; para registrar contratos, planos o certificados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Documento / Archivo</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Asignado a</th>
                    <th className="px-4 py-3">Faena</th>
                    <th className="px-4 py-3">Emisión / Vence</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentosLaborales.map((doc) => {
                    const trabObj: any = Array.isArray(doc.trabajadores) ? doc.trabajadores[0] : doc.trabajadores;
                    const faenaObj: any = Array.isArray(doc.faenas) ? doc.faenas[0] : doc.faenas;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-[#007734] shrink-0" />
                            <div className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs" title={doc.titulo}>
                              {doc.titulo}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-[#007734]/10 text-[#007734] rounded-full uppercase whitespace-nowrap">
                            {doc.categoria.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.trabajador_id ? (
                            <>
                              <div className="font-bold text-slate-800 whitespace-nowrap">
                                {trabObj ? `${trabObj.nombres} ${trabObj.apellidos}` : 'Operario registrado'}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 font-semibold">{doc.rut_trabajador}</div>
                            </>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              General de Obra
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                          {faenaObj?.nombre_faena || 'General / Central'}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-mono whitespace-nowrap">
                          <div>Emi: {doc.fecha_emision || 'No informada'}</div>
                          <div className="text-slate-400">
                            {doc.fecha_vencimiento ? `Ven: ${doc.fecha_vencimiento}` : 'Sin vencimiento'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc.es_vigente ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Vigente
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">
                              Obsoleto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleVerDocumentoLaboral(doc)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar documento"
                          >
                            <Eye className="w-4 h-4 text-[#007734]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        archivosFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2 shadow-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              No hay archivos en {BUCKETS[tabActiva].bucket}/{BUCKETS[tabActiva].carpeta}.
            </p>
            <p className="text-xs text-slate-400">
              Los archivos subidos se sincronizan directamente con Supabase Storage.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivosFiltrados.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3.5 hover:shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      <Tag className="w-3 h-3 text-[#007734]" />
                      <span>{doc.categoria}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {formatearTamano(doc.metadata?.size)}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                      {doc.rut 
                        ? `Currículum (${doc.rut})` 
                        : doc.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                    </h2>
                    {doc.rut && (
                      <p className="text-[11px] font-mono text-[#007734] font-semibold mt-0.5">
                        RUT: {doc.rut}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Fecha: <strong className="text-slate-800 font-mono">{doc.created_at}</strong></span>
                    </div>

                    <div className="flex items-center space-x-1.5 truncate text-slate-500 font-mono text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDescargar(doc)}
                    disabled={descargandoId === doc.id || eliminandoPath === doc.pathCompleto}
                    className="flex-1 px-3 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {descargandoId === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#00FF6F]" />
                    )}
                    <span>Descargar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEliminarArchivo(doc.pathCompleto)}
                    disabled={eliminandoPath === doc.pathCompleto}
                    title="Eliminar de Supabase Storage"
                    className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {eliminandoPath === doc.pathCompleto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 4. MODAL DE SUBIDA */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#007734]" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  {tabActiva === 'expedientes'
                    ? 'Subir Documento o Plano a Faena'
                    : tabActiva === 'cotizaciones'
                    ? 'Subir a cotizaciones/especificaciones'
                    : tabActiva === 'documentos' 
                    ? 'Subir a documentos_empresa' 
                    : 'Subir a curriculums/postulaciones'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubirArchivo} className="p-6 space-y-4">
              
              {errorModal && (
                <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-800 p-3 rounded-r-lg flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="font-medium">{errorModal}</p>
                </div>
              )}

              {tabActiva === 'expedientes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Faena Asociada *
                    </label>
                    <select
                      required
                      value={faenaModalId}
                      onChange={(e) => setFaenaModalId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                    >
                      <option value="">Seleccione faena...</option>
                      {faenas.map((f) => (
                        <option key={f.id} value={f.id}>{f.nombre_faena}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Operario (Opcional)
                    </label>
                    <select
                      value={trabajadorSeleccionadoId}
                      onChange={(e) => setTrabajadorSeleccionadoId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                    >
                      <option value="">Documento General de Obra</option>
                      {trabajadores.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.apellidos}, {t.nombres} ({t.rut})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categoría Documental *
                </label>
                <select
                  required
                  value={categoriaSeleccionada}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white"
                >
                  {categoriasActuales.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {tabActiva === 'expedientes' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Emisión (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Archivo Adjunto *
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 text-center hover:bg-slate-100/60 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-1">
                    <Upload className="w-6 h-6 text-[#007734]" />
                    {archivoSeleccionado ? (
                      <p className="text-xs font-bold text-slate-900 mt-1">{archivoSeleccionado.name}</p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-800 mt-1">
                          Selecciona archivo (PDF, Word, Excel, Planos, Imagen)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Límite: {tabActiva === 'expedientes' ? '25 MB' : tabActiva === 'cvs' ? '5 MB' : '50 MB'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Control de vencimiento y alertas */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requiereVencimiento}
                    onChange={(e) => setRequiereVencimiento(e.target.checked)}
                    className="w-4 h-4 text-[#007734] rounded border-slate-300 focus:ring-[#007734]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Este documento requiere control de fecha de vencimiento y alertas
                  </span>
                </label>

                {requiereVencimiento && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Fecha de Vencimiento *
                    </label>
                    <input
                      type="date"
                      required={requiereVencimiento}
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                    />
                    <p className="text-[10px] text-slate-500">
                      Se registrará en el sistema de alertas (Preventiva 30d, Crítica 15d o Vencida 7d).
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendo || !archivoSeleccionado}
                  className="px-5 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {subiendo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Almacenando...</span>
                    </>
                  ) : (
                    <span>Guardar Archivo</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. VISOR MODAL */}
      {urlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-[#007734] shrink-0" />
                <h3 className="font-extrabold text-sm text-slate-900 truncate">
                  {tituloModal}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUrlModal(null)}
                className="p-1 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={urlModal}
                className="w-full h-full rounded-lg border-0 bg-white"
                title="Visor de Documento"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}