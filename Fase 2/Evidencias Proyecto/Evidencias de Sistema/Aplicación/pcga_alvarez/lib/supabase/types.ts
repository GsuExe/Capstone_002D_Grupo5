// lib/supabase/types.ts
// =============================================================================
// DEFINICIONES DE TIPOS SUPABASE (16 TABLAS OFICIALES)
// =============================================================================

// -----------------------------------------------------------------------------
// 1. FAENAS
// -----------------------------------------------------------------------------
export type EstadoFaena = 'EN_EJECUCION' | 'FINALIZADA' | 'SUSPENDIDA';

export interface FaenaDB {
  id: number;
  nombre_faena: string;
  mandante?: string | null;
  codigo_centro_costo?: string | null;
  ubicacion: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_termino?: string | null;
  estado?: EstadoFaena;
  created_at?: string;
}
export type Faena = FaenaDB;
export type Faenas = FaenaDB;
export type FaenasDB = FaenaDB;

// -----------------------------------------------------------------------------
// 2. TRABAJADORES
// -----------------------------------------------------------------------------
export type CargoTrabajador =
  | 'Supervisor de Obra'
  | 'Maestro Primera'
  | 'Maestro Segunda'
  | 'Maestro Enfierrador'
  | 'Operador Maquinaria'
  | 'Administrativo / RRHH'
  | 'Contadora'
  | 'Jornal'
  | 'Otro';

export type TipoContrato = 'PLAZO_FIJO' | 'INDEFINIDO' | 'POR_OBRA' | 'HONORARIOS';
export type EstadoTrabajador = 'ACTIVO' | 'INACTIVO' | 'FINIQUITADO';

export interface TrabajadorDB {
  id: number;
  faena_id: number; // Obligatorio
  rut: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  nacionalidad?: string;
  estado_civil?: string;
  telefono: string;
  email?: string | null;
  direccion: string;
  cargo: CargoTrabajador;
  tipo_contrato: TipoContrato;
  fecha_ingreso: string;
  sueldo_base: number;
  afp: string;
  sistema_salud: string;
  tramo_salud?: string | null;
  banco?: string | null;
  tipo_cuenta?: 'Cuenta Corriente' | 'Cuenta Vista' | 'Cuenta RUT' | null;
  numero_cuenta?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_parentesco?: string | null;
  contacto_emergencia_telefono?: string | null;
  estado: EstadoTrabajador;
  created_at?: string;
}
export type Trabajador = TrabajadorDB;
export type Trabajadores = TrabajadorDB;
export type TrabajadoresDB = TrabajadorDB;

// -----------------------------------------------------------------------------
// 3. ASISTENCIAS
// -----------------------------------------------------------------------------
export type EstadoAsistencia = 'PRESENTE' | 'ATRASO' | 'INASISTENCIA' | 'LICENCIA' | 'PERMISO';

export interface AsistenciaDB {
  id?: number;
  trabajador_id: number;
  faena_id: number;
  fecha: string; // YYYY-MM-DD
  hora_entrada: string;
  hora_salida?: string | null;
  estado_asistencia: EstadoAsistencia;
  horas_ordinarias?: number | null;
  horas_extras?: number | null;
  observaciones?: string | null;
  created_at?: string;
}
export type Asistencia = AsistenciaDB;
export type Asistencias = AsistenciaDB;
export type AsistenciasDB = AsistenciaDB;

// -----------------------------------------------------------------------------
// 4. CIERRES MENSUALES
// -----------------------------------------------------------------------------
export interface CierreMensualDB {
  id: number;
  faena_id: number;
  mes: number;
  anio: number;
  esta_cerrado: boolean;
  fecha_cierre?: string | null;
  cerrado_por?: string | null;
  observaciones?: string | null;
  created_at?: string;
}
export type CierreMensual = CierreMensualDB;
export type CierresMensuales = CierreMensualDB;
export type CierresMensualesDB = CierreMensualDB;

// -----------------------------------------------------------------------------
// 5. RESUMENES ASISTENCIA MENSUAL
// -----------------------------------------------------------------------------
export interface ResumenAsistenciaMensualDB {
  id?: number;
  cierre_id: number;
  trabajador_id: number;
  faena_id: number;
  rut_historico: string;
  nombre_historico: string;
  mes: number;
  anio: number;
  dias_trabajados: number;
  dias_inasistencias: number;
  dias_licencias: number;
  dias_permisos: number;
  total_atrasos: number;
  total_horas_extras: number;
  sello_digital_control: string;
  created_at?: string;
}
export type ResumenAsistenciaMensual = ResumenAsistenciaMensualDB;
export type ResumenesAsistenciaMensual = ResumenAsistenciaMensualDB;
export type ResumenesAsistenciaMensualDB = ResumenAsistenciaMensualDB;

