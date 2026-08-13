/**
 * Máquina de estados canônica de payments.status. Todo lugar que
 * altera o status de um pagamento -- studentPaymentService (criação),
 * paymentProcessingService (webhook/dev-simulate), paymentRefundService
 * (reembolso) -- precisa passar por assertValidTransition primeiro,
 * dentro da mesma transação/lock que faz o UPDATE. É isso que torna
 * "o webhook chega duas vezes" e "o webhook chega fora de ordem"
 * seguros: uma transição que não aparece abaixo é rejeitada em vez
 * de aplicada silenciosamente, então uma notificação "pending"
 * atrasada, recebida depois de "approved", nunca consegue voltar o
 * pagamento para trás.
 */
const ALLOWED_TRANSITIONS = {
  created: new Set(["pending", "approved", "rejected"]),
  pending: new Set(["approved", "rejected", "cancelled"]),
  approved: new Set(["refunded", "chargeback"]),
  rejected: new Set([]),
  cancelled: new Set([]),
  refunded: new Set([]),
  chargeback: new Set([]),
};

function canTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    // Uma "transição" para o mesmo status (ex.: um webhook "pending"
    // repetido) não é uma mudança de estado -- os chamadores tratam
    // isso como no-op, não como erro, checando canTransition antes
    // de chamar assert.
    return false;
  }

  return Boolean(ALLOWED_TRANSITIONS[fromStatus]?.has(toStatus));
}

function assertValidTransition(fromStatus, toStatus) {
  if (!ALLOWED_TRANSITIONS[fromStatus]) {
    const error = new Error(`Estado de pagamento desconhecido: "${fromStatus}".`);
    error.statusCode = 500;
    throw error;
  }

  if (!canTransition(fromStatus, toStatus)) {
    const error = new Error(`Transição de pagamento inválida: "${fromStatus}" -> "${toStatus}".`);
    error.statusCode = 409;
    error.code = "INVALID_PAYMENT_TRANSITION";
    throw error;
  }
}

module.exports = { ALLOWED_TRANSITIONS, canTransition, assertValidTransition };
