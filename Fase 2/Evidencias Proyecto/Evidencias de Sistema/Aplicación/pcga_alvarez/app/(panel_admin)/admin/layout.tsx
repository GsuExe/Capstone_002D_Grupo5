'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Calculator, 
  FolderArchive, 
  Users, 
  TrendingUp, 
  LogOut, 
  Bell,
  Building2,
  HardHat,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [colapsado, setColapsado] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const enlaces = [
    { href: '/admin/faenas', label: 'Gestión de Faenas', icon: Building2 },
    { href: '/admin/asistencia', label: 'Libro de Asistencias', icon: BookOpen },
    { href: '/admin/finiquito_liquidaciones', label: 'Gestión de Remuneraciones', icon: Calculator },
    { href: '/admin/documentacion', label: 'Repositorio y Mandatos', icon: FolderArchive },
    { href: '/admin/trabajadores', label: 'Registro Histórico', icon: Users },
    { href: '/admin/motor-predictivo', label: 'Motor Predictivo de Obras', icon: TrendingUp },
  ];

  // HU08: Cierre de sesión efectivo (invalida el JWT y borra las cookies)
  const handleCerrarSesion = async () => {
    try {
      setCerrandoSesion(true);
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden text-slate-800 select-none">
      
      {/* 1. SIDEBAR LATERAL IZQUIERDO DESPLEGABLE / OCULTABLE */}
      <aside 
        className={`bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20 transition-[width] duration-200 ease-in-out overflow-hidden ${
          colapsado ? 'w-20 min-w-20 max-w-20' : 'w-64 min-w-[16rem] max-w-[16rem]'
        }`}
      >
        <div className="overflow-hidden">
          {/* Header del Sidebar con botón para colapsar/expandir */}
          <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
            <Link
              href="/admin"
              title="Ir al Panel de Control Principal"
              className={`flex items-center space-x-3 transition-colors hover:bg-slate-800/60 cursor-pointer group rounded-lg p-1.5 overflow-hidden ${
                colapsado ? 'justify-center w-full' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#007734]/20 border border-[#009B43]/40 flex items-center justify-center shrink-0 group-hover:border-[#00FF6F] transition-colors">
                <HardHat className="w-5 h-5 text-[#00FF6F]" />
              </div>
              {!colapsado && (
                <div className="min-w-0 truncate">
                  <h1 className="text-xs font-extrabold tracking-wider text-white uppercase leading-tight truncate group-hover:text-[#00FF6F] transition-colors">
                    Panel Admin
                  </h1>
                  <p className="text-[10px] text-slate-400 truncate">Carlos Álvarez Villar E.I.R.L.</p>
                </div>
              )}
            </Link>

            {!colapsado && (
              <button
                type="button"
                onClick={() => setColapsado(true)}
                title="Ocultar barra lateral"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botón para reabrir cuando el sidebar está colapsado */}
          {colapsado && (
            <div className="pt-2 px-3 flex justify-center">
              <button
                type="button"
                onClick={() => setColapsado(false)}
                title="Expandir barra lateral"
                className="p-1.5 w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-[#00FF6F] flex justify-center items-center cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Menú de Navegación */}
          <nav className="p-3 space-y-1">
            {enlaces.map((item) => {
              const Icono = item.icon;
              const estaActivo = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={colapsado ? item.label : undefined}
                  className={`flex items-center h-10 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap overflow-hidden group relative ${
                    estaActivo
                      ? 'bg-[#007734] text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${colapsado ? 'justify-center' : 'space-x-3'}`}
                >
                  <Icono 
                    className={`w-4 h-4 shrink-0 ${
                      estaActivo ? 'text-[#00FF6F]' : 'text-slate-400 group-hover:text-white'
                    }`} 
                  />
                  {!colapsado && <span className="truncate">{item.label}</span>}

                  {/* Tooltip flotante en modo colapsado */}
                  {colapsado && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer del Sidebar con Logout conectado a Supabase */}
        <div className="p-3 border-t border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={handleCerrarSesion}
            disabled={cerrandoSesion}
            title={colapsado ? 'Cerrar Sesión' : undefined}
            className={`flex items-center h-10 px-3 rounded-lg text-xs font-semibold text-rose-400 hover:bg-slate-800 hover:text-rose-300 transition-colors w-full whitespace-nowrap overflow-hidden group relative cursor-pointer disabled:opacity-50 ${
              colapsado ? 'justify-center' : 'space-x-2.5'
            }`}
          >
            {cerrandoSesion ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-rose-400" />
            ) : (
              <LogOut className="w-4 h-4 shrink-0" />
            )}
            {!colapsado && (
              <span>{cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
            )}

            {colapsado && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-rose-950 text-rose-200 text-[11px] font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-rose-800">
                Cerrar Sesión
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO DERECHO */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Header Superior Delgado */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <Link 
              href="/admin" 
              className="text-xs font-bold text-[#007734] uppercase tracking-wider hover:underline cursor-pointer"
            >
              Sistema de Gestión
            </Link>
            <span className="text-slate-300">•</span>
            <h2 className="text-sm font-extrabold text-slate-800">Módulo de Control</h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-[#00FF6F] flex items-center justify-center font-bold text-xs shadow-xs">
              AD
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block leading-tight">Administrador</span>
              <span className="text-[10px] text-slate-500 font-mono">Control de Faena</span>
            </div>
          </div>
        </header>

        {/* Contenedor Horizontal Central + Notificaciones */}
        <div className="flex-1 flex overflow-hidden p-5 gap-5 items-stretch min-w-0">
          
          {/* Main con scroll reservado estricto */}
          <main 
            className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 p-5 overflow-y-auto min-w-0"
            style={{ scrollbarGutter: 'stable' }}
          >
            {children}
          </main>

          {/* LISTADO LATERAL DERECHO FIJO */}
          <aside className="w-64 min-w-[16rem] max-w-[16rem] bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-3 shrink-0">
              <Bell className="w-4 h-4 text-[#007734]" />
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Notificaciones</h3>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:border-slate-300">
                <p className="text-xs font-bold text-slate-800">Cálculo de Finiquito</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Solicitud enviada para la Obra Norte #402.</p>
                <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">Hace 15 mins</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:border-slate-300">
                <p className="text-xs font-bold text-slate-800">Libro de Asistencias</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Alerta: 3 marcas pendientes de firma digital.</p>
                <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">Hace 1 hora</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:border-slate-300">
                <p className="text-xs font-bold text-slate-800">Motor Predictivo</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Reporte de desviación de costos disponible.</p>
                <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">Hace 3 horas</span>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}