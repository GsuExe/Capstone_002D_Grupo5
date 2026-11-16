// app/api/cotizaciones/route.ts
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
        { error: 'No se recibieron los datos de cotización.' },
        { status: 400 }
      );
    }

    const datosFormulario = JSON.parse(datosRaw);
    let archivoAdjuntoUrl: string | null = null;

    // 1. Subida del archivo al Bucket 'cotizaciones', carpeta 'especificaciones'
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const extension = file.name.split('.').pop() || 'pdf';
      const nombreLimpio = (datosFormulario.nombre_cliente || 'cliente')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const nombreUnico = `cotiz_${nombreLimpio}_${Date.now()}.${extension}`;
      const rutaArchivo = `especificaciones/${nombreUnico}`;

      const { error: uploadError } = await supabase.storage
        .from('cotizaciones')
        .upload(rutaArchivo, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir a bucket cotizaciones:', uploadError);
        return NextResponse.json(
          { error: `Error al subir el archivo adjunto: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('cotizaciones')
        .getPublicUrl(rutaArchivo);

      archivoAdjuntoUrl = publicUrlData.publicUrl;
    }

    // 2. Inserción en Base de Datos (sin .select() para no violar RLS)
    const payload = {
      nombre_cliente: datosFormulario.nombre_cliente,
      empresa: datosFormulario.empresa || null,
      telefono: datosFormulario.telefono,
      email: datosFormulario.email,
      tipo_partida: datosFormulario.tipo_partida,
      mensaje: datosFormulario.mensaje,
      archivo_adjunto_url: archivoAdjuntoUrl,
    };

    const { error: dbError } = await supabase
      .from('cotizaciones_contacto')
      .insert([payload]);

    if (dbError) {
      console.error('Error al insertar en cotizaciones_contacto:', dbError);
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

      // A. Correo de confirmación al cliente
      const correoCliente = {
        from: `"Carlos Alberto Álvarez Villar E.I.R.L." <${process.env.SMTP_USER}>`,
        to: datosFormulario.email,
        subject: `Confirmación de Solicitud de Cotización - Partida: ${datosFormulario.tipo_partida}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
              <h2 style="color: #00FF6F; margin: 0;">Carlos Alberto Álvarez Villar E.I.R.L.</h2>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">RUT 77.974.309-8 • Departamento de Cubicación y Presupuestos</p>
            </div>
            <div style="padding: 20px 0; color: #334155;">
              <p>Estimado/a <strong>${datosFormulario.nombre_cliente}</strong>,</p>
              <p>Hemos recibido exitosamente su solicitud de cotización técnica para la partida de <strong>${datosFormulario.tipo_partida}</strong>.</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #007734; margin: 15px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Detalle de su solicitud:</strong></p>
                <p style="margin: 0; font-size: 12px; color: #475569;">${datosFormulario.mensaje}</p>
                ${archivoAdjuntoUrl ? `<p style="margin-top: 8px; font-size: 11px;"><a href="${archivoAdjuntoUrl}" style="color: #007734; font-weight: bold;">Ver plano/archivo adjunto</a></p>` : ''}
              </div>
              <p style="font-size: 13px;">Nuestro departamento técnico evaluará los antecedentes y se pondrá en contacto al número <strong>${datosFormulario.telefono}</strong> a la brevedad.</p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
              Este es un correo automático. Por favor no responda a este mensaje.
            </div>
          </div>
        `,
      };

      // B. Notificación interna para la constructora
      const correoEmpresa = {
        from: `"Sistema Web" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER,
        subject: `[NUEVA COTIZACIÓN] ${datosFormulario.tipo_partida} - ${datosFormulario.nombre_cliente}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Nueva Solicitud de Cotización Recibida</h2>
            <ul>
              <li><strong>Cliente:</strong> ${datosFormulario.nombre_cliente}</li>
              <li><strong>Empresa:</strong> ${datosFormulario.empresa || 'Particular'}</li>
              <li><strong>Teléfono:</strong> ${datosFormulario.telefono}</li>
              <li><strong>Email:</strong> ${datosFormulario.email}</li>
              <li><strong>Partida:</strong> ${datosFormulario.tipo_partida}</li>
            </ul>
            <p><strong>Mensaje / Cubicación:</strong></p>
            <p>${datosFormulario.mensaje}</p>
            ${archivoAdjuntoUrl ? `<p><a href="${archivoAdjuntoUrl}">Descargar archivo adjunto de planos</a></p>` : '<p><em>Sin archivo adjunto</em></p>'}
          </div>
        `,
      };

      await Promise.all([
        transporter.sendMail(correoCliente),
        transporter.sendMail(correoEmpresa),
      ]);
    } catch (mailError) {
      console.error('Error al enviar correos con Nodemailer:', mailError);
      // No bloqueamos la respuesta exitosa si la base de datos ya almacenó la solicitud
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error general en POST /api/cotizaciones:', error);
    const mensaje = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}