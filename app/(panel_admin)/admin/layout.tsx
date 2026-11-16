'use client';

import { obtenerNotificacionesRecientes } from '@/services/notificaciones';
import { AlertaVencimientoDB, TipoAlerta, OrigenEntidad } from '@/lib/supabase/types';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Loader2,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notificaciones, setNotificaciones] = useState<AlertaVencimientoDB[]>([]);
  const [cargandoNotis, setCargandoNotis] = useState(true);

  // Estados para el Modal de Creación de Alerta Manual Polimórfica
  const [modalAlertaAbierto, setModalAlertaAbierto] = useState(false);
  const [origenEntidadInput, setOrigenEntidadInput] = useState<OrigenEntidad>('GENERAL');
  const [entidadIdInput, setEntidadIdInput] = useState('');
  const [tituloInput, setTituloInput] = useState('');
  const [tipoAlertaInput, setTipoAlertaInput] = useState<TipoAlerta>('PREVENTIVA_30D');
  const [guardandoAlerta, setGuardandoAlerta] = useState(false);
  const [errorModalAlerta, setErrorModalAlerta] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  async function cargarNotificaciones() {
    try {
      const data = await obtenerNotificacionesRecientes();
      setNotificaciones(data);
    } catch (err) {
      console.error('Error cargando notificaciones', err);
    } finally {
      setCargandoNotis(false);
    }
  }

  useEffect(() => {
    cargarNotificaciones();

    const handleAbrirModal = () => {
      setOrigenEntidadInput('GENERAL');
      setEntidadIdInput('');
      setTituloInput('');
      setTipoAlertaInput('PREVENTIVA_30D');
      setErrorModalAlerta(null);
      setModalAlertaAbierto(true);
    };

    window.addEventListener('abrir-modal-alerta', handleAbrirModal as EventListener);
    return () => {
      window.removeEventListener('abrir-modal-alerta', handleAbrirModal as EventListener);
    };
  }, []);

  const handleCrearAlertaManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tituloInput.trim()) {
      setErrorModalAlerta('El título o descripción de la alerta es obligatorio.');
      return;
    }

    try {
      setGuardandoAlerta(true);
      setErrorModalAlerta(null);

      const entidadIdNum = entidadIdInput ? Number(entidadIdInput) : null;

      const nuevaAlerta = {
        origen_entidad: origenEntidadInput,
        entidad_id: entidadIdNum,
        titulo: tituloInput.trim(),
        tipo_alerta: tipoAlertaInput,
        estado: 'PENDIENTE' as const,
        fecha_generada: new Date().toISOString()
      };

      // 1. Guardar la alerta en la base de datos de Supabase
      const { error } = await supabase
        .from('alertas_vencimiento')
        .insert([nuevaAlerta]);

      if (error) throw new Error(error.message);

// 2. Disparar correo de notificación a la administración usando Nodemailer
const responseMail = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen_entidad: origenEntidadInput,
          entidad_id: entidadIdNum,
          titulo: tituloInput.trim(),
          tipo_alerta: tipoAlertaInput,
          mensaje_adicional: 'Alerta registrada manualmente desde el panel lateral del Dashboard.'
        }),
      });

      // Leer el resultado de la respuesta de forma segura una sola vez
      const dataMail = await responseMail.json().catch(() => ({}));

      if (!responseMail.ok) {
        console.error('El servidor de correo respondió con error:', dataMail.error || dataMail);
      }

      // 3. Limpiar formulario, cerrar modal y refrescar la lista lateral
      setModalAlertaAbierto(false);
      await cargarNotificaciones();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la alerta en Supabase.';
      setErrorModalAlerta(msg);
    } finally {
      setGuardandoAlerta(false);
    }
  };

  // Función para redirigir según el origen de la entidad
  const manejarClickNotificacion = (notif: AlertaVencimientoDB) => {
    if (notif.origen_entidad === 'DOCUMENTOS') {
      router.push('/admin/documentacion');
    } else if (notif.origen_entidad === 'FAENAS') {
      router.push('/admin/faenas');
    } else if (notif.origen_entidad === 'TRABAJADORES') {
      router.push('/admin/trabajadores');
    }
    // Si es 'GENERAL', no realiza redirección o hace una acción opcional.
  };

  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const enlaces = [
    { href: '/admin/faenas', label: 'Gestión de Faenas', icon: Building2 },
    { href: '/admin/asistencia', label: 'Libro de Asistencias', icon: BookOpen },
    { href: '/admin/finiquito_liquidaciones', label: 'Gestión de Remuneraciones', icon: Calculator },
    { href: '/admin/documentacion', label: 'Repositorio y Mandatos', icon: FolderArchive },
    { href: '/admin/trabajadores', label: 'Registro Histórico', icon: Users },
    { href: '/admin/motor_predictivo', label: 'Motor Predictivo de Obras', icon: TrendingUp },
  ];

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
      
      {/* 1. SIDEBAR LATERAL IZQUIERDO */}
      <aside 
        className={`bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20 transition-[width] duration-200 ease-in-out overflow-hidden ${
          colapsado ? 'w-20 min-w-20 max-w-20' : 'w-64 min-w-[16rem] max-w-[16rem]'
        }`}
      >
        {/* ... (Menú lateral) ... */}
        <div className="overflow-hidden">
          <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
            <Link
              href="/admin"
              title="Ir al Panel de Control Principal"
              className={`flex items-center space-x-3 transition-colors hover:bg-slate-800/65 cursor-pointer group rounded-lg p-1.5 overflow-hidden ${
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
                  <Icono className={`w-4 h-4 shrink-0 ${estaActivo ? 'text-[#00FF6F]' : 'text-slate-400 group-hover:text-white'}`} />
                  {!colapsado && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={handleCerrarSesion}
            disabled={cerrandoSesion}
            className="flex items-center h-10 px-3 rounded-lg text-xs font-semibold text-rose-400 hover:bg-slate-800 hover:text-rose-300 transition-colors w-full cursor-pointer disabled:opacity-50 space-x-2.5"
          >
            {cerrandoSesion ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <LogOut className="w-4 h-4 shrink-0" />}
            {!colapsado && <span>{cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>}
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO DERECHO */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <Link href="/admin" className="text-xs font-bold text-[#007734] uppercase tracking-wider hover:underline">
              Sistema de Gestión
            </Link>
            <span className="text-slate-300">•</span>
            <h2 className="text-sm font-extrabold text-slate-800">Módulo de Control</h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-[#00FF6F] flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block leading-tight">Administrador</span>
              <span className="text-[10px] text-slate-500 font-mono">Control de Faena</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden p-5 gap-5 items-stretch min-w-0">
          
          <main className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 p-5 overflow-y-auto min-w-0" style={{ scrollbarGutter: 'stable' }}>
            {children}
          </main>

          {/* LISTADO LATERAL DERECHO CON BOTÓN DE CREACIÓN (+) */}
          {/* LISTADO LATERAL DERECHO CON BOTÓN DE CREACIÓN (+) Y BORRADO */}
<aside className="w-64 min-w-[16rem] max-w-[16rem] bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col shrink-0 overflow-hidden">
  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
    <div className="flex items-center space-x-2">
      <Bell className="w-4 h-4 text-[#007734]" />
      <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Alertas</h3>
    </div>
    <button
      type="button"
      title="Crear Alerta Manual"
      onClick={() => window.dispatchEvent(new CustomEvent('abrir-modal-alerta'))}
      className="p-1 bg-[#007734]/10 hover:bg-[#007734] text-[#007734] hover:text-white rounded-md transition-colors cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5 font-bold" />
    </button>
  </div>

  <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
    {cargandoNotis ? (
      <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
    ) : notificaciones.length === 0 ? (
      <p className="text-xs text-slate-400 text-center py-4">No hay alertas activas</p>
    ) : (
      notificaciones.map((notif) => {
        const claseColor = notif.tipo_alerta === 'VENCIDA_7D' 
          ? 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse' 
          : notif.tipo_alerta === 'CRITICA_15D' 
          ? 'bg-rose-50 text-rose-800 border-rose-200' 
          : 'bg-amber-50 text-amber-900 border-amber-200';

        const esNavegable = notif.origen_entidad !== 'GENERAL';

        return (
          <div 
            key={notif.id} 
            className={`p-3 rounded-lg border transition-all relative group ${claseColor}`}
          >
            {/* Contenido clickeable para navegar */}
            <div 
              onClick={() => manejarClickNotificacion(notif)}
              className={`${esNavegable ? 'cursor-pointer' : ''}`}
              title={esNavegable ? `Ir a módulo de ${notif.origen_entidad.toLowerCase()}` : undefined}
            >
              <div className="flex justify-between items-center pr-5">
                <span className="text-[10px] font-black uppercase bg-white/70 px-1.5 py-0.2 rounded text-slate-700">
                  {notif.origen_entidad}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase">{notif.tipo_alerta}</span>
              </div>
              <p className="text-xs mt-1.5 font-bold text-slate-900 truncate pr-5">
                {notif.titulo || `Entidad ID: #${notif.entidad_id || 'S/N'}`}
              </p>
            </div>

            {/* Botón para eliminar la notificación */}
            <button
              type="button"
              title="Borrar alerta"
              onClick={async (e) => {
                e.stopPropagation(); // Evita que dispare la redirección del div contenedor
                if (!notif.id) return;
                
                // Llamada a Supabase para eliminar
                const { error } = await supabase
                  .from('alertas_vencimiento')
                  .delete()
                  .eq('id', notif.id);

                if (!error) {
                  // Refrescar lista localmente
                  setNotificaciones((prev) => prev.filter((n) => n.id !== notif.id));
                }
              }}
              className="absolute top-2.5 right-2 text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer bg-white/50 hover:bg-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })
    )}
  </div>
