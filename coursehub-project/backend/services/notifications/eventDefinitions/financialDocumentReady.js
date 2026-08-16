const { registerNotificationType } = require("../notificationTypeRegistry");

const DOCUMENT_TYPE_LABEL = {
  financial_contract: "contrato",
  invoice_copy: "2ª via da fatura",
  payment_receipt: "recibo de pagamento",
};

/**
 * Disparado só pelo worker de geração de documentos
 * (workers/documentGenerationWorker.js), só depois que o documento
 * chega em 'ready' -- nunca antes, para nunca notificar sucesso de
 * algo que falhou. Só notifica o solicitante quando ele é um aluno
 * (accessContext scope='student'); um admin gerando pela própria tela
 * acompanha por polling, não precisa de notificação assíncrona.
 */
registerNotificationType({
  type: "financial.document.ready",
  category: "financial",
  priority: "normal",
  emailPolicy: "default_off",
  requiredContext: ["documentType", "generatedDocumentId"],

  buildTitle: (context) => `Documento disponível: ${DOCUMENT_TYPE_LABEL[context.documentType] || "documento"}`,

  buildMessage: (context) =>
    `Seu ${DOCUMENT_TYPE_LABEL[context.documentType] || "documento"} já está pronto para download na sua área financeira.`,

  buildActionPath: () => "/aluno/financeiro",

  buildDeduplicationKey: (context) => `financial.document.ready:${context.generatedDocumentId}`,

  recipientPolicy: "só o aluno que solicitou a geração (accessContext scope='student')",
});
