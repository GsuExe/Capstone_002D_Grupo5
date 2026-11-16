import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo_alerta, entidad_id, origen_entidad, titulo, mensaje_adicional } = body;

    // Configuración estándar de Nodemailer
    const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // true para puerto 465
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
    });

    const correoAdministracion = {
      from: `"Sistema Web Control Faena" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER,
      subject: `[ALERTA ${origen_entidad || 'GENERAL'}] Nivel: ${tipo_alerta}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #007734;">Notificación Preventiva del Sistema</h2>
          <p>Se ha registrado una alerta polimórfica en el sistema operativo:</p>
          <ul style="line-height: 1.6;">
            <li><strong>Origen:</strong> <span style="color: #007734; font-weight: bold;">${origen_entidad || 'GENERAL'}</span></li>
            <li><strong>Nivel de Alerta:</strong> <span style="color: #d97706; font-weight: bold;">${tipo_alerta}</span></li>
            <li><strong>Título / Detalle:</strong> ${titulo || 'Sin título especificado'}</li>
            <li><strong>ID de Entidad Asociada:</strong> #${entidad_id || 'N/A'}</li>
            <li><strong>Fecha del Evento:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          ${mensaje_adicional ? `<p><strong>Observación:</strong> ${mensaje_adicional}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #666;">Este correo fue generado automáticamente por el panel de administración de Carlos Álvarez Villar E.I.R.L.</p>
        </div>
      `,
    };

    // Intentamos enviar el correo en un bloque protegido
    try {
      await transporter.sendMail(correoAdministracion);
    } catch (mailError) {
      console.error('Error al enviar correo con Nodemailer (capturado silenciosamente):', mailError);
      // No lanzamos error para que la API responda OK y no interrumpa el flujo del sistema
    }

    return NextResponse.json({ success: true, message: 'Proceso de alerta procesado.' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error general en la API de notificaciones:', error);
    const mensaje = error instanceof Error ? error.message : 'Error interno desconocido';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}