</aside>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL FLOTANTE PARA CREAR ALERTA MANUAL POLIMÓRFICA                       */}
      {/* ========================================================================= */}
      {modalAlertaAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#007734]" />
                <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Registrar Alerta Preventiva
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalAlertaAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearAlertaManual} className="p-5 space-y-4">
              {errorModalAlerta && (
                <div className="bg-rose-50 border-l-3 border-rose-500 text-rose-800 p-2.5 rounded-r-lg flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="font-medium">{errorModalAlerta}</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Origen de la Entidad *
                </label>
                <select
                  value={origenEntidadInput}
                  onChange={(e) => setOrigenEntidadInput(e.target.value as OrigenEntidad)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                >
                  <option value="GENERAL">GENERAL (Sin enlace)</option>
                  <option value="FAENAS">FAENAS (Gestión de Faenas)</option>
                  <option value="DOCUMENTOS">DOCUMENTOS (Repositorio)</option>
                  <option value="TRABAJADORES">TRABAJADORES (Registro Histórico)</option>
                </select>
              </div>

              {origenEntidadInput !== 'GENERAL' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ID de la Entidad (Opcional)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 14"
                    value={entidadIdInput}
                    onChange={(e) => setEntidadIdInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título / Descripción de la Alerta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Revisión obligatoria de contratos"
                  value={tituloInput}
                  onChange={(e) => setTituloInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nivel / Tipo de Alerta *
                </label>
                <select
                  value={tipoAlertaInput}
                  onChange={(e) => setTipoAlertaInput(e.target.value as TipoAlerta)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
                >
                  <option value="PREVENTIVA_30D">PREVENTIVA_30D (Amarillo - 30 días)</option>
                  <option value="CRITICA_15D">CRITICA_15D (Rojo - 15 días)</option>
                  <option value="VENCIDA_7D">VENCIDA_7D (Rojo Parpadeante - 7 días o menos)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalAlertaAbierto(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAlerta}
                  className="px-4 py-2 bg-[#007734] hover:bg-[#009B43] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {guardandoAlerta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Guardar Alerta</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}