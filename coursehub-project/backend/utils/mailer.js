const nodemailer = require("nodemailer");

let transporterPromise = null;

/**
 * Cria (uma única vez) o transporte de e-mail.
 *
 * Em produção/qualquer ambiente com SMTP_HOST configurado no .env,
 * usa o provedor real. Sem SMTP_HOST (ex.: desenvolvimento local),
 * cria automaticamente uma conta de teste Ethereal — nenhuma
 * credencial é necessária e cada e-mail "enviado" gera um link de
 * preview que aparece no console do servidor.
 */
async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  if (process.env.SMTP_HOST) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      })
    );

    return transporterPromise;
  }

  transporterPromise = nodemailer
    .createTestAccount()
    .then((testAccount) =>
      nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    );

  return transporterPromise;
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "CourseHub <no-reply@coursehub.local>",
    to,
    subject: "Redefinição de senha — CourseHub",
    text: `Recebemos uma solicitação para redefinir sua senha.\n\nAcesse o link abaixo (válido por 15 minutos):\n${resetUrl}\n\nSe você não pediu isso, ignore este e-mail.`,
    html: `
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a> (válido por 15 minutos).</p>
      <p>Se você não pediu isso, ignore este e-mail.</p>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(
      "[mailer] Conta de teste (Ethereal) — preview do e-mail:",
      nodemailer.getTestMessageUrl(info)
    );
  }

  return info;
}

module.exports = { sendPasswordResetEmail };