// -----------------------------------------------------------------------------
// 6. PARAMETROS LEGALES
// -----------------------------------------------------------------------------
export interface ParametroLegalDB {
  id: number;
  mes: number;
  anio: number;
  valor_uf: number;
  valor_utm: number;
  sueldo_minimo: number;
  tope_imponible_afp_uf: number;
  tope_imponible_cesantia_uf: number;
  tasa_mutual_seguridad: number;
  tasa_sis: number;
  created_at?: string;
}
export type ParametroLegal = ParametroLegalDB;
export type ParametrosLegales = ParametroLegalDB;
export type ParametrosLegalesDB = ParametroLegalDB;

// -----------------------------------------------------------------------------
// 7. TASAS AFP
// -----------------------------------------------------------------------------
export interface TasaAfpDB {
  id: number;
  nombre_afp: string;
  mes: number;
  anio: number;
  tasa_total_dependiente: number;
  comision_afp: number;
  created_at?: string;
}
export type TasaAfp = TasaAfpDB;
export type TasasAfp = TasaAfpDB;
export type TasasAfpDB = TasaAfpDB;

// -----------------------------------------------------------------------------
// 8. LIQUIDACIONES
// -----------------------------------------------------------------------------
export type EstadoPagoLiquidacion = 'PENDIENTE' | 'A_PAGO' | 'PAGADO';

export interface LiquidacionDB {
  id?: number;
  trabajador_id: number;
  faena_id?: number | null;
  mes: number;
  anio: number;
  dias_trabajados: number;
  dias_ausentes?: number;
  dias_licencia?: number;
  sueldo_base_pactado: number;
  sueldo_base_mes: number;
  horas_extras_cantidad?: number;
  monto_horas_extras?: number;
  gratificacion_legal: number;
  bonos_imponibles?: number;
  total_imponible: number;
  colacion?: number;
  movilizacion?: number;
  desgaste_herramientas?: number;
  viaticos?: number;
  asignacion_familiar?: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;
  porcentaje_afp: number;
  descuento_afp: number;
  porcentaje_salud?: number;
  descuento_salud: number;
  descuento_cesantia?: number;
  total_descuentos_previsionales: number;
  anticipos?: number;
  total_descuentos: number;
  sueldo_liquido: number;
  estado_pago?: EstadoPagoLiquidacion;
  archivo_pdf_url?: string;
  fecha_emision?: string;
}
export type Liquidacion = LiquidacionDB;
export type Liquidaciones = LiquidacionDB;
export type LiquidacionesDB = LiquidacionDB;

// -----------------------------------------------------------------------------
// 9. FINIQUITOS
// -----------------------------------------------------------------------------
export interface FiniquitoDB {
  id?: number;
  trabajador_id: number;
  fecha_termino: string;
  causal_termino: string;
  anios_servicio: number;
  monto_indemnizacion_anios?: number;
  monto_aviso_previo?: number;
  monto_feriado_proporcional: number;
  total_finiquito: number;
  archivo_pdf_url?: string;
  firmado?: boolean;
  fecha_calculo?: string;
}
export type Finiquito = FiniquitoDB;
export type Finiquitos = FiniquitoDB;
export type FiniquitosDB = FiniquitoDB;

// -----------------------------------------------------------------------------
// 10. DOCUMENTOS LEGALES
// -----------------------------------------------------------------------------
export type CategoriaDocumento =
  | 'CERTIFICADO_F30'
  | 'CERTIFICADO_ACHS'
  | 'CONTRATO_TRABAJO'
  | 'FINIQUITADO'
  | 'REGLAMENTO_INTERNO'
  | 'ESTATUTO_EMPRESA'
  | 'INICIO_ACTIVIDADES'
  | 'MANDATO_PODER'
  | 'OTROS';

export interface DocumentoLegalDB {
  id?: number;
  titulo: string;
  categoria: CategoriaDocumento;
  trabajador_id?: number | null;
  faena_id?: number | null;
  archivo_url: string;
  tamanio_bytes: number;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  created_at?: string;
}
export type DocumentoLegal = DocumentoLegalDB;
export type DocumentosLegales = DocumentoLegalDB;
export type DocumentosLegalesDB = DocumentoLegalDB;
export type DocumentoDB = DocumentoLegalDB;

