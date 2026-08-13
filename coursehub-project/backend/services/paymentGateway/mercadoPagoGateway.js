const {
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} = require("mercadopago");

const { formatDateTimeForMySQL } = require("./paymentGatewayContract");

// Um MercadoPagoConfig novo a cada chamada é proposital, não descuido:
// é um objeto simples e barato (sem abertura de socket/conexão), e
// ler o access token de forma preguiçosa -- em vez de guardá-lo em
// cache no carregamento do módulo -- faz uma credencial
// ausente/mal configurada falhar só na requisição específica que
// precisava dela, não no processo inteiro no require() (server.js já
// falha duro no boot se o gateway estiver mal configurado; esta é a
// segunda linha de defesa, no escopo da própria requisição).
function getConfig() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não está configurado.");
  }

  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

/**
 * Os valores de payment.status do próprio Mercado Pago (approved,
 * rejected, cancelled, refunded, charged_back, pending, in_process,
 * authorized, in_mediation) nunca são usados como status do
 * CourseHub diretamente -- este é o único lugar que os traduz para o
 * vocabulário da máquina de estados do domínio
 * (paymentStateMachine.js). pending/in_process/authorized/
 * in_mediation todos colapsam para "pending": nenhum deles
 * representa dinheiro que o CourseHub já pode agir sobre.
 */
function normalizeStatus(gatewayStatus) {
  switch (gatewayStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "chargeback";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
    default:
      return "pending";
  }
}

function mapPaymentResponse(response) {
  const transactionData = response.point_of_interaction?.transaction_data || {};
  const status = normalizeStatus(response.status);

  return {
    gatewayPaymentId: response.id !== undefined && response.id !== null ? String(response.id) : null,
    status,
    gatewayStatus: response.status || null,
    gatewayStatusDetail: response.status_detail || null,
    failureCode: status === "rejected" ? response.status_detail || null : null,
    pixCopyPaste: transactionData.qr_code || null,
    pixQrCode: transactionData.qr_code_base64 || null,
    pixExpiresAt: response.date_of_expiration ? formatDateTimeForMySQL(response.date_of_expiration) : null,
    paidAt: response.date_approved ? formatDateTimeForMySQL(response.date_approved) : null,
    amount: response.transaction_amount ?? null,
    currency: response.currency_id || null,
    externalReference: response.external_reference || null,
  };
}

/**
 * Cria um pagamento PIX via POST /v1/payments. Só "pix" está
 * implementado de ponta a ponta por enquanto (ver
 * docs/features/payment-gateway.md#mvp) -- tokenização de cartão
 * fica fora do escopo até o frontend integrar o componente seguro de
 * cartão do próprio Mercado Pago (o CourseHub nunca pode ver dado
 * bruto de cartão, ver nota de PCI no mesmo doc).
 */
async function createPayment({
  paymentMethod,
  amount,
  description,
  externalReference,
  idempotencyKey,
  payer,
  notificationUrl,
}) {
  if (paymentMethod !== "pix") {
    throw new Error(`O adaptador do Mercado Pago ainda não suporta o método de pagamento "${paymentMethod}".`);
  }

  const client = new Payment(getConfig());

  const response = await client.create({
    body: {
      transaction_amount: Number(amount),
      description,
      payment_method_id: "pix",
      external_reference: externalReference,
      notification_url: notificationUrl || undefined,
      payer: {
        email: payer.email,
        first_name: payer.firstName || undefined,
        last_name: payer.lastName || undefined,
      },
    },
    requestOptions: { idempotencyKey },
  });

  return mapPaymentResponse(response);
}

/** GET /v1/payments/:id -- a fonte da verdade autoritativa, sempre buscada de novo em vez de confiar no corpo de um webhook. */
async function getPayment(gatewayPaymentId) {
  const client = new Payment(getConfig());
  const response = await client.get({ id: gatewayPaymentId });

  return mapPaymentResponse(response);
}

/**
 * POST /v1/payments/:id/refunds. Um reembolso recusado/com erro é
 * reportado como { status: "failed" } em vez de lançar exceção -- o
 * chamador (paymentRefundService) decide o que isso significa para o
 * registro local; ele nunca pode marcar um pagamento como
 * reembolsado localmente quando o provider recusou.
 */
async function refundPayment({ gatewayPaymentId, amount }) {
  const client = new PaymentRefund(getConfig());

  try {
    const response = await client.create({
      payment_id: gatewayPaymentId,
      body: amount ? { amount: Number(amount) } : undefined,
    });

    return {
      status: "refunded",
      gatewayRefundId: response.id !== undefined && response.id !== null ? String(response.id) : null,
    };
  } catch (error) {
    return { status: "failed", failureReason: error.message || "gateway_refund_error" };
  }
}

/**
 * Verifica o header `x-signature` usando o próprio
 * WebhookSignatureValidator do SDK (HMAC-SHA256 sobre
 * "id:{data.id};request-id:{x-request-id};ts:{ts};", comparado em
 * tempo constante) -- confirmado contra a implementação real do SDK
 * instalado, não reimplementado manualmente. Deliberadamente síncrono
 * e sem efeito colateral: nenhum acesso ao banco, então um atacante é
 * rejeitado antes de qualquer lógica de negócio rodar.
 */
function verifyWebhook({ headers, query }) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("MERCADO_PAGO_WEBHOOK_SECRET não está configurado.");
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: headers["x-signature"],
      xRequestId: headers["x-request-id"],
      dataId: query["data.id"],
      secret,
      // Rejeita uma assinatura cujo timestamp esteja a mais de 5
      // minutos de distância de agora -- estreita a janela de replay
      // de uma notificação capturada mas, de resto, válida.
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      const wrapped = new Error(`Assinatura de webhook do Mercado Pago inválida: ${error.reason}`);
      wrapped.code = "INVALID_WEBHOOK_SIGNATURE";
      throw wrapped;
    }

    throw error;
  }
}

/**
 * Extrai somente os identificadores necessários para localizar o
 * pagamento local e deduplicar o evento -- nunca os campos de
 * status/valor da própria notificação, que paymentProcessingService
 * sempre busca de novo via getPayment() em vez de confiar.
 *
 * gatewayEventId é a chave de payment_events.gateway_event_id
 * (UNIQUE): o "id" do topo da notificação é estável entre os
 * reenvios do Mercado Pago da *mesma* entrega (ele reenvia
 * notificações idênticas quando não respondemos 200 rapidamente) e
 * distinto entre eventos genuinamente diferentes (ex.: pending ->
 * approved é uma notificação nova, com um id novo) -- exatamente a
 * chave de deduplicação para a qual essa coluna existe.
 */
function parseWebhook({ query, body }) {
  const type = query.type || query.topic || body?.type;
  const dataId = query["data.id"] || body?.data?.id;

  if (type !== "payment" || !dataId) {
    return { gatewayPaymentId: null, gatewayEventId: null };
  }

  const notificationId = body?.id ?? null;

  return {
    gatewayPaymentId: String(dataId),
    gatewayEventId: notificationId !== null ? `mercado_pago:${notificationId}` : null,
  };
}

module.exports = {
  createPayment,
  getPayment,
  refundPayment,
  verifyWebhook,
  parseWebhook,
};
