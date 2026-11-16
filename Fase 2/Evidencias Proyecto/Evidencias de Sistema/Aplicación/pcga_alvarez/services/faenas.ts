import { createClient } from '@/lib/supabase/client';
import { FaenaDB } from '@/lib/supabase/types';

const supabase = createClient();

export type TipoSuelo = 'Rocoso' | 'Arcilloso' | 'Arenoso' | 'Grava' | 'Mixto';

export interface CierreTecnicoFaenaInput {
  tipo_suelo: TipoSuelo;
  volumen_obra: number;
  dotacion_personal: number;
  semanas_duracion: number;
  costo_mano_obra_real: number;
  fecha_termino: string;
  observaciones_cierre?: string;
}

export async function obtenerFaenas(): Promise<FaenaDB[]> {
  const { data, error } = await supabase
    .from('faenas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function crearFaena(faena: Omit<FaenaDB, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('faenas')
    .insert([faena])
    .select();

  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarFaena(id: number, faena: Partial<FaenaDB>) {
  const { data, error } = await supabase
    .from('faenas')
    .update(faena)
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Cierre técnico y liquidación histórica para entrenamiento de Machine Learning (SCRUM-137)
 */
export async function finalizarFaenaConDatosHistoricos(id: number, datos: CierreTecnicoFaenaInput) {
  const { data, error } = await supabase
    .from('faenas')
    .update({
      estado: 'FINALIZADA',
      fecha_termino: datos.fecha_termino,
      tipo_suelo: datos.tipo_suelo,
      volumen_obra: datos.volumen_obra,
      dotacion_personal: datos.dotacion_personal,
      semanas_duracion: datos.semanas_duracion,
      costo_mano_obra_real: datos.costo_mano_obra_real,
      observaciones_cierre: datos.observaciones_cierre || null,
    })
    .eq('id', id)
    .select();

  if (error) throw new Error(`Error al registrar cierre histórico: ${error.message}`);
  return data;
}

export async function eliminarFaena(id: number): Promise<void> {
  const { error } = await supabase
    .from('faenas')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Error al eliminar la faena en la base de datos.');
  }
}