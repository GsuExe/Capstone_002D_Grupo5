'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, HardHat, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !data?.session) {
        setError('Credenciales incorrectas. Verifique su correo y contraseña');
        setCargando(false);
        return;
      }

      // Redirección directa al panel de administración enviando las cookies de sesión
      window.location.href = '/admin';
    } catch {
      setError('Credenciales incorrectas. Verifique su correo y contraseña');
      setCargando(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden selection:bg-[#007734] selection:text-white">
      
      {/* Ocultar el icono nativo de revelar contraseña del navegador (Edge/Chrome) */}
      <style jsx global>{`
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Grilla técnica sutil de fondo */}
      <div 
        className="absolute inset-0 opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#00FF6F 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Resplandor suave corporativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#007734]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Botón de retorno al portal público */}
      <div className="w-full max-w-md mb-4 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-[#00FF6F] transition-colors gap-1.5 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Volver al sitio web principal</span>
        </Link>
      </div>

      {/* Tarjeta de Login */}
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-10">
        
        {/* Cabecera con acento institucional */}
        <div className="pt-8 pb-6 px-8 text-center relative border-b border-slate-800 bg-slate-900/60">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#007734]/20 border border-[#009B43]/50 shadow-inner mb-4">
            <HardHat className="w-7 h-7 text-[#00FF6F]" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#007734]/30 border border-[#00FF6F]/30 rounded-full text-[#A4FFCC] text-[11px] font-bold tracking-wider uppercase mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00FF6F]" />
            <span>Panel de Administración Central</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Gestión de Faenas y Personal
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Carlos Alberto Álvarez Villar E.I.R.L.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="p-8 pt-6 space-y-5">
          
          <div className="min-h-[46px] flex items-center">
            {error ? (
              <div className="w-full bg-rose-950/70 border border-rose-500/50 text-rose-200 px-3.5 py-2.5 rounded-xl flex items-center space-x-2.5 text-xs font-medium animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            ) : (
              <div className="w-full text-center">
                <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                  Introduce tus credenciales para acceder a los módulos de faena
                </p>
              </div>
            )}
          </div>

          {/* Campo: Correo Institucional */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Correo Institucional
            </label>
            <div className="relative group">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-[#00FF6F]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="administrador@alvarezconstruccion.cl"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#007734] focus:ring-2 focus:ring-[#007734]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Campo: Contraseña */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Contraseña de Acceso
            </label>
            <div className="relative group">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-[#00FF6F]" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#007734] focus:ring-2 focus:ring-[#007734]/30 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Submit Institucional */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 bg-[#007734] hover:bg-[#009B43] text-white font-extrabold rounded-xl text-sm shadow-lg shadow-[#007734]/20 hover:shadow-[#007734]/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00FF6F]" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Panel de Control</span>
              )}
            </button>
          </div>
        </form>

        {/* Pie de tarjeta */}
        <div className="bg-slate-950/80 py-3 px-8 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            RUT 77.974.309-8 • Ambiente Protegido SSL/TLS
          </p>
        </div>

      </div>
    </div>
  );
}