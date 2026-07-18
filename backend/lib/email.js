// Usa fetch nativo de Node contra la API REST de Resend, sin sumar un SDK
// como dependencia nueva para algo que es un solo POST.
async function enviarEmail({ para, asunto, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no está configurada, no se envió el email:', asunto);
    return { enviado: false };
  }

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [para],
      subject: asunto,
      html,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Resend respondió ${respuesta.status}: ${detalle}`);
  }

  return { enviado: true };
}

module.exports = { enviarEmail };
