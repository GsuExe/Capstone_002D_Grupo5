import { createClient } from '@/lib/supabase/client'
import JSZip from 'jszip'

const supabase = createClient()

export const BUCKET_NAME = 'expedientes_laborales'

export const CATEGORIAS_VALIDAS = [
  'CONTRATO',
  'ANEXO',
  'F30',
  'F30_1',
  'ODI',
  'CERTIFICADO_ANTECEDENTES',
  'PLANO_TECNICO',
  'ESPECIFICACION_TECNICA',
  'CERTIFICADO_CALIDAD',
  'DOCUMENTO_GENERAL'
] as const

export type CategoriaDocumento = typeof CATEGORIAS_VALIDAS[number]

export interface DocumentoLaboralInput {
  archivo: File
  categoria: CategoriaDocumento
  trabajador_id?: number | null
  rut_trabajador?: string | null
  faena_id?: number | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
  usuario_email?: string
}

export interface DocumentoRegistro {
  id: number
  titulo: string
  categoria: string
  trabajador_id: number | null
  rut_trabajador: string | null
  faena_id: number | null
  archivo_url: string
  storage_path: string
  mimetype: string
  tamanio_bytes: number
  fecha_emision: string | null
  fecha_vencimiento: string | null
  es_vigente: boolean
  created_at: string
  trabajadores?: {
    nombres: string
    apellidos: string
  } | {
    nombres: string
    apellidos: string
  }[]
  faenas?: {
    nombre_faena: string
  } | {
    nombre_faena: string
  }[]
}

/**
 * 1. Subir archivo a Cloud Storage y registrar metadatos en base de datos
 */
