const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * All dynamic content in these templates comes from
 * notificationTypeRegistry builders, which in later stages will
 * interpolate real entity titles/feedback/free text -- never trust
 * it as safe HTML, always escape before interpolating into markup.
 */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Shared HTML shell for every transactional email CourseHub sends.
 * `bodyHtml` must already be escaped/composed safely by the caller --
 * this function does not escape it again (it wraps pre-built markup,
 * not raw text).
 */
function renderBaseLayout({ preheader = "", bodyHtml }) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CourseHub</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif; color:#111827;">
        <span style="display:none; font-size:1px; color:#f3f4f6;">${escapeHtml(preheader)}</span>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden;">
                <tr>
                  <td style="background:#1e3a8a; padding:20px 24px;">
                    <span style="color:#ffffff; font-size:18px; font-weight:bold;">CourseHub</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; background:#f9fafb; font-size:12px; color:#6b7280;">
                    Este é um e-mail automático do CourseHub. Não é necessário responder.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

module.exports = { escapeHtml, renderBaseLayout };
