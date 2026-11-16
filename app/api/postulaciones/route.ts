// app/api/postulaciones/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Faltan variables de entorno para Supabase');
      return NextResponse.json(
        { error: 'Error de configuración en el servidor (variables de Supabase no encontradas).' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const datosRaw = formData.get('datos') as string | null;

    if (!datosRaw) {
      return NextResponse.json(
        { error: 'No se recibieron los datos de postulación.' },
        { status: 400 }
      );
    }

    const datosFormulario = JSON.parse(datosRaw);
    let archivoAdjuntoUrl: string | null = null;

    // 1. Subir CV al bucket 'curriculums', carpeta 'postulaciones'
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const extension = file.name.split('.').pop() || 'pdf';
      const rutLimpio = (datosFormulario.rut || 'cv').replace(/[^0-9kK]/gi, '').toUpperCase();
      const nombreUnico = `cv_${rutLimpio}_${Date.now()}.${extension}`;
      const rutaArchivo = `postulaciones/${nombreUnico}`;

      const { error: uploadError } = await supabase.storage
        .from('curriculums')
        .upload(rutaArchivo, buffer, {
          contentType: file.type || 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir a bucket curriculums:', uploadError);
        return NextResponse.json(
          { error: `Error al subir el currículum: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('curriculums')
        .getPublicUrl(rutaArchivo);

      archivoAdjuntoUrl = publicUrlData.publicUrl;
    }

    // 2. Inserción en Base de Datos (sin .select() para no violar RLS)
    const payload = {
      rut: datosFormulario.rut,
      nombre_completo: datosFormulario.nombre_completo,
      email: datosFormulario.email,
      telefono: datosFormulario.telefono,
      fecha_nacimiento: datosFormulario.fecha_nacimiento,
      nacionalidad: datosFormulario.nacionalidad,
      estado_civil: datosFormulario.estado_civil,
      direccion: datosFormulario.direccion,
      ciudad_comuna: datosFormulario.ciudad_comuna,
      afp: datosFormulario.afp,
      cotiza_actualmente: datosFormulario.cotiza_actualmente,
      sistema_salud: datosFormulario.sistema_salud,
      archivo_adjunto_url: archivoAdjuntoUrl,
    };

    const { error: dbError } = await supabase
      .from('postulaciones')
      .insert([payload]);

    if (dbError) {
      console.error('Error al insertar en postulaciones:', dbError);
      return NextResponse.json(
        { error: `Error en la base de datos: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 3. Envío de Correo Electrónico mediante Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT) === 465 || true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // A. Comprobante al postulante
      const correoPostulante = {
        from: `"Carlos Alberto Álvarez Villar E.I.R.L." <${process.env.SMTP_USER}>`,
        to: datosFormulario.email,
        subject: `Comprobante de Postulación a Faena - Carlos Alberto Álvarez Villar E.I.R.L.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
              <h2 style="color: #00FF6F; margin: 0;">Carlos Alberto Álvarez Villar E.I.R.L.</h2>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">RUT 77.974.309-8 • Selección y Reclutamiento de Personal</p>
            </div>
            <div style="padding: 20px 0; color: #334155;">
              <p>Estimado/a <strong>${datosFormulario.nombre_completo}</strong>,</p>
              <p>Confirmamos la recepción de sus antecedentes y Currículum Vitae para nuestras convocatorias y contratos activos en faenas.</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #007734; margin: 15px 0; font-size: 12px;">
                <p style="margin: 0 0 4px 0;"><strong>RUT:</strong> ${datosFormulario.rut}</p>
                <p style="margin: 0 0 4px 0;"><strong>Comuna:</strong> ${datosFormulario.ciudad_comuna}</p>
                <p style="margin: 0 0 4px 0;"><strong>Previsión:</strong> AFP ${datosFormulario.afp} | Salud: ${datosFormulario.sistema_salud}</p>
                ${archivoAdjuntoUrl ? `<p style="margin-top: 8px;"><a href="${archivoAdjuntoUrl}" style="color: #007734; font-weight: bold;">Ver CV Registrado</a></p>` : ''}
              </div>
              <p style="font-size: 13px;">Si su perfil coincide con los requerimientos operativos de obra, nuestro equipo de recursos humanos lo contactará directamente al <strong>${datosFormulario.telefono}</strong>.</p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
              Este es un comprobante oficial de recepción emitido por Carlos Alberto Álvarez Villar E.I.R.L.
            </div>
          </div>
        `,
      };

      // B. Notificación al administrador de la empresa
      const correoEmpresa = {
        from: `"Sistema Web" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER,
        subject: `[NUEVA POSTULACIÓN] ${datosFormulario.nombre_completo} (${datosFormulario.rut})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Nueva Postulación Recibida en Plataforma</h2>
            <ul>
              <li><strong>Nombre:</strong> ${datosFormulario.nombre_completo}</li>
              <li><strong>RUT:</strong> ${datosFormulario.rut}</li>
              <li><strong>Teléfono:</strong> ${datosFormulario.telefono}</li>
              <li><strong>Email:</strong> ${datosFormulario.email}</li>
              <li><strong>Comuna:</strong> ${datosFormulario.ciudad_comuna}</li>
              <li><strong>AFP:</strong> ${datosFormulario.afp}</li>
              <li><strong>Salud:</strong> ${datosFormulario.sistema_salud}</li>
            </ul>
            ${archivoAdjuntoUrl ? `<p><a href="${archivoAdjuntoUrl}">Descargar Currículum Vitae Adjunto</a></p>` : '<p><em>Sin archivo adjunto</em></p>'}
          </div>
        `,
      };

      await Promise.all([
        transporter.sendMail(correoPostulante),
        transporter.sendMail(correoEmpresa),
      ]);
    } catch (mailError) {
      console.error('Error al enviar correos con Nodemailer:', mailError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error general en POST /api/postulaciones:', error);
    const mensaje = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}