export async function subirDocumentoLaboral(input: DocumentoLaboralInput) {
  const { archivo, categoria, trabajador_id, rut_trabajador, faena_id, fecha_emision, fecha_vencimiento, usuario_email } = input

  const MAX_SIZE = 25 * 1024 * 1024 // 25 MB máximo
  if (archivo.size > MAX_SIZE) {
    throw new Error('El archivo excede el tamaño máximo permitido (25 MB).')
  }

  const extension = archivo.name.split('.').pop()?.toLowerCase() || 'pdf'
  const timestamp = Date.now()
  
  // Si tiene RUT se organiza en su carpeta, si es general de faena va a faena_[id]
  const carpetaDestino = rut_trabajador 
    ? rut_trabajador.replace(/[^0-9kK]/g, '') 
    : faena_id 
    ? `faena_${faena_id}` 
    : 'general'

  const storagePath = `${carpetaDestino}/${categoria}_${timestamp}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, archivo, {
      contentType: archivo.type || 'application/pdf',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`Error al subir a Cloud Storage: ${uploadError.message}`)
  }

  // Si es un documento individual de renovación, marcar obsoletos anteriores
  if (trabajador_id && ['CONTRATO', 'F30', 'F30_1', 'ODI'].includes(categoria)) {
    await supabase
      .from('documentos_legales')
      .update({ es_vigente: false, updated_at: new Date().toISOString() })
      .eq('trabajador_id', trabajador_id)
      .eq('categoria', categoria)
  }

  const { data: docData, error: dbError } = await supabase
    .from('documentos_legales')
    .insert([
      {
        titulo: archivo.name,
        categoria,
        trabajador_id: trabajador_id || null,
        rut_trabajador: rut_trabajador || null,
        faena_id: faena_id || null,
        archivo_url: storagePath,
        storage_path: storagePath,
        mimetype: archivo.type || 'application/pdf',
        tamanio_bytes: archivo.size,
        fecha_emision: fecha_emision || null,
        fecha_vencimiento: fecha_vencimiento || null,
        es_vigente: true
      }
    ])
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath])
    throw new Error(`Error al guardar en base de datos: ${dbError.message}`)
  }

  await supabase.from('auditoria_documentos').insert([
    {
      documento_id: docData.id,
      accion: 'CARGA',
      usuario_email: usuario_email || 'admin@pcga.cl',
      detalle: {
        categoria,
        rut: rut_trabajador || 'DOCUMENTO_GENERAL',
        faena_id: faena_id || null,
        nombre_archivo: archivo.name,
        bytes: archivo.size
      }
    }
  ])

  return docData
}

/**
 * 2. Obtener URL de visualización privada con firma temporal (15 minutos)
 */
export async function obtenerUrlVisualizacion(storagePath: string, documentoId?: number, usuarioEmail?: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 900)

  if (error || !data?.signedUrl) {
    throw new Error('No fue posible generar el enlace seguro de visualización.')
  }

  if (documentoId) {
    await supabase.from('auditoria_documentos').insert([
      {
        documento_id: documentoId,
        accion: 'VISUALIZACION',
        usuario_email: usuarioEmail || 'admin@pcga.cl',
        detalle: { storage_path: storagePath }
      }
    ])
  }

  return data.signedUrl
}

/**
 * 3. Listar documentos por trabajador (Ficha digital individual)
 */
export async function listarDocumentosPorTrabajador(trabajadorId: number) {
  const { data, error } = await supabase
    .from('documentos_legales')
    .select('*')
    .eq('trabajador_id', trabajadorId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as DocumentoRegistro[]
}

/**
 * 4. Listar documentos con filtros globales (Consola general)
 */
export async function listarDocumentosGlobales(filtros: {
  faenaId?: number | null
  categoria?: string
  termino?: string
  soloVigentes?: boolean
}) {
  let query = supabase
    .from('documentos_legales')
    .select(`
      *,
      trabajadores (nombres, apellidos, rut, faena_id),
      faenas (nombre_faena)
    `)
    .order('created_at', { ascending: false })

  if (filtros.faenaId) {
    query = query.eq('faena_id', filtros.faenaId)
  }

  if (filtros.categoria && filtros.categoria !== 'Todas') {
    query = query.eq('categoria', filtros.categoria)
  }

  if (filtros.soloVigentes) {
    query = query.eq('es_vigente', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  let resultados = (data || []) as DocumentoRegistro[]

  if (filtros.termino && filtros.termino.trim() !== '') {
    const t = filtros.termino.toLowerCase()
    resultados = resultados.filter(doc => {
      const trabajadorObj: any = Array.isArray(doc.trabajadores) 
        ? doc.trabajadores[0] 
        : doc.trabajadores

      return (
        doc.rut_trabajador?.toLowerCase().includes(t) ||
        doc.titulo?.toLowerCase().includes(t) ||
        trabajadorObj?.nombres?.toLowerCase().includes(t) ||
        trabajadorObj?.apellidos?.toLowerCase().includes(t)
      )
    })
  }

  return resultados
}

/**
 * 5. Generar paquete comprimido ZIP de faena (Personal y Documentos Generales)
 */
export async function descargarExpedienteCuadrillaZip(
  faenaId: number,
  nombreFaena: string,
  usuarioEmail: string = 'admin@pcga.cl',
  onProgress?: (actual: number, total: number) => void
) {
  const { data: docs, error } = await supabase
    .from('documentos_legales')
    .select(`
      id,
      titulo,
      categoria,
      storage_path,
      rut_trabajador,
      trabajadores (nombres, apellidos)
    `)
    .eq('faena_id', faenaId)
    .eq('es_vigente', true)

  if (error) throw new Error(`Error al consultar documentos de la faena: ${error.message}`)

  if (!docs || docs.length === 0) {
    throw new Error('No se encontraron documentos vigentes para la faena seleccionada.')
  }

  const zip = new JSZip()
  const raizFaena = zip.folder(`Expediente_${nombreFaena.replace(/\s+/g, '_')}`) || zip

  let procesados = 0
  const total = docs.length

  for (const doc of docs) {
    let subcarpeta: JSZip = raizFaena

    if (doc.rut_trabajador) {
      const trabajadorObj: any = Array.isArray(doc.trabajadores)
        ? doc.trabajadores[0]
        : doc.trabajadores

      const trabajadorNombre = trabajadorObj && trabajadorObj.nombres && trabajadorObj.apellidos
        ? `${trabajadorObj.nombres}_${trabajadorObj.apellidos}`.replace(/\s+/g, '_')
        : 'Sin_Nombre'

      const folderPersonal = raizFaena.folder(`Personal/${doc.rut_trabajador}_${trabajadorNombre}`)
      if (folderPersonal) subcarpeta = folderPersonal
    } else {
      const folderGeneral = raizFaena.folder('Documentos_Generales_Obra')
      if (folderGeneral) subcarpeta = folderGeneral
    }

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(doc.storage_path)

      if (downloadError || !fileData) {
        console.warn(`No se pudo descargar el archivo: ${doc.storage_path}`)
        continue
      }

      const extension = doc.storage_path.split('.').pop() || 'pdf'
      const nombreFinal = `${doc.categoria}_${doc.titulo.replace(/[^a-zA-Z0-9_.-]/g, '_')}`

      subcarpeta.file(
        nombreFinal.endsWith(`.${extension}`) ? nombreFinal : `${nombreFinal}.${extension}`,
        fileData
      )
    } catch (err) {
      console.error(`Error empaquetando documento ID ${doc.id}:`, err)
    }

    procesados++
    if (onProgress) onProgress(procesados, total)
  }

  const contenidoZip = await zip.generateAsync({ type: 'blob' })

  await supabase.from('auditoria_documentos').insert([
    {
      accion: 'DESCARGA_CUADRILLA',
      usuario_email: usuarioEmail,
      detalle: {
        faena_id: faenaId,
        nombre_faena: nombreFaena,
        total_archivos: total,
        archivos_empaquetados: procesados
      }
    }
  ])

  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(contenidoZip)
  enlace.download = `Expediente_${nombreFaena.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(enlace.href)

  return { total, procesados }
}