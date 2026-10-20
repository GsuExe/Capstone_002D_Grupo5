// services/finiquitos.ts
import { createClient } from '@/lib/supabase/client';
import { FiniquitoDB, TrabajadorDB } from '@/lib/supabase/types';

const supabase = createClient();

// ============================================================================
// 1. GESTIÓN Y PERSISTENCIA DE FINIQUITOS
// ============================================================================
export async function crearFiniquito(
  finiquito: Omit<FiniquitoDB, 'id' | 'fecha_calculo'>
): Promise<FiniquitoDB> {
  const { data, error } = await supabase
    .from('finiquitos')
    .insert([finiquito])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerFiniquitosTrabajador(trabajadorId: number): Promise<FiniquitoDB[]> {
  const { data, error } = await supabase
    .from('finiquitos')
    .select('*')
    .eq('trabajador_id', trabajadorId)
    .order('fecha_termino', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function actualizarFiniquito(
  id: number,
  finiquito: Partial<FiniquitoDB>
): Promise<FiniquitoDB> {
  const { data, error } = await supabase
    .from('finiquitos')
    .update(finiquito)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ============================================================================
// 2. VALIDACIÓN PREVISIONAL (HU12 Criterio 2 - Ley Bustos)
// ============================================================================
/**
 * Verifica si el trabajador cuenta con liquidaciones marcadas como "PAGADO" 
 * en el mes inmediatamente anterior a su desvinculación, presumiendo el pago de cotizaciones.
 * (Si no hay registro o está A_PAGO, levantará una alerta preventiva).
 */
export async function verificarEstadoPrevisional(trabajadorId: number, fechaTermino: string): Promise<boolean> {
  const fecha = new Date(fechaTermino);
  let mesAtras = fecha.getMonth(); // 0-based
  let anioAtras = fecha.getFullYear();

  if (mesAtras === 0) {
    mesAtras = 12;
    anioAtras -= 1;
  }

  const { data, error } = await supabase
    .from('liquidaciones')
    .select('estado_pago')
    .eq('trabajador_id', trabajadorId)
    .eq('mes', mesAtras)
    .eq('anio', anioAtras)
    .maybeSingle();

  if (error) return false;
  return data?.estado_pago === 'PAGADO'; // Se presume Ley Bustos al día si la última liquidación está pagada
}


// ============================================================================
// 3. GENERADOR DE PROPUESTA DE FINIQUITO PDF (HU12 Criterio 3)
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
    .replace(/°/g, '\\260');
}

export function descargarFiniquitoPDF(fin: FiniquitoDB, t: TrabajadorDB): void {
  const nombreCompleto = `${t.nombres} ${t.apellidos}`;
  const fechaHoy = new Date().toLocaleDateString('es-CL');
  const fmt = (num: number | null | undefined) => '$' + Number(num || 0).toLocaleString('es-CL');

  const txt = (x: number, y: number, texto: string, bold = false, size = 8, color = '0.2 0.2 0.2') => {
    return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(texto)}) Tj ET\n`;
  };
  const txtR = (x: number, y: number, texto: string, bold = false, size = 8, color = '0.1 0.1 0.1') => {
    const offset = x - (texto.length * (size * 0.5));
    return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${offset} ${y} Tm (${escapePdfText(texto)}) Tj ET\n`;
  };

  let s = '';

  // 1. Membrete Superior
  s += '0.024 0.106 0.106 rg 40 740 515.28 60 re f\n';
  s += '0 0.467 0.204 RG 2 w 40 738 m 555.28 738 l S\n';
  s += txt(52, 780, 'CARLOS ALBERTO ÁLVAREZ VILLAR E.I.R.L.', true, 13, '1 1 1');
  s += txt(52, 766, 'SISTEMA DE GESTIÓN Y CONTROL LABORAL - NORMATIVA DT', false, 8.5, '0 0.98 0.43');
  s += txt(52, 752, 'PROPUESTA OFICIAL DE FINIQUITO DE CONTRATO DE TRABAJO', true, 9.5, '1 1 1');

  // 2. Antecedentes
  s += txt(40, 722, '1. ANTECEDENTES DE LAS PARTES', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 660 515.28 55 re B\n';
  
  s += txt(50, 700, 'Empleador:', true); s += txt(120, 700, 'Carlos Alberto Álvarez Villar E.I.R.L.');
  s += txt(330, 700, 'RUT Empleador:', true); s += txt(410, 700, '77.974.309-8');
  s += txt(50, 685, 'Trabajador:', true); s += txt(120, 685, nombreCompleto);
  s += txt(330, 685, 'RUT Trabajador:', true); s += txt(410, 685, t.rut);
  s += txt(50, 670, 'Cargo:', true); s += txt(120, 670, t.cargo);
  s += txt(330, 670, 'Sueldo Base:', true); s += txt(410, 670, fmt(t.sueldo_base));

  // 3. Condiciones del Término
  s += txt(40, 640, '2. CONDICIONES DEL TÉRMINO LABORAL', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 580 515.28 55 re B\n';
  
  s += txt(50, 620, 'Fecha de Ingreso:', true); s += txt(140, 620, String(t.fecha_ingreso));
  s += txt(330, 620, 'Fecha de Término:', true); s += txt(420, 620, String(fin.fecha_termino));
  s += txt(50, 605, 'Años de Servicio:', true); s += txt(140, 605, String(fin.anios_servicio));
  s += txt(50, 590, 'Causal Legal Aplicada:', true); s += txt(160, 590, String(fin.causal_termino), true, 8, '0 0.467 0.204');

  // 4. Detalle de Cálculo e Indemnizaciones
  s += txt(40, 560, '3. DESGLOSE DE INDEMNIZACIONES Y HABERES ADEUDADOS', true, 9.5, '0 0.467 0.204');
  
  s += '0.5 w 0.85 0.88 0.9 RG 40 440 515.28 110 re S\n';
  let yHab = 535;
  
  s += txt(50, yHab, 'Indemnización por Años de Servicio', true); s += txtR(530, yHab, fmt(fin.monto_indemnizacion_anios)); yHab -= 16;
  s += txt(50, yHab, 'Indemnización Sustitutiva del Aviso Previo', true); s += txtR(530, yHab, fmt(fin.monto_aviso_previo)); yHab -= 16;
  s += txt(50, yHab, 'Feriado Legal y Proporcional Adeudado', true); s += txtR(530, yHab, fmt(fin.monto_feriado_proporcional)); yHab -= 16;
  
  // Total a Pagar
  s += '0.96 0.97 0.98 rg 40 440 515.28 25 re f\n';
  s += '0.5 w 0.85 0.88 0.9 RG 40 440 515.28 25 re S\n';
  s += txt(50, 448, 'TOTAL FINIQUITO A PAGAR:', true, 10); 
  s += txtR(530, 448, fmt(fin.total_finiquito), true, 11, '0 0.467 0.204');

  // 5. Cláusulas y Ley Bustos
  s += txt(40, 410, '4. DECLARACIÓN DE LEY BUSTOS Y RESERVAS DE DERECHOS (ART. 177 CT)', true, 9.5, '0 0.467 0.204');
  s += txt(40, 395, 'El Empleador declara bajo juramento haber enterado y pagado íntegramente las cotizaciones previsionales, de salud y', false, 8, '0.3 0.3 0.3');
  s += txt(40, 385, 'seguro de cesantía del Trabajador hasta el último día del mes anterior al despido (Ley 19.631 "Ley Bustos").', false, 8, '0.3 0.3 0.3');
  s += txt(40, 370, 'El Trabajador declara recibir a su entera satisfacción la suma detallada precedentemente. Ambas partes otorgan el más', false, 8, '0.3 0.3 0.3');
  s += txt(40, 360, 'amplio y completo finiquito, sin que ninguna de ellas quede adeudando suma alguna por concepto de remuneraciones,', false, 8, '0.3 0.3 0.3');
  s += txt(40, 350, 'horas extras, bonos, gratificaciones, feriados o indemnizaciones legales.', false, 8, '0.3 0.3 0.3');

  // Firmas
  s += '0.5 w 0.2 0.2 0.2 RG 70 240 m 240 240 l S\n';
  s += txt(95, 228, 'FIRMA DEL TRABAJADOR', true);
  s += txt(90, 216, `RUT: ${t.rut}`, false, 7.5, '0.4 0.4 0.4');

  s += '0.5 w 0.2 0.2 0.2 RG 350 240 m 520 240 l S\n';
  s += txt(365, 228, 'CARLOS ÁLVAREZ VILLAR E.I.R.L.', true);
  s += txt(395, 216, 'RUT: 77.974.309-8', false, 7.5, '0.4 0.4 0.4');
  s += txt(420, 204, 'Empleador', false, 7.5, '0.4 0.4 0.4');

  // Pie de Página
  s += '0.85 0.88 0.9 RG 0.5 w 40 90 m 555.28 90 l S\n';
  s += txt(40, 76, 'Propuesta legal sujeta a validación y firma ante Ministro de Fe (Notaría, Inspección del Trabajo o DT Electrónica).', false, 7, '0.5 0.5 0.5');
  s += txt(40, 64, `Emitido el: ${fechaHoy} - Sistema de Gestión Operativa Carlos Álvarez Villar`, false, 7, '0.5 0.5 0.5');

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
  a.download = `Propuesta_Finiquito_${t.apellidos.replace(/\s+/g, '')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}