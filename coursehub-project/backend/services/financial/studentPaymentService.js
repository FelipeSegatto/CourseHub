/**
 * Wrapper fino do aluno autenticado sobre o motor central de
 * pagamento (invoicePaymentService.js#startInvoicePayment) -- toda a
 * lógica de trava/validação/chamada ao gateway vive lá agora. Este
 * arquivo só resolve a identidade do aluno a partir do token
 * autenticado (nunca de algo enviado pelo cliente) e delega. Rota e
 * contrato de resposta de POST /api/student/finance/invoices/:id/payments
 * e GET /api/student/finance/payments/:id permanecem os mesmos de
 * antes desta generalização -- só o conjunto de paymentMethod aceitos
 * cresceu (pix/boleto/credit_card, era só pix).
 */
const { getStudentIdByUserId, createServiceError } = require("../classes/classAccessService");
const { startInvoicePayment, getInvoicePaymentByAccessContext } = require("./invoicePaymentService");

async function createInvoicePayment(db, { userId, invoiceId, paymentMethod }) {
  const studentId = await getStudentIdByUserId(db.promise(), userId);

  if (!studentId) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  return startInvoicePayment(db, {
    invoiceId,
    paymentMethod,
    accessContext: { scope: "student", studentId, userId },
  });
}

async function getInvoicePaymentByUser(db, { userId, paymentId }) {
  const studentId = await getStudentIdByUserId(db.promise(), userId);

  if (!studentId) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  return getInvoicePaymentByAccessContext(db, {
    paymentId,
    accessContext: { scope: "student", studentId },
  });
}

module.exports = {
  createInvoicePayment,
  getInvoicePaymentByUser,
};
