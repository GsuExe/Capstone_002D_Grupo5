// services/notificaciones.ts
import { createClient } from '@/lib/supabase/client';
import { AlertaVencimientoDB, TipoAlerta, OrigenEntidad } from '@/lib/supabase/types';

const supabase = createClient();

/**
 * Obtiene las notificaciones recientes para el panel lateral de forma segura
 */
export async function obtenerNotificacionesRecientes(limite = 15): Promise<AlertaVencimientoDB[]> {
  const { data, error } = await supabase
    .from('alertas_vencimiento')
    .select('*')
    .order('fecha_generada', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Error al obtener notificaciones en el layout:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Función auxiliar para registrar alertas y disparar el correo de forma centralizada
 */
export async function registrarAlertaYNotificar(params: {
  origen_entidad: OrigenEntidad;
  entidad_id?: number | null;
  titulo?: string;
  tipo_alerta: TipoAlerta;
  mensaje_adicional?: string;
}): Promise<boolean> {
  try {
    // 1. Insertar en Supabase
    const { data: alertaInsertada, error } = await supabase
      .from('alertas_vencimiento')
      .insert([{
        origen_entidad: params.origen_entidad,
        entidad_id: params.entidad_id || null,
        titulo: params.titulo || 'Alerta del Sistema',
        tipo_alerta: params.tipo_alerta,
        estado: 'PENDIENTE',
        fecha_generada: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Enviar correo mediante la API de Nodemailer
    await fetch('/api/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origen_entidad: params.origen_entidad,
        entidad_id: alertaInsertada?.id || params.entidad_id || 0,
        titulo: params.titulo,
        tipo_alerta: params.tipo_alerta,
        mensaje_adicional: params.mensaje_adicional || 'Notificación automática del sistema de control.'
      }),
    });

    return true;
  } catch (err) {
    console.error('Error al registrar alerta y enviar correo:', err);
    return false;
  }
}

/**
 * Elimina una notificación de la base de datos por su ID
 */
export async function eliminarNotificacion(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('alertas_vencimiento')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error al eliminar notificación:', error.message);
    return false;
  }

  return true;
}