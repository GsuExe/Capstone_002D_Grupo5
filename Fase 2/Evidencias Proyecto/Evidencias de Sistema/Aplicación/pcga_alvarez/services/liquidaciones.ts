// services/liquidaciones.ts
import { createClient } from '@/lib/supabase/client';
import { TrabajadorDB, LiquidacionDB } from '@/lib/supabase/types';

const supabase = createClient();

export async function obtenerTrabajadoresActivos(): Promise<TrabajadorDB[]> {
  const { data, error } = await supabase
    .from('trabajadores')
    .select('*')
    .eq('estado', 'ACTIVO')
    .order('apellidos', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function crearLiquidacion(
  liquidacion: Omit<LiquidacionDB, 'id' | 'fecha_emision'>
): Promise<LiquidacionDB> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .insert([liquidacion])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerLiquidacionesTrabajador(trabajadorId: number): Promise<LiquidacionDB[]> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select('*')
    .eq('trabajador_id', trabajadorId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function actualizarLiquidacion(
  id: number,
  liquidacion: Partial<LiquidacionDB>
): Promise<LiquidacionDB> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .update(liquidacion)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ============================================================================
// INTEGRACIÓN CON HU05: IMPORTAR ASISTENCIA DEL MES CERRADO
// ============================================================================
export async function importarAsistenciaCerrada(trabajadorId: number, mes: number, anio: number) {
  const { data, error } = await supabase
    .from('resumenes_asistencia_mensual')
    .select('dias_trabajados, dias_inasistencias, dias_licencias, total_horas_extras')
    .eq('trabajador_id', trabajadorId)
    .eq('mes', mes)
    .eq('anio', anio)
    .maybeSingle();

  if (error) throw new Error('Error al consultar el libro de asistencias cerrado.');
  return data;
}

// ============================================================================
// GENERADOR DE LIQUIDACIÓN DE SUELDO PDF (FORMATO DIRECCIÓN DEL TRABAJO)
// ============================================================================
function escapePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '')
    .replace(/\(/g, '[')
    .replace(/\)/g, ']')
    .replace(/á/g, '\\341')
    .replace(/é/g, '\\351')
    .replace(/í/g, '\\355')
    .replace(/ó/g, '\\363')
    .replace(/ú/g, '\\372')
    .replace(/ñ/g, '\\361')
    .replace(/Á/g, '\\301')
    .replace(/É/g, '\\311')
    .replace(/Í/g, '\\315')
    .replace(/Ó/g, '\\323')
    .replace(/Ú/g, '\\332')
    .replace(/Ñ/g, '\\321')
    .replace(/ü/g, '\\374')
    .replace(/Ü/g, '\\334')
    .replace(/•/g, '-')
    .replace(/°/g, '\\260');
}

export function descargarLiquidacionPDF(liq: LiquidacionDB, t: TrabajadorDB): void {
  const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = NOMBRES_MESES[liq.mes - 1];
  const nombreCompleto = `${t.nombres} ${t.apellidos}`;
  const fechaHoy = new Date().toLocaleDateString('es-CL');

  const fmt = (num: number | null | undefined) => '$' + Number(num || 0).toLocaleString('es-CL');

  const txt = (x: number, y: number, texto: string, bold = false, size = 8, color = '0.2 0.2 0.2') => {
    return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(texto)}) Tj ET\n`;
  };

  // Se añade el 6to parámetro opcional "color" para soportar destacados
  const txtR = (x: number, y: number, texto: string, bold = false, size = 8, color = '0.1 0.1 0.1') => {
    const offset = x - (texto.length * (size * 0.5));
    return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${offset} ${y} Tm (${escapePdfText(texto)}) Tj ET\n`;
  };

  let s = '';

  // Membrete Superior
  s += '0.024 0.106 0.106 rg 40 740 515.28 60 re f\n';
  s += '0 0.467 0.204 RG 2 w 40 738 m 555.28 738 l S\n';
  s += txt(52, 780, 'CARLOS ALBERTO ÁLVAREZ VILLAR E.I.R.L.', true, 13, '1 1 1');
  s += txt(52, 766, `LIQUIDACIÓN DE REMUNERACIONES - ${mesNombre.toUpperCase()} ${liq.anio}`, true, 9.5, '1 1 1');

  // Antecedentes del Empleador
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 690 515.28 35 re B\n';
  s += txt(50, 710, 'Razón Social:', true); s += txt(120, 710, 'Carlos Alberto Álvarez Villar E.I.R.L.');
  s += txt(330, 710, 'RUT Empleador:', true); s += txt(400, 710, '77.974.309-8');
  s += txt(50, 696, 'Domicilio:', true); s += txt(120, 696, 'Quillota, Región de Valparaíso');

  // Antecedentes del Trabajador
  s += txt(40, 674, 'ANTECEDENTES DEL TRABAJADOR', true, 9, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 622 515.28 45 re B\n';
  s += txt(50, 654, 'Nombre:', true); s += txt(100, 654, nombreCompleto);
  s += txt(330, 654, 'RUT:', true); s += txt(370, 654, t.rut);
  s += txt(50, 640, 'Cargo:', true); s += txt(100, 640, t.cargo);
  s += txt(330, 640, 'AFP / Salud:', true); s += txt(390, 640, `${t.afp} / ${t.sistema_salud}`);
  s += txt(50, 628, 'Días Trab:', true); s += txt(100, 628, String(liq.dias_trabajados));
  s += txt(160, 628, 'Días Ausen:', true); s += txt(215, 628, String(liq.dias_ausentes || 0));
  s += txt(270, 628, 'Licencias:', true); s += txt(320, 628, String(liq.dias_licencia || 0));

  // Cajas de Detalles (Izquierda: Haberes, Derecha: Descuentos)
  s += '0.5 w 0.85 0.88 0.9 RG 40 430 250 170 re S\n';
  s += '40 585 250 15 re S\n';
  s += txt(110, 590, 'HABERES IMPONIBLES', true);

  s += '0.5 w 0.85 0.88 0.9 RG 305 430 250 170 re S\n';
  s += '305 585 250 15 re S\n';
  s += txt(375, 590, 'DESCUENTOS LEGALES', true);

  // Detalle Haberes Imponibles
  let yHab = 570;
  s += txt(45, yHab, 'Sueldo Base Mes'); s += txtR(280, yHab, fmt(liq.sueldo_base_mes)); yHab -= 14;
  s += txt(45, yHab, `Horas Extras (${liq.horas_extras_cantidad || 0} hrs)`); s += txtR(280, yHab, fmt(liq.monto_horas_extras)); yHab -= 14;
  s += txt(45, yHab, 'Gratificación Legal'); s += txtR(280, yHab, fmt(liq.gratificacion_legal)); yHab -= 14;
  if (liq.bonos_imponibles && liq.bonos_imponibles > 0) {
    s += txt(45, yHab, 'Bonos Imponibles'); s += txtR(280, yHab, fmt(liq.bonos_imponibles)); yHab -= 14;
  }
  
  // Total Imponible
  s += '40 500 250 15 re S\n';
  s += txt(45, 504, 'TOTAL IMPONIBLE', true); s += txtR(280, 504, fmt(liq.total_imponible), true);

  // Detalle Haberes No Imponibles
  yHab = 480;
  s += txt(45, yHab, 'Colación'); s += txtR(280, yHab, fmt(liq.colacion)); yHab -= 14;
  s += txt(45, yHab, 'Movilización'); s += txtR(280, yHab, fmt(liq.movilizacion)); yHab -= 14;
  if (liq.asignacion_familiar && liq.asignacion_familiar > 0) {
    s += txt(45, yHab, 'Asignación Familiar'); s += txtR(280, yHab, fmt(liq.asignacion_familiar)); yHab -= 14;
  }
  if (liq.viaticos && liq.viaticos > 0) {
    s += txt(45, yHab, 'Viáticos'); s += txtR(280, yHab, fmt(liq.viaticos)); yHab -= 14;
  }

  // Detalle Descuentos
  let yDesc = 570;
  s += txt(310, yDesc, `AFP (${liq.porcentaje_afp}%)`); s += txtR(545, yDesc, fmt(liq.descuento_afp)); yDesc -= 14;
  s += txt(310, yDesc, `Salud (${liq.porcentaje_salud}%)`); s += txtR(545, yDesc, fmt(liq.descuento_salud)); yDesc -= 14;
  s += txt(310, yDesc, 'Seguro Cesantía (AFC)'); s += txtR(545, yDesc, fmt(liq.descuento_cesantia)); yDesc -= 14;
  
  s += '305 500 250 15 re S\n';
  s += txt(310, 504, 'TOTAL LEYES SOCIALES', true); s += txtR(545, 504, fmt(liq.total_descuentos_previsionales), true);

  yDesc = 480;
  if (liq.anticipos && liq.anticipos > 0) {
    s += txt(310, yDesc, 'Anticipos de Sueldo'); s += txtR(545, yDesc, fmt(liq.anticipos)); yDesc -= 14;
  }

  // Resumen Final Totales
  s += '0.96 0.97 0.98 rg 40 390 515.28 25 re f\n';
  s += '0.5 w 0.85 0.88 0.9 RG 40 390 515.28 25 re S\n';
  s += txt(50, 399, 'TOTAL HABERES:', true, 10); s += txtR(200, 399, fmt(liq.total_haberes), true, 10);
  s += txt(220, 399, 'TOTAL DESCUENTOS:', true, 10); s += txtR(380, 399, fmt(liq.total_descuentos), true, 10);
  s += txt(400, 399, 'LÍQUIDO A PAGO:', true, 10, '0 0.467 0.204'); 
  s += txtR(545, 399, fmt(liq.sueldo_liquido), true, 11, '0 0.467 0.204');

  // Firmas
  s += txt(40, 350, 'Recibí conforme de mi empleador la suma líquida indicada, sin tener cargos ni cobros posteriores que realizar.', false, 8, '0.4 0.4 0.4');
  
  s += '0.5 w 0.2 0.2 0.2 RG 70 260 m 240 260 l S\n';
  s += txt(95, 248, 'FIRMA DEL TRABAJADOR', true);
  s += txt(90, 236, `RUT: ${t.rut}`, false, 7.5, '0.4 0.4 0.4');

  s += '0.5 w 0.2 0.2 0.2 RG 350 260 m 520 260 l S\n';
  s += txt(365, 248, 'CARLOS ÁLVAREZ VILLAR E.I.R.L.', true);
  s += txt(395, 236, 'RUT: 77.974.309-8', false, 7.5, '0.4 0.4 0.4');

  // Pie de Página
  s += '0.85 0.88 0.9 RG 0.5 w 40 90 m 555.28 90 l S\n';
  s += txt(40, 76, 'Comprobante legal de pago de remuneraciones, Art. 54 Código del Trabajo.', false, 7, '0.5 0.5 0.5');
  s += txt(40, 64, `Emitido el: ${fechaHoy} - Sistema de Gestión Carlos Álvarez Villar`, false, 7, '0.5 0.5 0.5');

  // Archivo binario PDF 1.4
  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];
  offsets.push(pdf.length); pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  offsets.push(pdf.length); pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  offsets.push(pdf.length); pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  offsets.push(pdf.length); pdf += '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n';
  offsets.push(pdf.length); pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n';
  offsets.push(pdf.length); pdf += `6 0 obj\n<< /Length ${s.length} >>\nstream\n${s}\nendstream\nendobj\n`;

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < 6; i++) { pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`; }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) { bytes[i] = pdf.charCodeAt(i) & 0xff; }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Liquidacion_${mesNombre}_${liq.anio}_${t.apellidos.replace(/\s+/g, '')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}