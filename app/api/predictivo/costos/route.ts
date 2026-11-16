import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import {
  ParametrosSimulacionInput,
  validarParametrosPredictivo,
  calcularProyeccionCosto,
} from '@/services/predictivo';

export async function POST(request: Request) {
  try {
    const body: ParametrosSimulacionInput = await request.json();

    const errorValidacion = validarParametrosPredictivo(body);
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 });
    }

    const resultado = await calcularProyeccionCosto(body);

    const supabase = createClient();
    const { error: dbError } = await supabase.from('simulaciones_costos_ml').insert([
      {
        usuario_email: 'pcga.alvarez.test@gmail.com',
        tipo_suelo: body.tipo_suelo,
        volumen_obra: Number(body.volumen_obra),
        dotacion_proyectada: Number(body.dotacion_personal),
        semanas_estimadas: Number(body.semanas_duracion),
        costo_esperado: resultado.costo_esperado,
        costo_minimo: resultado.costo_minimo,
        costo_maximo: resultado.costo_maximo,
        banda_incertidumbre_pct: resultado.margen_incertidumbre_porcentaje,
        costo_promedio_historico: resultado.costo_promedio_historico,
        desviacion_pct: resultado.porcentaje_desvio,
        alerta_riesgo: resultado.alerta_riesgo,
        variables_influyentes: resultado.variables_impacto,
      },
    ]);

    if (dbError) {
      console.error('Error registrando auditoría ML en Supabase:', dbError.message);
    }

    return NextResponse.json(resultado);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}