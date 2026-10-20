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
  FileSpreadsheet
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

type TipoTab = keyof typeof BUCKETS;

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

function deducirCategoria(nombre: string, tipo: TipoTab): string {
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

  const [tabActiva, setTabActiva] = useState<TipoTab>('cotizaciones');
  const [archivos, setArchivos] = useState<DocumentoStorage[]>([]);
  const [cargando, setCargando] = useState(true);

  // Conteo independiente para las pestañas
  const [totales, setTotales] = useState<Record<TipoTab, number>>({
    cotizaciones: 0,
    cvs: 0,
    documentos: 0,
  });

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');

  // Modal de Subida
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tituloArchivo, setTituloArchivo] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  // Feedback y loaders puntuales
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoPath, setEliminandoPath] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Carga reactiva de los archivos de la pestaña seleccionada
  useEffect(() => {
    let activo = true;

    async function obtenerArchivos() {
      try {
        const config = BUCKETS[tabActiva];
        
        const { data, error } = await supabase.storage
          .from(config.bucket)
          .list(config.carpeta, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (!activo) return;

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
            const pathCompleto = config.carpeta 
              ? `${config.carpeta}/${item.name}` 
              : item.name;

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
      } catch (err: unknown) {
        if (activo) {
          const msg = err instanceof Error ? err.message : 'Error al conectar con Supabase Storage.';
          setErrorModal(msg);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void obtenerArchivos();

    return () => {
      activo = false;
    };
  }, [tabActiva, supabase]);

  const refrescarArchivos = useCallback(async () => {
    try {
      setCargando(true);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar archivos.';
      setErrorModal(msg);
    } finally {
      setCargando(false);
    }
  }, [tabActiva, supabase]);

  const categoriasActuales = 
    tabActiva === 'documentos' 
      ? CATEGORIAS_DOCUMENTOS 
      : tabActiva === 'cvs' 
      ? CATEGORIAS_CVS 
      : CATEGORIAS_COTIZACIONES;

  const archivosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return archivos.filter((doc) => {
      const coincideTexto = doc.name.toLowerCase().includes(texto) || (doc.rut && doc.rut.includes(texto));
      const coincideCategoria = categoriaFiltro === 'Todas' || doc.categoria === categoriaFiltro;
      return coincideTexto && coincideCategoria;
    });
  }, [archivos, busqueda, categoriaFiltro]);

  const handleAbrirCrear = () => {
    setTituloArchivo('');
    setCategoriaSeleccionada(categoriasActuales[0]);
    setArchivoSeleccionado(null);
    setErrorModal(null);
    setModalAbierto(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorModal(null);
    const file = e.target.files?.[0];
    if (file) {
      const extensionValida = /\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name);
      if (!extensionValida) {
        setErrorModal('Formato no permitido. Solo se aceptan archivos PDF, Word o Excel.');
        setArchivoSeleccionado(null);
        e.target.value = '';
        return;
      }

      const limiteMB = tabActiva === 'cvs' ? 5 : 50;
      if (file.size > limiteMB * 1024 * 1024) {
        setErrorModal(`El archivo supera el límite de ${limiteMB} MB para este bucket.`);
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
      setModalAbierto(false);
      await refrescarArchivos();
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el archivo.';
      setErrorModal(msg);
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminarArchivo = async (pathCompleto: string) => {
    if (!confirm('¿Deseas eliminar permanentemente este archivo del servidor de Supabase?')) {
      return;
    }

    try {
      setEliminandoPath(pathCompleto);
      const config = BUCKETS[tabActiva];
      
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
      const config = BUCKETS[tabActiva];

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
      
      {/* 1. BARRA SUPERIOR INTEGRADA Y REDIMENSIONADA */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 min-w-0">
        
        {/* Lado Izquierdo: Icono + Título + Bucket */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-[#007734]/10 text-[#007734] flex items-center justify-center font-bold shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div className="min-w-0 truncate">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
              Repositorio y Cotizaciones
            </h1>
            <p className="text-[11px] text-slate-500 font-mono truncate">
              Bucket: <span className="text-[#007734] font-bold">{BUCKETS[tabActiva].bucket}</span>
              {BUCKETS[tabActiva].carpeta && (
                <span className="text-slate-400">/{BUCKETS[tabActiva].carpeta}</span>
              )}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Pestañas calibradas sin desborde */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 gap-1 shrink-0 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={() => { setCargando(true); setTabActiva('cotizaciones'); setCategoriaFiltro('Todas'); }}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
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
            onClick={() => { setCargando(true); setTabActiva('cvs'); setCategoriaFiltro('Todas'); }}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
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
            onClick={() => { setCargando(true); setTabActiva('documentos'); setCategoriaFiltro('Todas'); }}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
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

      {mensajeExito && (
        <div className="bg-emerald-50 border-l-4 border-[#007734] text-emerald-900 p-3.5 rounded-r-xl flex items-center space-x-2 text-xs font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#007734] shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* 2. FILTROS Y BOTÓN DE SUBIDA */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={`Buscar en ${BUCKETS[tabActiva].bucket}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007734] font-medium"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007734]"
            >
              <option value="Todas">Todas las Categorías</option>
              {categoriasActuales.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAbrirCrear}
          disabled={!montado || cargando}
          className="w-full sm:w-auto px-4 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5 text-[#00FF6F]" />
          <span>
            {tabActiva === 'cotizaciones' 
              ? 'Subir Cotización' 
              : tabActiva === 'documentos' 
              ? 'Subir Documento' 
              : 'Subir Currículum'}
          </span>
        </button>
      </div>

      {/* 3. GRID DE TARJETAS */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse h-44">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-5 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded w-full mt-3" />
            </div>
          ))}
        </div>
      ) : archivosFiltrados.length === 0 ? (
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

              {/* Botonera de Acciones con estados de carga */}
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
      )}

      {/* 4. MODAL DE SUBIDA */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#007734]" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  {tabActiva === 'cotizaciones'
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

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Identificador / Referencia *
                </label>
                <input
                  type="text"
                  required
                  value={tituloArchivo}
                  onChange={(e) => setTituloArchivo(e.target.value)}
                  placeholder="Ej: cotiz_empresa_1 o Presupuesto Torre Central"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categoría *
                </label>
                <select
                  required
                  value={categoriaSeleccionada}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734] focus:bg-white"
                >
                  {categoriasActuales.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Archivo Adjunto *
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 text-center hover:bg-slate-100/60 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept={tabActiva === 'cvs' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.xls,.xlsx'}
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
                          Selecciona archivo (PDF, Word, Excel)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Límite: {tabActiva === 'cvs' ? '5 MB' : '50 MB'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
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

    </div>
  );
}