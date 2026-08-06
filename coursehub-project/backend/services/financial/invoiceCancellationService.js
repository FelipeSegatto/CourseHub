const {
  recalculateFinancialContractStatus,
} = require("./contractFinancialService");

const {
  createFinancialEvent,
} = require("./financialEventService");

const { withTransaction } = require("../../utils/dbTransaction");
const { notifyInvoiceCancelled } = require("./financialNotificationService");

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
 * Cancela uma fatura aberta, remove ações de cobrança
 * pendentes e registra o evento financeiro.
 */
async function cancelInvoice(
  db,
  {
    invoiceId,
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

  const normalizedInvoiceId = Number(invoiceId);

  if (
    !Number.isInteger(normalizedInvoiceId) ||
    normalizedInvoiceId <= 0
  ) {
    throw createServiceError(
      "O identificador da fatura é obrigatório e deve ser válido.",
      400
    );
  }

  if (
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    throw createServiceError(
      "O motivo do cancelamento é obrigatório.",
      400
    );
  }

  if (!actorUserId) {
    throw createServiceError(
      "Não foi possível identificar o administrador autenticado.",
      401
    );
  }

  return withTransaction(db, async (connection) => {
    const [invoices] = await connection.execute(
      `
        SELECT
          i.id,
          i.financial_contract_id,
          i.amount,
          i.status,
          i.due_date,
          i.paid_at,
          i.cancelled_at,
          i.description,
          fc.enrollment_id,
          en.student_id,
          en.course_id,
          c.name AS course_name
        FROM invoices i
        INNER JOIN financial_contracts fc
          ON fc.id = i.financial_contract_id
        INNER JOIN enrollments en
          ON en.id = fc.enrollment_id
        INNER JOIN courses c
          ON c.id = en.course_id
        WHERE i.id = ?
        FOR UPDATE
      `,
      [normalizedInvoiceId]
    );

    if (invoices.length === 0) {
      throw createServiceError(
        "Fatura não encontrada.",
        404
      );
    }

    const invoice = invoices[0];

    if (invoice.status === "paid") {
      throw createServiceError(
        "Não é possível cancelar uma fatura já paga. Para desfazer o pagamento, será necessário realizar um reembolso.",
        409
      );
    }

    if (invoice.status === "cancelled") {
      throw createServiceError(
        "Esta fatura já está cancelada.",
        409
      );
    }

    if (invoice.status === "refunded") {
      throw createServiceError(
        "Não é possível cancelar uma fatura reembolsada.",
        409
      );
    }

    const cancellationDate =
      getCurrentMysqlDateTime();

    await connection.execute(
      `
        UPDATE invoices
        SET
          status = 'cancelled',
          cancelled_at = ?
        WHERE id = ?
      `,
      [
        cancellationDate,
        normalizedInvoiceId,
      ]
    );

    await connection.execute(
      `
        DELETE FROM invoice_collection_actions
        WHERE invoice_id = ?
          AND status IN ('pending', 'skipped')
      `,
      [normalizedInvoiceId]
    );

    await createFinancialEvent(connection, {
      financialContractId:
        invoice.financial_contract_id,
      invoiceId: normalizedInvoiceId,
      paymentId: null,
      enrollmentId: invoice.enrollment_id,
      eventType: "invoice_cancelled",
      source: "admin",
      actorUserId,
      previousValue: {
        invoiceStatus: invoice.status,
        cancelledAt: invoice.cancelled_at,
      },
      newValue: {
        invoiceStatus: "cancelled",
        cancelledAt: cancellationDate,
      },
      reason: reason.trim(),
    });

    await recalculateFinancialContractStatus(
      connection,
      invoice.financial_contract_id
    );

    await notifyInvoiceCancelled(db, connection, {
      invoiceId: normalizedInvoiceId,
      invoiceDescription: invoice.description,
      reason: reason.trim(),
      studentId: invoice.student_id,
      courseId: invoice.course_id,
      courseName: invoice.course_name,
    });

    return {
      invoiceId: normalizedInvoiceId,
      financialContractId:
        invoice.financial_contract_id,
      previousStatus: invoice.status,
      invoiceStatus: "cancelled",
      cancelledAt: cancellationDate,
    };
  });
}

module.exports = {
  cancelInvoice,
};