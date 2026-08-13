const crypto = require("crypto");
const { formatDateTimeForMySQL } = require("./paymentGatewayContract");

/**
 * Registro em memória das tentativas de pagamento simulado, indexado
 * tanto por idempotencyKey quanto por gatewayPaymentId. Um gateway
 * real guarda esse tipo de estado nos próprios servidores; o
 * simulado não tem servidor, então guarda o suficiente disso em
 * memória para se comportar de forma consistente entre
 * createPayment -> getPayment -> refundPayment dentro de um mesmo
 * backend em execução. Deliberadamente NÃO sobrevive a um restart --
 * payments.gateway_status no banco continua sendo a fonte da verdade
 * durável para qualquer coisa que precise sobreviver a um processo,
 * exatamente como seria com um provider real.
 */
const store = new Map();

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Cria uma tentativa de pagamento PIX simulado. Idempotente em
 * idempotencyKey: um create repetido (timeout, duplo clique) retorna
 * exatamente a mesma tentativa em vez de criar uma segunda -- igual
 * à garantia que a chave de idempotência de um gateway real oferece.
 */
async function createPayment({ paymentId, invoiceId, paymentMethod, amount, externalReference, idempotencyKey }) {
  if (paymentMethod !== "pix") {
    throw new Error(`O gateway simulado não suporta o método de pagamento "${paymentMethod}".`);
  }

  const existing = store.get(idempotencyKey);

  if (existing) {
    return { ...existing };
  }

  const gatewayPaymentId = `sim_pix_${crypto.randomUUID()}`;
  const expiresAt = addMinutes(new Date(), 30);

  const result = {
    gatewayPaymentId,
    status: "pending",
    gatewayStatus: "pending",
    gatewayStatusDetail: "pending_waiting_transfer",
    pixCopyPaste: ["000201", "COURSEHUB", gatewayPaymentId, externalReference, Number(amount).toFixed(2)].join("|"),
    // Não é um QR Code real -- um marcador estável que o frontend
    // pode renderizar como placeholder em desenvolvimento/testes.
    pixQrCode: `SIMULATED_PIX_QR:${gatewayPaymentId}`,
    pixExpiresAt: formatDateTimeForMySQL(expiresAt),
    paidAt: null,
  };

  store.set(idempotencyKey, result);
  store.set(gatewayPaymentId, result);

  return { ...result };
}

async function getPayment(gatewayPaymentId) {
  const stored = store.get(gatewayPaymentId);

  if (!stored) {
    const error = new Error(`Pagamento simulado "${gatewayPaymentId}" não encontrado.`);
    error.code = "GATEWAY_PAYMENT_NOT_FOUND";
    throw error;
  }

  return { ...stored };
}

async function refundPayment({ gatewayPaymentId }) {
  const stored = store.get(gatewayPaymentId);

  if (!stored) {
    return { status: "failed", failureReason: "payment_not_found" };
  }

  if (stored.status !== "approved") {
    return { status: "failed", failureReason: "payment_not_approved" };
  }

  return { status: "refunded", gatewayRefundId: `sim_refund_${crypto.randomUUID()}` };
}

/**
 * O gateway simulado não tem transporte HTTP real, então não há
 * nada para autenticar -- aprovações são disparadas localmente via
 * simulateApproval (usado só pela rota dev-only em
 * paymentWebhookRoutes.js, protegida por NODE_ENV/PAYMENT_GATEWAY),
 * que alimenta o mesmo pipeline do paymentProcessingService que um
 * webhook real usa. Mantido como no-op (não simplesmente ausente)
 * para que o adaptador ainda satisfaça o contrato completo do
 * gateway.
 */
function verifyWebhook() {}

function parseWebhook() {
  throw new Error(
    "O gateway simulado não recebe webhooks reais; utilize a rota de desenvolvimento para simular uma aprovação."
  );
}

/**
 * Somente para desenvolvimento: leva um pagamento PIX simulado
 * direto para aprovado, alterando o registro em memória para que a
 * chamada getPayment() seguinte (que paymentProcessingService sempre
 * faz, nunca confiando diretamente no corpo de um webhook) observe o
 * novo estado -- o mesmo caminho de código que um webhook real do
 * Mercado Pago disparia.
 */
function simulateApproval(gatewayPaymentId) {
  const stored = store.get(gatewayPaymentId);

  if (!stored) {
    const error = new Error(`Pagamento simulado "${gatewayPaymentId}" não encontrado.`);
    error.code = "GATEWAY_PAYMENT_NOT_FOUND";
    throw error;
  }

  stored.status = "approved";
  stored.gatewayStatus = "approved";
  stored.gatewayStatusDetail = "accredited";
  stored.paidAt = formatDateTimeForMySQL(new Date());

  return { ...stored };
}

module.exports = {
  createPayment,
  getPayment,
  refundPayment,
  verifyWebhook,
  parseWebhook,
  simulateApproval,
};
