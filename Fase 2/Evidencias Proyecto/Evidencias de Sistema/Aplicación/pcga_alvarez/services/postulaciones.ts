import { createClient } from '../lib/supabase/client';
import { PostulacionDB } from '../lib/supabase/types';

const supabase = createClient();

export async function subirCVStorage(archivo: File, rut: string): Promise<string> {
  const extension = archivo.name.split('.').pop() || 'pdf';
  const nombreLimpio = `cv_${rut.replace(/[^0-9kK]/g, '')}_${Date.now()}.${extension}`;
  const rutaArchivo = `postulaciones/${nombreLimpio}`;

  // 1. Subir al bucket 'resumes'
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('curriculums')
    .upload(rutaArchivo, archivo, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Error al subir el currículum: ${uploadError.message}`);
  }

  // 2. Obtener URL pública o ruta del archivo
  const { data: urlData } = supabase.storage
    .from('curriculums')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
}

export async function registrarPostulacion(postulacion: Omit<PostulacionDB, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('postulaciones_laborales')
    .insert([postulacion])
    .select();

  if (error) {
    throw new Error(`Error al registrar postulación: ${error.message}`);
  }

  return data;
}