// -----------------------------------------------------------------------------
// 11. ALERTAS VENCIMIENTO
// -----------------------------------------------------------------------------
export type TipoAlerta = 'PREVENTIVA_30D' | 'CRITICA_15D' | 'VENCIDA_7D';
export type EstadoAlerta = 'PENDIENTE' | 'REVISADA';

export interface AlertaVencimientoDB {
  id?: number;
  documento_id: number;
  tipo_alerta: TipoAlerta;
  fecha_generada?: string;
  estado?: EstadoAlerta;
}
export type AlertaVencimiento = AlertaVencimientoDB;
export type AlertasVencimiento = AlertaVencimientoDB;
export type AlertasVencimientoDB = AlertaVencimientoDB;

// -----------------------------------------------------------------------------
// 12. POSTULACIONES LABORALES (Cubre el error TS2305 de services/postulaciones.ts)
// -----------------------------------------------------------------------------
export type EstadoPostulacion = 'RECIBIDA' | 'EN_REVISION' | 'CONTRATADO' | 'DESCARTADO';

export interface PostulacionLaboralDB {
  id?: number;
  rut: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  especialidad: string;
  cv_archivo_url: string;
  estado?: EstadoPostulacion;
  created_at?: string;
}
export type PostulacionLaboral = PostulacionLaboralDB;
export type PostulacionesLaborales = PostulacionLaboralDB;
export type PostulacionesLaboralesDB = PostulacionLaboralDB;
export type PostulacionDB = PostulacionLaboralDB; // Importado por services/postulaciones.ts
export type PostulacionesDB = PostulacionLaboralDB;
export type Postulacion = PostulacionLaboralDB;
export type Postulaciones = PostulacionLaboralDB;

// -----------------------------------------------------------------------------
// 13. COTIZACIONES CONTACTO
// -----------------------------------------------------------------------------
export interface CotizacionContactoDB {
  id?: number;
  nombre_cliente: string;
  empresa?: string | null;
  email: string;
  telefono?: string | null;
  tipo_partida: string;
  mensaje: string;
  fecha_envio?: string;
}
export type CotizacionContacto = CotizacionContactoDB;
export type CotizacionesContacto = CotizacionContactoDB;
export type CotizacionesContactoDB = CotizacionContactoDB;
export type CotizacionDB = CotizacionContactoDB;
export type CotizacionesDB = CotizacionContactoDB;

// -----------------------------------------------------------------------------
// 14. PRESUPUESTOS OBRA
// -----------------------------------------------------------------------------
export type EstadoPresupuesto = 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO';

export interface PresupuestoObraDB {
  id?: number;
  numero_presupuesto: string;
  cliente_mandante: string;
  fecha_emision: string;
  m3_excavacion?: number;
  m3_hormigon?: number;
  kg_fierro?: number;
  m2_moldaje?: number;
  monto_neto: number;
  iva: number;
  total_suma_alzada: number;
  estado?: EstadoPresupuesto;
  created_at?: string;
}
export type PresupuestoObra = PresupuestoObraDB;
export type PresupuestosObra = PresupuestoObraDB;
export type PresupuestosObraDB = PresupuestoObraDB;
export type PresupuestoDB = PresupuestoObraDB;
export type PresupuestosDB = PresupuestoObraDB;

// -----------------------------------------------------------------------------
// 15. OBRAS HISTORICAS
// -----------------------------------------------------------------------------
export interface ObraHistoricaDB {
  id?: number;
  nombre_obra: string;
  mandante?: string | null;
  tipo_proyecto: string;
  m2_superficie: number;
  toneladas_acero: number;
  m3_hormigon?: number;
  m2_moldaje?: number;
  cantidad_trabajadores_promedio?: number;
  duracion_semanas_real: number;
  costo_total_real: number;
  es_dato_historico_real?: boolean;
  created_at?: string;
}
export type ObraHistorica = ObraHistoricaDB;
export type ObrasHistoricas = ObraHistoricaDB;
export type ObrasHistoricasDB = ObraHistoricaDB;

// -----------------------------------------------------------------------------
// 16. PREDICCIONES OBRAS
// -----------------------------------------------------------------------------
export interface PrediccionObraDB {
  id?: number;
  usuario_id?: string | null;
  tipo_proyecto: string;
  toneladas_acero: number;
  m2_superficie: number;
  plazo_meses_deseado: number;
  costo_estimado_ml: number;
  duracion_semanas_ml: number;
  nivel_riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  created_at?: string;
}
export type PrediccionObra = PrediccionObraDB;
export type PrediccionesObras = PrediccionObraDB;
export type PrediccionesObrasDB = PrediccionObraDB;