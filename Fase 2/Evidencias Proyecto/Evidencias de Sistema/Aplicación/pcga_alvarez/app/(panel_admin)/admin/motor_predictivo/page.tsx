'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit,
  Calculator,
  AlertTriangle,
  Sparkles,
  Loader2,
  AlertCircle,
  BarChart3,
  History,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TipoSuelo } from '@/services/faenas';
import { ResultadoSimulacionML } from '@/services/predictivo';

const supabase = createClient();
const TIPOS_SUELO: TipoSuelo[] = ['Rocoso', 'Arcilloso', 'Grava', 'Mixto', 'Arenoso'];

interface HistorialSimulacionDB {
  id: number;
  tipo_suelo: string;
  volumen_obra: number;
  dotacion_proyectada: number;
  semanas_estimadas: number;
  costo_esperado: number;
  desviacion_pct: number;
  alerta_riesgo: boolean;
  created_at: string;
}

export default function MotorPredictivoPage() {
  const [tipoSuelo, setTipoSuelo] = useState<TipoSuelo>('Mixto');
  const [volumenObra, setVolumenObra] = useState<string>('1500');
  const [dotacionPersonal, setDotacionPersonal] = useState<string>('12');
  const [semanasDuracion, setSemanasDuracion] = useState<string>('8');
  const [presupuestoReferencial, setPresupuestoReferencial] = useState<string>('');

  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimulacionML | null>(null);

  const [historial, setHistorial] = useState<HistorialSimulacionDB[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargandoHistorial(true);
      const { data } = await supabase
        .from('simulaciones_costos_ml')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (data) {
        setHistorial(data as HistorialSimulacionDB[]);
      }
    } catch (err) {
      console.error('Error cargando historial de simulaciones:', err);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  const handleCalcular = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCalculando(true);

    try {
      const res = await fetch('/api/predictivo/costos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_suelo: tipoSuelo,
          volumen_obra: Number(volumenObra),
          dotacion_personal: parseInt(dotacionPersonal, 10),
          semanas_duracion: parseInt(semanasDuracion, 10),
          presupuesto_referencial: presupuestoReferencial ? Number(presupuestoReferencial) : undefined,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `La API devolvió un código HTTP ${res.status}. Verifica que exista app/api/predictivo/costos/route.ts.`
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la simulación');

      setResultado(data);
      await cargarHistorial();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al comunicar con el motor ML.');
    } finally {
      setCalculando(false);
    }
  };

  const aplicarPresetDemo = (escenario: 'NORMAL' | 'RIESGO') => {
    setError(null);
    if (escenario === 'NORMAL') {
      setTipoSuelo('Arenoso');
      setVolumenObra('1400');
      setDotacionPersonal('12');
      setSemanasDuracion('8');
      setPresupuestoReferencial('');
    } else {
      setTipoSuelo('Rocoso');
      setVolumenObra('2400');
      setDotacionPersonal('20');
      setSemanasDuracion('15');
      setPresupuestoReferencial('34000000');
    }
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* BARRA SUPERIOR INTEGRADA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">Motor Predictivo de Costos</h1>
            <p className="text-xs text-slate-500 mt-1">
              Estimación predictiva con intervalo de confianza e impacto de variables
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => aplicarPresetDemo('NORMAL')}
            className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Preset Estándar
          </button>
          <button
            type="button"
            onClick={() => aplicarPresetDemo('RIESGO')}
            className="text-[11px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Preset Sobrecosto (&ge;15%)
          </button>
          <span className="text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Modelo Regresivo v2.4
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* FORMULARIO DE INGRESO */}
        <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#007734]" />
              <span>Parámetros de la Obra</span>
            </span>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-r-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCalcular} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Suelo Terreno *
              </label>
              <select
                value={tipoSuelo}
                onChange={(e) => setTipoSuelo(e.target.value as TipoSuelo)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007734]"
              >
                {TIPOS_SUELO.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Volumen Proyectado de Obra (m³) *
              </label>
              <input
                type="number"
                required
                value={volumenObra}
                onChange={(e) => setVolumenObra(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Dotación Personal *
                </label>
                <input
                  type="number"
                  required
                  value={dotacionPersonal}
                  onChange={(e) => setDotacionPersonal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
                  Semanas Estimadas *
                </label>
                <input
                  type="number"
                  required
                  value={semanasDuracion}
                  onChange={(e) => setSemanasDuracion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Presupuesto Referencial ($ CLP) <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="number"
                placeholder="Ej: 25000000"
                value={presupuestoReferencial}
                onChange={(e) => setPresupuestoReferencial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#007734]"
              />
            </div>

            <button
              type="submit"
              disabled={calculando}
              className="w-full py-3 bg-[#007734] hover:bg-[#009B43] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>Calcular Proyección Predictiva</span>
            </button>
          </form>
        </div>

        {/* PANEL DE RESULTADOS Y ALERTAS */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {!resultado ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <BrainCircuit className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Esperando parámetros de simulación</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ingresa las variables de obra a la izquierda para estimar el costo proyectado de mano de obra y verificar alertas por sobrecostos.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {/* Tarjeta de Alerta o Conformidad Presupuestaria */}
              {resultado.alerta_riesgo ? (
                <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-2xl shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Alerta de Riesgo: Sobrecosto Proyectado (+{resultado.porcentaje_desvio}%)</span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">{resultado.mensaje_alerta}</p>
                </div>
              ) : (
                <div className="bg-emerald-50 border-l-4 border-[#007734] p-3.5 rounded-r-2xl shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#007734] shrink-0" />
                    <span>
                      Presupuesto dentro de rango óptimo (Desviación:{' '}
                      {resultado.porcentaje_desvio > 0 ? `+${resultado.porcentaje_desvio}%` : `${resultado.porcentaje_desvio}%`})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#007734] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {resultado.muestras_historicas} obras base
                  </span>
                </div>
              )}

              {/* Tarjeta Principal del Estimador */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Costo Esperado de Mano de Obra
                    </p>
                    <p className="text-3xl font-black text-[#00FF6F] font-mono mt-1">
                      ${resultado.costo_esperado.toLocaleString('es-CL')} CLP
                    </p>
                  </div>
                  <span className="text-[11px] font-bold bg-white/10 text-white px-3 py-1 rounded-full border border-white/20 shrink-0">
                    Banda: &plusmn;{resultado.margen_incertidumbre_porcentaje}%
                  </span>
                </div>

                {/* Intervalo de Confianza */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-800/80 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Límite Mínimo (&minus;{resultado.margen_incertidumbre_porcentaje}%)
                    </p>
                    <p className="text-base font-extrabold text-slate-200 font-mono mt-0.5">
                      ${resultado.costo_minimo.toLocaleString('es-CL')} CLP
                    </p>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Límite Máximo (+{resultado.margen_incertidumbre_porcentaje}%)
                    </p>
                    <p className="text-base font-extrabold text-rose-400 font-mono mt-0.5">
                      ${resultado.costo_maximo.toLocaleString('es-CL')} CLP
                    </p>
                  </div>
                </div>
              </div>

              {/* Variables de Mayor Impacto */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                  <BarChart3 className="w-4 h-4 text-[#007734]" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Variables de Mayor Impacto en la Predicción
                  </h3>
                </div>

                <div className="space-y-3">
                  {resultado.variables_impacto.map((v, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span>{v.nombre}</span>
                        <span className="font-mono text-[#007734]">{v.ponderacion_porcentaje}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#007734] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, v.ponderacion_porcentaje)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">{v.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL DE SIMULACIONES REGISTRADAS EN SUPABASE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#007734]" />
                <span>Auditoría de Simulaciones Recientes</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">{historial.length} registros</span>
            </div>

            {cargandoHistorial ? (
              <div className="py-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#007734] mx-auto" />
              </div>
            ) : historial.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No hay simulaciones guardadas aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 text-[10px] uppercase">
                      <th className="pb-2">Terreno / Volumen</th>
                      <th className="pb-2">Cuadrilla</th>
                      <th className="pb-2">Costo Esperado</th>
                      <th className="pb-2 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historial.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-800">
                          {h.tipo_suelo} •{' '}
                          <span className="font-mono font-normal text-slate-600">
                            {Number(h.volumen_obra).toLocaleString('es-CL')} m³
                          </span>
                        </td>
                        <td className="py-2 font-mono text-[11px] text-slate-600">
                          {h.dotacion_proyectada} ops / {h.semanas_estimadas} sem
                        </td>
                        <td className="py-2 font-mono font-bold text-[#007734]">
                          ${Number(h.costo_esperado).toLocaleString('es-CL')}
                        </td>
                        <td className="py-2 text-right">
                          {h.alerta_riesgo ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Alerta (+{h.desviacion_pct}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Normal ({h.desviacion_pct}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}