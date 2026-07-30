const {
  recalculateFinancialContractStatus,
} = require("./contractFinancialService");

const {
  createFinancialEvent,
} = require("./financialEventService");

/**
 * Cria um erro de negócio com status HTTP.
 */
function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/**
 * Retorna a data atual no formato DATETIME do MySQL.
 */
function getCurrentMysqlDateTime() {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(
    currentDate.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    currentDate.getDate()
  ).padStart(2, "0");
  const hours = String(
    currentDate.getHours()
  ).padStart(2, "0");
  const minutes = String(
    currentDate.getMinutes()
  ).padStart(2, "0");
  const seconds = String(
    currentDate.getSeconds()
  ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Registra o reembolso integral de um pagamento aprovado,
 * atualiza a fatura e mantém o histórico financeiro.
 */
async function refundPayment(
  db,
  {
    paymentId,
    reason,
    actorUserId,
  }
) {
  if (!db) {
    throw createServiceError(
      "A conexão com o banco de dados não foi fornecida.",
      500
    );
  }

  const normalizedPaymentId = Number(paymentId);

  if (
    !Number.isInteger(normalizedPaymentId) ||
    normalizedPaymentId <= 0
  ) {
    throw createServiceError(
      "O identificador do pagamento é obrigatório e deve ser válido.",
      400
    );
  }

  if (
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    throw createServiceError(
      "O motivo do reembolso é obrigatório.",
      400
    );
  }

  if (reason.trim().length > 255) {
    throw createServiceError(
      "O motivo do reembolso deve possuir no máximo 255 caracteres.",
      400
    );
  }

  if (!actorUserId) {
    throw createServiceError(
      "Não foi possível identificar o administrador autenticado.",
      401
    );
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [payments] = await connection.execute(
      `
        SELECT
          p.id,
          p.invoice_id,
          p.gateway,
          p.gateway_payment_id,
          p.source,
          p.payment_method,
          p.amount,
          p.status,
          p.paid_at,
          p.refunded_at,
          p.refund_reason,
          i.financial_contract_id,
          i.status AS invoice_status,
          i.paid_at AS invoice_paid_at,
          fc.enrollment_id
        FROM payments p
        INNER JOIN invoices i
          ON i.id = p.invoice_id
        INNER JOIN financial_contracts fc
          ON fc.id = i.financial_contract_id
        WHERE p.id = ?
        FOR UPDATE
      `,
      [normalizedPaymentId]
    );

    if (payments.length === 0) {
      throw createServiceError(
        "Pagamento não encontrado.",
        404
      );
    }

    const payment = payments[0];

    if (payment.status === "refunded") {
      throw createServiceError(
        "Este pagamento já foi reembolsado.",
        409
      );
    }

    if (payment.status === "chargeback") {
      throw createServiceError(
        "Não é possível reembolsar um pagamento que sofreu chargeback.",
        409
      );
    }

    if (payment.status !== "approved") {
      throw createServiceError(
        "Somente pagamentos aprovados podem ser reembolsados.",
        409
      );
    }

    if (payment.invoice_status !== "paid") {
      throw createServiceError(
        "A fatura vinculada a este pagamento não está marcada como paga.",
        409
      );
    }

    const refundDate = getCurrentMysqlDateTime();
    const normalizedReason = reason.trim();

    await connection.execute(
      `
        UPDATE payments
        SET
          status = 'refunded',
          refunded_at = ?,
          refund_reason = ?,
          refunded_by_user_id = ?
        WHERE id = ?
      `,
      [
        refundDate,
        normalizedReason,
        actorUserId,
        normalizedPaymentId,
      ]
    );

    await connection.execute(
      `
        UPDATE invoices
        SET
          status = 'refunded'
        WHERE id = ?
      `,
      [payment.invoice_id]
    );

    await connection.execute(
      `
        DELETE FROM invoice_collection_actions
        WHERE invoice_id = ?
          AND status IN ('pending', 'skipped')
      `,
      [payment.invoice_id]
    );

    await createFinancialEvent(connection, {
      financialContractId:
        payment.financial_contract_id,
      invoiceId: payment.invoice_id,
      paymentId: normalizedPaymentId,
      enrollmentId: payment.enrollment_id,
      eventType: "payment_refunded",
      source: "admin",
      actorUserId,
      previousValue: {
        paymentStatus: payment.status,
        invoiceStatus: payment.invoice_status,
        refundedAt: payment.refunded_at,
        refundReason: payment.refund_reason,
      },
      newValue: {
        paymentStatus: "refunded",
        invoiceStatus: "refunded",
        refundedAt: refundDate,
        refundReason: normalizedReason,
        amount: Number(payment.amount),
      },
      reason: normalizedReason,
    });

    await recalculateFinancialContractStatus(
      connection,
      payment.financial_contract_id
    );

    await connection.commit();

    return {
      paymentId: normalizedPaymentId,
      invoiceId: payment.invoice_id,
      financialContractId:
        payment.financial_contract_id,
      amount: Number(payment.amount),
      previousPaymentStatus: payment.status,
      paymentStatus: "refunded",
      previousInvoiceStatus:
        payment.invoice_status,
      invoiceStatus: "refunded",
      refundedAt: refundDate,
      refundReason: normalizedReason,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(
        "Erro ao desfazer a transação de reembolso:",
        rollbackError
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  refundPayment,
};