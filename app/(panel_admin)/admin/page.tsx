'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  BookOpen, 
  Calculator, 
  FolderArchive, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  HardHat, 
  Calendar, 
  ArrowUpRight,
  FileCheck2,
  MapPin,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { obtenerFaenas } from '@/services/faenas';
import { obtenerTrabajadores } from '@/services/trabajadores';
import { FaenaDB, TrabajadorDB } from '@/lib/supabase/types';

const suscribirVacio = () => () => {};
function useClienteMontado() {
  return useSyncExternalStore(
    suscribirVacio,
    () => true,
    () => false
  );
}

export default function AdminDashboardPage() {
  const montado = useClienteMontado();
  const supabase = createClient();

  const [faenas, setFaenas] = useState<FaenaDB[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorDB[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarMetricas() {
      try {
        const [dataFaenas, dataTrabajadores] = await Promise.all([
          obtenerFaenas(),
          obtenerTrabajadores(),
        ]);

        if (activo) {
          setFaenas((dataFaenas as unknown as FaenaDB[]) || []);
          setTrabajadores(dataTrabajadores || []);
        }
      } catch {
        // Manejo silencioso en carga inicial de dashboard
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarMetricas();

    return () => {
      activo = false;
    };
  }, []);

  const faenasEnEjecucion = faenas.filter((f) => f.estado === 'EN_EJECUCION');
  const fechaHoy = montado ? new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Cargando fecha...';

  return (
    <div className="space-y-5 w-full min-w-0">
      
      {/* 1. BARRA SUPERIOR INTEGRADA DE BIENVENIDA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#007734]/15 border border-[#009B43]/30 text-[#007734] flex items-center justify-center font-bold shrink-0">
            <HardHat className="w-6 h-6 text-[#007734]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                Centro de Operaciones y Control
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                En Línea
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 capitalize font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{fechaHoy}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-semibold">Carlos Alberto Álvarez Villar E.I.R.L.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/asistencia"
            className="px-3.5 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#00FF6F]" />
            <span>Ver Libro de Asistencias</span>
          </Link>
        </div>
      </div>

      {/* 2. TARJETAS DE INDICADORES PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operarios Activos</p>
            <p className="text-2xl font-extrabold text-slate-900 leading-none">
              {cargando ? '-' : trabajadores.length}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Enrolados en faenas</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Obras en Ejecución</p>
            <p className="text-2xl font-extrabold text-emerald-950 leading-none">
              {cargando ? '-' : faenasEnEjecucion.length}
            </p>
            <p className="text-[10px] text-emerald-700 font-medium">De {faenas.length} registradas</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Acreditación F30-1</p>
            <p className="text-2xl font-extrabold text-slate-900 leading-none">Al Día</p>
            <p className="text-[10px] text-slate-500 font-medium">Cumplimiento DT vigente</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Cierre Mensual</p>
            <p className="text-2xl font-extrabold text-amber-950 leading-none">Abierto</p>
            <p className="text-[10px] text-amber-700 font-medium">Período 2026-10 editable</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. ACCESOS DIRECTOS OPERATIVOS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Módulos Administrativos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <Link
            href="/admin/faenas"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <Building2 className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Faenas</p>
              <p className="text-[10px] text-slate-400">Centros de costo</p>
            </div>
          </Link>

          <Link
            href="/admin/asistencia"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Asistencias</p>
              <p className="text-[10px] text-slate-400">Libro digital DT</p>
            </div>
          </Link>

          <Link
            href="/admin/finiquito_liquidaciones"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <Calculator className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Remuneraciones</p>
              <p className="text-[10px] text-slate-400">Sueldos y finiquitos</p>
            </div>
          </Link>

          <Link
            href="/admin/documentacion"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <FolderArchive className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Documentos</p>
              <p className="text-[10px] text-slate-400">Storage y CVs</p>
            </div>
          </Link>

          <Link
            href="/admin/trabajadores"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <Users className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Trabajadores</p>
              <p className="text-[10px] text-slate-400">Dotación histórica</p>
            </div>
          </Link>

          <Link
            href="/admin/motor-predictivo"
            className="p-3.5 bg-white border border-slate-200 hover:border-[#007734] rounded-xl shadow-xs transition-all group flex flex-col justify-between h-24 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-[#007734] transition-colors" />
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007734] transition-colors" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Predictivo</p>
              <p className="text-[10px] text-slate-400">Costos y avances</p>
            </div>
          </Link>

        </div>
      </div>

      {/* 4. SECCIÓN PRINCIPAL EN 2 COLUMNAS (Faenas Activas + Resumen de Asistencia) */}
      <div className="grid grid-cols-12 gap-4 items-start">
        
        {/* COLUMNA 1: Faenas Activas */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#007734]" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Faenas en Operación
              </h2>
            </div>
            <Link
              href="/admin/faenas"
              className="text-[11px] font-bold text-[#007734] hover:underline"
            >
              Gestionar faenas →
            </Link>
          </div>

          {cargando ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : faenas.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No hay faenas registradas en la base de datos.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {faenas.slice(0, 4).map((f) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{f.nombre_faena}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{f.ubicacion}</span>
                      {f.codigo_centro_costo && <span>• {f.codigo_centro_costo}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      f.estado === 'EN_EJECUCION' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : f.estado === 'SUSPENDIDA'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f.estado === 'EN_EJECUCION' ? 'En Ejecución' : f.estado || 'Activo'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{f.fecha_inicio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA 2: Estado de Control y Garantía Laboral */}
        <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Control de Cumplimiento Laboral
            </h2>
            <span className="text-[10px] font-bold bg-[#007734]/10 text-[#007734] px-2 py-0.5 rounded">
              Auditoría DT
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Libro Digital de Asistencias</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Marcaciones con sello inmutable listas para consolidación mensual en formato CSV compatible.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Normativa Previsional y Finiquitos</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cálculo automático de haberes según Art. 161, 163 y 172 del Código del Trabajo chileno.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">Almacenamiento de Acreditaciones</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Expedientes y currículums centralizados bajo Supabase Storage con enlaces firmados.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-mono text-center">
              RUT: 77.974.309-8 • Constructora Carlos Álvarez Villar E.I.R.L.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}