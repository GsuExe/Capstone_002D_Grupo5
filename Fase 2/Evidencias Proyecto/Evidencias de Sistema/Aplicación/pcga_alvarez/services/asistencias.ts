// services/asistencias.ts
import { createClient } from '@/lib/supabase/client';
import { TrabajadorDB, AsistenciasDB } from '@/lib/supabase/types';

const supabase = createClient();

export interface ConsolidadoTrabajador {
  trabajador_id: number;
  faena_id: number;
  rut: string;
  nombre_completo: string;
  cargo: string;
  mes: number;
  anio: number;
  dias_trabajados: number;
  dias_inasistencias: number;
  dias_licencias: number;
  dias_permisos: number;
  total_atrasos: number;
  total_horas_extras: number;
  sello_digital_control: string;
}

/**
 * Consolida todas las asistencias de un mes específico para una faena.
 * Alimenta tanto el cierre mensual (SCRUM-90), la exportación (SCRUM-91)
 * como la estructura de trazabilidad (SCRUM-92).
 */
export async function consolidarAsistenciasMes(
  faenaId: number,
  mes: number,
  anio: number,
  trabajadores: TrabajadorDB[]
): Promise<ConsolidadoTrabajador[]> {
  // Construir rango de fechas para el mes (ej: 2026-10-01 a 2026-10-31)
  const mesPadded = String(mes).padStart(2, '0');
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fechaDesde = `${anio}-${mesPadded}-01`;
  const fechaHasta = `${anio}-${mesPadded}-${String(ultimoDia).padStart(2, '0')}`;

  // Consultar todas las marcas del mes en la faena
  const { data: marcas, error } = await supabase
    .from('asistencias')
    .select('*')
    .eq('faena_id', faenaId)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta);

  if (error) {
    console.error('Error al obtener asistencias para consolidación:', error);
    throw error;
  }

  const asistencias = marcas || [];

  // Agrupar y consolidar métricas por cada operario
  const consolidados: ConsolidadoTrabajador[] = trabajadores.map((t) => {
    const marcasTrabajador = asistencias.filter(
      (m: AsistenciasDB) => m.trabajador_id === t.id
    );

    let diasTrabajados = 0;
    let diasInasistencias = 0;
    let diasLicencias = 0;
    let diasPermisos = 0;
    let totalAtrasos = 0;
    let totalHorasExtras = 0;

    marcasTrabajador.forEach((m: AsistenciasDB) => {
      switch (m.estado_asistencia) {
        case 'PRESENTE':
          diasTrabajados += 1;
          break;
        case 'ATRASO':
          diasTrabajados += 1;
          totalAtrasos += 1;
          break;
        case 'INASISTENCIA':
          diasInasistencias += 1;
          break;
        case 'LICENCIA':
          diasLicencias += 1;
          break;
        case 'PERMISO':
          diasPermisos += 1;
          break;
      }
      totalHorasExtras += Number(m.horas_extras || 0);
    });

    // Generación de sello de control inmutable DT
    const selloRaw = `${t.rut}-${anio}-${mesPadded}-${diasTrabajados}D-${totalHorasExtras}HE`;
    const selloControl = `DT-${btoa(selloRaw).substring(0, 24)}`;

    return {
      trabajador_id: t.id,
      faena_id: faenaId,
      rut: t.rut,
      nombre_completo: `${t.nombres} ${t.apellidos}`,
      cargo: t.cargo,
      mes,
      anio,
      dias_trabajados: diasTrabajados,
      dias_inasistencias: diasInasistencias,
      dias_licencias: diasLicencias,
      dias_permisos: diasPermisos,
      total_atrasos: totalAtrasos,
      total_horas_extras: totalHorasExtras,
      sello_digital_control: selloControl,
    };
  });

  return consolidados;
}