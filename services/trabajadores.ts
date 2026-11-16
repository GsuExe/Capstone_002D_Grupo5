// services/trabajadores.ts
import { createClient } from '@/lib/supabase/client';
import { TrabajadorDB } from '@/lib/supabase/types';

const supabase = createClient();

export type TrabajadorConFaena = TrabajadorDB & {
  faenas?: {
    id: number;
    nombre_faena: string;
    codigo_centro_costo: string | null;
  } | null;
};

// =============================================================================
// 1. REGLAS DE VALIDACIÓN Y FORMATEO DINÁMICO
// =============================================================================

export function formatearRutEnVivo(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${cuerpoConPuntos}-${dv}`;
}

export function validarNombreOApellido(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  const limpio = valor.trim();
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,60}$/;
  return regex.test(limpio);
}

export function validarTelefonoChileno(telefono: string): boolean {
  if (!telefono || typeof telefono !== 'string') return false;
  const limpio = telefono.replace(/[\s\-]/g, '');
  const regexConPrefijo = /^\+569\d{8}$/;
  const regexSinPrefijo = /^9\d{8}$/;
  return regexConPrefijo.test(limpio) || regexSinPrefijo.test(limpio);
}

export function validarRutChileno(rutCompleto: string): boolean {
  if (!rutCompleto || typeof rutCompleto !== 'string') return false;
  const limpio = rutCompleto.replace(/[.\-\s]/g, '').toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);

  return dv === dvEsperado;
}

export async function verificarRutExiste(rut: string, excluirId?: number): Promise<boolean> {
  let consulta = supabase
    .from('trabajadores')
    .select('id')
    .eq('rut', rut);

  if (excluirId) {
    consulta = consulta.neq('id', excluirId);
  }

  const { data, error } = await consulta.maybeSingle();

  if (error) {
    console.error('Error al verificar RUT:', error);
    return false;
  }
  return !!data;
}

// =============================================================================
// 2. CONSULTAS, PERSISTENCIA, ACTUALIZACIÓN Y ELIMINACIÓN
// =============================================================================

export async function obtenerTrabajadores(): Promise<TrabajadorConFaena[]> {
  const { data, error } = await supabase
    .from('trabajadores')
    .select(`
      *,
      faenas (
        id,
        nombre_faena,
        codigo_centro_costo
      )
    `)
    .order('apellidos', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export const obtenerTrabajadoresActivos = obtenerTrabajadores;

export async function obtenerTrabajadoresPorFaena(faenaId: number): Promise<TrabajadorDB[]> {
  const { data, error } = await supabase
    .from('trabajadores')
    .select('*')
    .eq('faena_id', faenaId)
    .eq('estado', 'ACTIVO')
    .order('apellidos', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function crearTrabajador(
  trabajador: Omit<TrabajadorDB, 'id' | 'created_at'>
): Promise<TrabajadorConFaena> {
  if (!trabajador.faena_id) {
    throw new Error('Debe asignar obligatoriamente una faena al trabajador.');
  }

  if (!validarNombreOApellido(trabajador.nombres)) {
    throw new Error('El nombre ingresado no es válido (solo se permiten letras, mínimo 2 caracteres).');
  }
  if (!validarNombreOApellido(trabajador.apellidos)) {
    throw new Error('El apellido ingresado no es válido (solo se permiten letras, mínimo 2 caracteres).');
  }
  if (!validarRutChileno(trabajador.rut)) {
    throw new Error('El RUT ingresado no es válido o ya se encuentra registrado en el sistema');
  }
  if (!validarTelefonoChileno(trabajador.telefono)) {
    throw new Error('El teléfono debe tener formato chileno válido (+569XXXXXXXX o 9XXXXXXXX).');
  }
  if (!trabajador.sueldo_base || trabajador.sueldo_base < 500000) {
    throw new Error('El sueldo base no puede ser inferior al mínimo legal ($500.000).');
  }

  const rutNormalizado = formatearRutEnVivo(trabajador.rut);
  const yaExiste = await verificarRutExiste(rutNormalizado);
  if (yaExiste) {
    throw new Error('El RUT ingresado no es válido o ya se encuentra registrado en el sistema');
  }

  const { data, error } = await supabase
    .from('trabajadores')
    .insert([{
      ...trabajador,
      nombres: trabajador.nombres.trim(),
      apellidos: trabajador.apellidos.trim(),
      rut: rutNormalizado,
    }])
    .select(`
      *,
      faenas (
        id,
        nombre_faena,
        codigo_centro_costo
      )
    `)
    .single();

  if (error) throw new Error(error.message);
  return data as TrabajadorConFaena;
}

export async function actualizarTrabajador(
  id: number,
  datos: Partial<Omit<TrabajadorDB, 'id' | 'created_at'>>
): Promise<TrabajadorConFaena> {
  if (datos.nombres && !validarNombreOApellido(datos.nombres)) {
    throw new Error('El nombre no es válido (solo se permiten letras).');
  }
  if (datos.apellidos && !validarNombreOApellido(datos.apellidos)) {
    throw new Error('El apellido no es válido (solo se permiten letras).');
  }
  if (datos.telefono && !validarTelefonoChileno(datos.telefono)) {
    throw new Error('El teléfono no tiene un formato chileno válido.');
  }

  const { data, error } = await supabase
    .from('trabajadores')
    .update(datos)
    .eq('id', id)
    .select(`
      *,
      faenas (
        id,
        nombre_faena,
        codigo_centro_costo
      )
    `)
    .single();

  if (error) throw new Error(error.message);
  return data as TrabajadorConFaena;
}

export async function eliminarTrabajador(id: number): Promise<void> {
  const { error } = await supabase
    .from('trabajadores')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'No se puede eliminar el operario porque tiene registros históricos vinculados (asistencias o liquidaciones). Se recomienda cambiar su estado a INACTIVO o FINIQUITADO para mantener la trazabilidad ante la DT.'
      );
    }
    throw new Error(error.message);
  }
}

// =============================================================================
// 3. GENERADOR DE FICHA DE INGRESO EN PDF
// =============================================================================

function escapePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '')
    .replace(/\(/g, '[')     .replace(/\)/g, ']')
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

export function descargarFichaIngresoPDF(t: TrabajadorConFaena): void {
  const nombreFaena = t.faenas?.nombre_faena || 'Faena General';
  const centroCosto = t.faenas?.codigo_centro_costo || 'CC-BASE';
  const nombreCompleto = `${t.nombres} ${t.apellidos}`;
  const sueldoFormateado = '$' + Number(t.sueldo_base).toLocaleString('es-CL');
  const fechaHoy = new Date().toLocaleDateString('es-CL');

  const txt = (
    x: number,
    y: number,
    texto: string,
    esNegrita: boolean = false,
    tamano: number = 8,
    color: string = '0.2 0.2 0.2'
  ): string => {
    return `BT /${esNegrita ? 'F2' : 'F1'} ${tamano} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(texto)}) Tj ET\n`;
  };

  let s = '';

  s += '0.024 0.106 0.106 rg 40 740 515.28 60 re f\n';
  s += '0 0.467 0.204 RG 2 w 40 738 m 555.28 738 l S\n';
  s += txt(52, 780, 'CARLOS ALBERTO ÁLVAREZ VILLAR E.I.R.L.', true, 13, '1 1 1');
  s += txt(52, 766, 'SISTEMA DE GESTIÓN Y CONTROL LABORAL - ACREDITACIÓN DT', false, 8.5, '0 0.98 0.43');
  s += txt(52, 752, 'FICHA OFICIAL DE INGRESO Y ANTECEDENTES CONTRACTUALES', true, 9.5, '1 1 1');

  s += txt(40, 722, '1. ANTECEDENTES DEL EMPLEADOR Y FAENA', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 668 515.28 48 re B\n';
  s += txt(50, 702, 'Razón Social:', true, 8, '0.2 0.2 0.2');
  s += txt(115, 702, 'Carlos Alberto Álvarez Villar E.I.R.L.', false, 8, '0.05 0.05 0.05');
  s += txt(330, 702, 'RUT Empleador:', true, 8, '0.2 0.2 0.2');
  s += txt(405, 702, '77.974.309-8', false, 8, '0.05 0.05 0.05');
  s += txt(50, 688, 'Faena Asignada:', true, 8, '0.2 0.2 0.2');
  s += txt(125, 688, nombreFaena, false, 8, '0.05 0.05 0.05');
  s += txt(330, 688, 'Centro de Costo:', true, 8, '0.2 0.2 0.2');
  s += txt(410, 688, centroCosto, false, 8, '0.05 0.05 0.05');
  s += txt(50, 674, 'Casa Matriz:', true, 8, '0.2 0.2 0.2');
  s += txt(115, 674, 'Quillota, Región de Valparaíso', false, 8, '0.05 0.05 0.05');
  s += txt(330, 674, 'Giro Comercial:', true, 8, '0.2 0.2 0.2');
  s += txt(405, 674, 'Construcción y Obras Civiles', false, 8, '0.05 0.05 0.05');

  s += txt(40, 652, '2. ANTECEDENTES PERSONALES DEL OPERARIO', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 598 515.28 48 re B\n';
  s += txt(50, 632, 'Nombre Completo:', true, 8, '0.2 0.2 0.2');
  s += txt(135, 632, nombreCompleto, false, 8, '0.05 0.05 0.05');
  s += txt(330, 632, 'RUT Operario:', true, 8, '0.2 0.2 0.2');
  s += txt(400, 632, t.rut, true, 8, '0.05 0.05 0.05');
  s += txt(50, 618, 'Fecha Nacimiento:', true, 8, '0.2 0.2 0.2');
  s += txt(135, 618, t.fecha_nacimiento || 'No registrada', false, 8, '0.05 0.05 0.05');
  s += txt(330, 618, 'Teléfono:', true, 8, '0.2 0.2 0.2');
  s += txt(380, 618, t.telefono || 'No registra', false, 8, '0.05 0.05 0.05');
  s += txt(50, 604, 'Domicilio:', true, 8, '0.2 0.2 0.2');
  s += txt(100, 604, t.direccion || 'Quillota, Región de Valparaíso', false, 8, '0.05 0.05 0.05');
  s += txt(330, 604, 'Correo:', true, 8, '0.2 0.2 0.2');
  s += txt(375, 604, t.email || 'No registra', false, 8, '0.05 0.05 0.05');

  s += txt(40, 582, '3. ANTECEDENTES CONTRACTUALES Y LABORALES', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 528 515.28 48 re B\n';
  s += txt(50, 562, 'Cargo / Especialidad:', true, 8, '0.2 0.2 0.2');
  s += txt(145, 562, t.cargo, true, 8, '0.05 0.05 0.05');
  s += txt(330, 562, 'Tipo de Contrato:', true, 8, '0.2 0.2 0.2');
  s += txt(405, 562, t.tipo_contrato, false, 8, '0.05 0.05 0.05');
  s += txt(50, 548, 'Fecha de Ingreso:', true, 8, '0.2 0.2 0.2');
  s += txt(130, 548, t.fecha_ingreso, false, 8, '0.05 0.05 0.05');
  s += txt(330, 548, 'Sueldo Base:', true, 8, '0.2 0.2 0.2');
  s += txt(390, 548, `${sueldoFormateado} CLP`, true, 8, '0 0.467 0.204');
  s += txt(50, 534, 'Jornada Laboral:', true, 8, '0.2 0.2 0.2');
  s += txt(125, 534, '44 Horas Semanales - Art. 22 CT', false, 8, '0.05 0.05 0.05');
  s += txt(330, 534, 'Estado Operario:', true, 8, '0.2 0.2 0.2');
  s += txt(405, 534, t.estado, true, 8, '0.05 0.05 0.05');

  s += txt(40, 512, '4. ANTECEDENTES PREVISIONALES Y DE SALUD', true, 9.5, '0 0.467 0.204');
  s += '0.96 0.97 0.98 rg 0.85 0.88 0.9 RG 0.5 w 40 458 515.28 48 re B\n';
  s += txt(50, 492, 'Institución AFP:', true, 8, '0.2 0.2 0.2');
  s += txt(125, 492, `AFP ${t.afp}`, false, 8, '0.05 0.05 0.05');
  s += txt(330, 492, 'Sistema de Salud:', true, 8, '0.2 0.2 0.2');
  s += txt(410, 492, t.sistema_salud, false, 8, '0.05 0.05 0.05');
  s += txt(50, 478, 'Seguro Cesantía:', true, 8, '0.2 0.2 0.2');
  s += txt(125, 478, 'AFC Chile - Ley 19.728', false, 8, '0.05 0.05 0.05');
  s += txt(330, 478, 'Seguro Mutual:', true, 8, '0.2 0.2 0.2');
  s += txt(400, 478, 'Mutual CChC - Ley 16.744', false, 8, '0.05 0.05 0.05');
  s += txt(50, 464, 'Libro Digital DT:', true, 8, '0.2 0.2 0.2');
  s += txt(125, 464, 'Enrolado con Sello Electrónico', false, 8, '0.05 0.05 0.05');
  s += txt(330, 464, 'Fiscalización DT:', true, 8, '0.2 0.2 0.2');
  s += txt(405, 464, 'Conforme a Norma', false, 8, '0.05 0.05 0.05');

  s += txt(40, 442, '5. DECLARACIÓN DE CONFORMIDAD Y FIRMAS', true, 9.5, '0 0.467 0.204');
  s += txt(40, 426, 'El operario declara bajo juramento la total veracidad de los antecedentes personales y previsionales entregados.', false, 7.5, '0.3 0.3 0.3');
  s += txt(40, 415, 'Asimismo, acredita su incorporación efectiva a las faenas de la empresa y su conocimiento del Reglamento Interno.', false, 7.5, '0.3 0.3 0.3');

  s += '0.5 w 0.2 0.2 0.2 RG 70 340 m 240 340 l S\n';
  s += txt(95, 328, 'FIRMA DEL TRABAJADOR', true, 8, '0 0 0');
  s += txt(90, 316, `RUT: ${t.rut}`, false, 7.5, '0.3 0.3 0.3');
  s += txt(80, 304, nombreCompleto, false, 7.5, '0.3 0.3 0.3');

  s += '0.5 w 0.2 0.2 0.2 RG 350 340 m 520 340 l S\n';
  s += txt(365, 328, 'CARLOS ÁLVAREZ VILLAR E.I.R.L.', true, 8, '0 0 0');
  s += txt(395, 316, 'RUT: 77.974.309-8', false, 7.5, '0.3 0.3 0.3');
  s += txt(380, 304, 'Firma / Timbre Empleador', false, 7.5, '0.3 0.3 0.3');

  s += '0.85 0.88 0.9 RG 0.5 w 40 90 m 555.28 90 l S\n';
  s += txt(40, 76, 'Documento legal emitido para acreditación de la Dirección del Trabajo - Art. 183-C Código del Trabajo.', false, 7, '0.5 0.5 0.5');
  s += txt(40, 64, `Constructora Carlos Alberto Álvarez Villar E.I.R.L. - Emisión: ${fechaHoy} - Expediente Digital de Faena`, false, 7, '0.5 0.5 0.5');

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];

  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n';

  offsets.push(pdf.length);
  pdf += `6 0 obj\n<< /Length ${s.length} >>\nstream\n${s}\nendstream\nendobj\n`;

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < 6; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const rutLimpio = t.rut.replace(/[.\-\s]/g, '');
  a.download = `Ficha_Ingreso_${rutLimpio}_${t.apellidos.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}