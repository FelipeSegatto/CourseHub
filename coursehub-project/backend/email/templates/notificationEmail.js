const { escapeHtml, renderBaseLayout } = require("./baseLayout");

const PRIORITY_LABELS = {
  normal: null,
  high: "Importante",
  urgent: "Urgente",
};

/**
 * Renders the outbox worker's one and only email shape: title +
 * message (both already built by the notificationTypeRegistry, so
 * they're the intended safe summary, not a raw entity dump) + a link
 * back into the app. `actionPath` is always an internal path
 * (validated server-side by the registry, e.g. "/aluno/notas/42"),
 * never a client-supplied URL.
 */
function buildNotificationEmail({ title, message, actionPath, priority }) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const actionUrl = `${frontendUrl}${actionPath}`;
  const priorityLabel = PRIORITY_LABELS[priority] || null;

  const subject = priorityLabel ? `[${priorityLabel}] ${title}` : title;

  const text = [
    title,
    "",
    message,
    "",
    `Acesse: ${actionUrl}`,
    "",
    "Canal institucional do CourseHub -- esta comunicação pode ser acessada pela gestão autorizada para atendimento, segurança e auditoria.",
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:18px; margin:0 0 12px;">${escapeHtml(title)}</h1>
    <p style="font-size:14px; line-height:1.5; margin:0 0 20px; white-space:pre-line;">${escapeHtml(
      message
    )}</p>
    <p style="margin:0 0 20px;">
      <a
        href="${actionUrl}"
        style="display:inline-block; background:#1e3a8a; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-size:14px;"
      >
        Acessar no CourseHub
      </a>
    </p>
    <p style="font-size:12px; color:#6b7280; margin:0;">
      Canal institucional do CourseHub — esta comunicação pode ser acessada pela gestão autorizada
      para atendimento, segurança e auditoria.
    </p>
  `;

  const html = renderBaseLayout({ preheader: message, bodyHtml });

  return { subject, text, html };
}

module.exports = { buildNotificationEmail };
