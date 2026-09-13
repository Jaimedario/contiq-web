// Vercel Serverless Function: envía el formulario de contacto de contiq.cl
// usando Resend. Requiere la variable de entorno RESEND_API_KEY configurada
// en el proyecto de Vercel (ya usada para no-reply@contiq.cl).

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, email, asunto, mensaje } = req.body || {};

  if (!nombre || !email || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Nombre, email, asunto y mensaje son obligatorios' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'El email no es válido' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY no está configurada en el proyecto de Vercel');
    return res.status(500).json({ error: 'El servicio de correo no está configurado' });
  }

  try {
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ContIQ <no-reply@contiq.cl>',
        to: ['contacto@contiq.cl'],
        reply_to: email,
        subject: `[Contacto web] ${asunto}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1C2B22">
            <h2 style="color:#1B6B45;margin-bottom:12px">Nuevo mensaje desde contiq.cl</h2>
            <p style="margin:0 0 6px"><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
            <p style="margin:0 0 6px"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin:0 0 6px"><strong>Asunto:</strong> ${escapeHtml(asunto)}</p>
            <p style="margin:16px 0 4px"><strong>Mensaje:</strong></p>
            <p style="white-space:pre-wrap;margin:0">${escapeHtml(mensaje)}</p>
          </div>
        `,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error('Error de Resend:', resendResp.status, errText);
      return res.status(502).json({ error: 'No se pudo enviar el mensaje. Intenta nuevamente.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando email de contacto:', err);
    return res.status(500).json({ error: 'Error interno. Intenta nuevamente más tarde.' });
  }
};
