/**
 * Exporta o progresso de UMA matrícula em PDF -- relatório
 * operacional atual, não documento formal (sem generated_documents,
 * sem worker, sem storage permanente, sem QR/versionamento). Gerado a
 * partir do mesmo DTO seguro do detalhe (getEnrollmentProgressDetail),
 * nunca de HTML/valores vindos do cliente.
 */
const { getEnrollmentProgressDetail } = require("../admin/adminStudentProgressService");
const { renderHtmlToPdf } = require("../documents/documentRendererService");
const { getRequesterName } = require("./reportDataHelpers");
const studentProgressPdfTemplate = require("./templates/studentProgressPdfTemplate");

async function generateStudentProgressPdf(db, { enrollmentId, actorUserId }) {
  const [detail, requestedByName] = await Promise.all([
    getEnrollmentProgressDetail(db, enrollmentId),
    getRequesterName(db, actorUserId),
  ]);

  const generatedAt = new Date();

  const html = studentProgressPdfTemplate.render({ detail, requestedByName, generatedAt });

  const buffer = await renderHtmlToPdf(html);

  return {
    buffer,
    filename: `progresso-aluno-${detail.enrollment.id}.pdf`,
  };
}

module.exports = { generateStudentProgressPdf };
