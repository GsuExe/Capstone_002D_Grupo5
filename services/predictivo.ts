import { createClient } from '@/lib/supabase/client';
import { TipoSuelo } from '@/services/faenas';

export interface ParametrosSimulacionInput {
  tipo_suelo: TipoSuelo;
  volumen_obra: number;
  dotacion_personal: number;
  semanas_duracion: number;
  presupuesto_referencial?: number;
}

export interface VariableImpacto {
  nombre: string;
  ponderacion_porcentaje: number;
  descripcion: string;
}

export interface ResultadoSimulacionML {
  costo_esperado: number;
  costo_minimo: number;
  costo_maximo: number;
  margen_incertidumbre_porcentaje: number;
  costo_promedio_historico: number;
  porcentaje_desvio: number;
  desvio_detectado: boolean;
  alerta_riesgo: boolean;
  mensaje_alerta: string;
  muestras_historicas: number;
  variables_impacto: VariableImpacto[];
}

const FACTORES_SUELO: Record<TipoSuelo, { factor: number; desc: string }> = {
  Arenoso: { factor: 0.92, desc: 'Terreno arenoso de excavación rápida y baja resistencia' },
  Grava: { factor: 1.00, desc: 'Suelo granular estándar con estabilidad normal' },
  Mixto: { factor: 1.06, desc: 'Composición heterogénea con rendimiento medio' },
  Arcilloso: { factor: 1.18, desc: 'Suelo cohesivo que exige entibación y drenaje adicional' },
  Rocoso: { factor: 1.38, desc: 'Alta dureza; requiere maquinaria pesada y mayor cuadrilla' },
};

export function validarParametrosPredictivo(input: ParametrosSimulacionInput): string | null {
  if (!input.tipo_suelo || !FACTORES_SUELO[input.tipo_suelo]) {
    return 'Tipo de suelo inválido. Seleccione una categoría permitida.';
  }
  if (!input.volumen_obra || input.volumen_obra < 10 || input.volumen_obra > 100000) {
    return 'Valor atípico en Volumen de Obra: debe estar entre 10 y 100.000 m³.';
  }
  if (!input.dotacion_personal || input.dotacion_personal < 1 || input.dotacion_personal > 500) {
    return 'Valor atípico en Dotación Personal: debe estar entre 1 y 500 operarios.';
  }
  if (!input.semanas_duracion || input.semanas_duracion < 1 || input.semanas_duracion > 200) {
    return 'Valor atípico en Semanas Estimadas: debe estar entre 1 y 200 semanas.';
  }
  if (input.presupuesto_referencial !== undefined && input.presupuesto_referencial < 0) {
    return 'El presupuesto referencial no puede ser un monto negativo.';
  }
  return null;
}

export async function calcularProyeccionCosto(
  input: ParametrosSimulacionInput
): Promise<ResultadoSimulacionML> {
  const supabase = createClient();

  // Consultar obras históricas finalizadas con datos técnicos reales
  const { data: historico } = await supabase
    .from('faenas')
    .select('volumen_obra, dotacion_personal, semanas_duracion, costo_mano_obra_real')
    .eq('estado', 'FINALIZADA')
    .not('costo_mano_obra_real', 'is', null)
    .gt('volumen_obra', 0);

  let tasaHistoricaM3 = 14200;
  let costoSemanalOperario = 240000;
  const muestras = historico?.length || 0;

  if (historico && historico.length > 0) {
    const sumaCostos = historico.reduce((acc, f) => acc + Number(f.costo_mano_obra_real), 0);
    const sumaVol = historico.reduce((acc, f) => acc + Number(f.volumen_obra), 0);
    const sumaHombreSem = historico.reduce(
      (acc, f) => acc + Number(f.dotacion_personal || 12) * Number(f.semanas_duracion || 8),
      0
    );
    if (sumaVol > 0) tasaHistoricaM3 = sumaCostos / sumaVol;
    if (sumaHombreSem > 0) costoSemanalOperario = (sumaCostos * 0.55) / sumaHombreSem;
  }

  const infoSuelo = FACTORES_SUELO[input.tipo_suelo];
  const costoPorVolumen = input.volumen_obra * (tasaHistoricaM3 * 0.45) * infoSuelo.factor;
  const costoPorCuadrilla =
    input.dotacion_personal *
    input.semanas_duracion *
    costoSemanalOperario *
    (0.85 + (infoSuelo.factor - 1) * 0.65);

  const costoEsperado = Math.round(costoPorVolumen + costoPorCuadrilla);
  const margenIncertidumbre = input.tipo_suelo === 'Rocoso' || input.volumen_obra > 3000 ? 12.5 : 10.0;

  const costoMinimo = Math.round(costoEsperado * (1 - margenIncertidumbre / 100));
  const costoMaximo = Math.round(costoEsperado * (1 + margenIncertidumbre / 100));

  // Comparación contra presupuesto referencial (si se ingresó) o contra el promedio histórico equivalente
  const baseComparacion = input.presupuesto_referencial
    ? Number(input.presupuesto_referencial)
    : Math.round(input.volumen_obra * tasaHistoricaM3);

  const porcentajeDesvio = Number(
    (((costoEsperado - baseComparacion) / baseComparacion) * 100).toFixed(2)
  );
  const alertaRiesgo = porcentajeDesvio >= 15;

  // Ponderación de sensibilidad de variables
  const pesoVolumen = Math.round((costoPorVolumen / costoEsperado) * 100);
  const pesoCuadrilla = Math.max(15, 100 - pesoVolumen);
  const pesoSuelo = Math.min(45, Math.round(Math.abs(infoSuelo.factor - 0.85) * 80));

  const variablesImpacto: VariableImpacto[] = [
    {
      nombre: `Volumen Cubicado (${input.volumen_obra.toLocaleString('es-CL')} m³)`,
      ponderacion_porcentaje: pesoVolumen,
      descripcion: `Incidencia directa de movimiento y partida sobre tasa base histórica.`,
    },
    {
      nombre: `Dotación y Plazo (${input.dotacion_personal} ops / ${input.semanas_duracion} sem)`,
      ponderacion_porcentaje: pesoCuadrilla,
      descripcion: `Equivalente a ${input.dotacion_personal * input.semanas_duracion} semanas-hombre proyectadas.`,
    },
    {
      nombre: `Factor Geotécnico: Suelo ${input.tipo_suelo}`,
      ponderacion_porcentaje: pesoSuelo,
      descripcion: infoSuelo.desc,
    },
  ].sort((a, b) => b.ponderacion_porcentaje - a.ponderacion_porcentaje);

  return {
    costo_esperado: costoEsperado,
    costo_minimo: costoMinimo,
    costo_maximo: costoMaximo,
    margen_incertidumbre_porcentaje: margenIncertidumbre,
    costo_promedio_historico: baseComparacion,
    porcentaje_desvio: porcentajeDesvio,
    desvio_detectado: alertaRiesgo,
    alerta_riesgo: alertaRiesgo,
    mensaje_alerta: `La proyección ($${costoEsperado.toLocaleString('es-CL')}) supera en +${porcentajeDesvio}% el parámetro de referencia ($${baseComparacion.toLocaleString('es-CL')}). Se recomienda revisar cubicación o ajustar contingencia.`,
    muestras_historicas: muestras,
    variables_impacto: variablesImpacto,
  };
}