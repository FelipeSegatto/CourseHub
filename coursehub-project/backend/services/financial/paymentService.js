const crypto = require("crypto");

const {
  recalculateFinancialContractStatus,
} = require("./contractFinancialService");

const {
  createFinancialEvent,
} = require("./financialEventService");

const { withTransaction } = require("../../utils/dbTransaction");
const { notifyPaymentApproved } = require("./financialNotificationService");

/**
 * Cria um erro com um código HTTP associado.
 */
function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/**
 * Formata um valor monetário no padrão brasileiro.
 */
function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Converte um valor monetário para centavos.
 * Isso evita comparações imprecisas com números decimais.
 */
function convertToCents(value) {
  return Math.round(Number(value) * 100);
}

/**
 * Converte uma data recebida pela API para o formato DATETIME do MySQL.
 */
function normalizePaymentDate(paymentDate) {
  if (!paymentDate) {
    return null;
  }

  const parsedDate = new Date(paymentDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createServiceError(
      "A data do pagamento informada é inválida.",
      400
    );
  }

  const year = parsedDate.getFullYear();
  const month = String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(
    parsedDate.getMinutes()
  ).padStart(2, "0");
  const seconds = String(
    parsedDate.getSeconds()
  ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Registra manualmente o pagamento integral de uma fatura,
 * atualiza seus status e mantém o histórico financeiro.
 */
async function registerManualPayment(
  db,
  {
    invoiceId,
    amount,
    paymentMethod,
    paymentDate,
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
  const normalizedAmount = Number(amount);

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
    !Number.isFinite(normalizedAmount) ||
    normalizedAmount <= 0
  ) {
    throw createServiceError(
      "O valor do pagamento é obrigatório e deve ser maior que zero.",
      400
    );
  }

  const allowedPaymentMethods = [
    "pix",
    "boleto",
    "credit_card",
  ];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw createServiceError(
      "O método de pagamento informado é inválido. Utilize pix, boleto ou credit_card.",
      400
    );
  }

  if (
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    throw createServiceError(
      "O motivo do registro manual é obrigatório.",
      400
    );
  }

  if (!actorUserId) {
    throw createServiceError(
      "Não foi possível identificar o administrador autenticado.",
      401
    );
  }

  const normalizedPaymentDate =
    normalizePaymentDate(paymentDate) ||
    normalizePaymentDate(new Date());

  return withTransaction(db, async (connection) => {
    const [invoices] = await connection.execute(
      `
        SELECT
          i.id,
          i.financial_contract_id,
          i.amount,
          i.status,
          i.paid_at,
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
        "Não é possível registrar o pagamento porque esta fatura já está paga.",
        409
      );
    }

    if (invoice.status === "cancelled") {
      throw createServiceError(
        "Não é possível registrar o pagamento de uma fatura cancelada.",
        409
      );
    }

    if (invoice.status === "refunded") {
      throw createServiceError(
        "Não é possível registrar o pagamento de uma fatura reembolsada.",
        409
      );
    }

    const invoiceAmount = Number(invoice.amount);

    /*
     * O modelo atual não possui pagamento parcial.
     * Por isso, o pagamento precisa corresponder ao valor integral.
     */
    if (
      convertToCents(normalizedAmount) !==
      convertToCents(invoiceAmount)
    ) {
      throw createServiceError(
        `O valor do pagamento deve ser exatamente ${formatCurrency(
          invoiceAmount
        )}.`,
        400
      );
    }

    const [existingPayments] = await connection.execute(
      `
        SELECT id
        FROM payments
        WHERE invoice_id = ?
          AND status = 'approved'
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedInvoiceId]
    );

    if (existingPayments.length > 0) {
      throw createServiceError(
        "Já existe um pagamento aprovado para esta fatura.",
        409
      );
    }

    const gatewayPaymentId =
      `manual_${crypto.randomUUID()}`;

    const [paymentResult] = await connection.execute(
      `
        INSERT INTO payments (
          invoice_id,
          gateway,
          gateway_payment_id,
          payment_method,
          amount,
          status,
          paid_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedInvoiceId,
        "simulated",
        gatewayPaymentId,
        paymentMethod,
        normalizedAmount,
        "approved",
        normalizedPaymentDate,
      ]
    );

    const paymentId = paymentResult.insertId;

    await connection.execute(
      `
        UPDATE invoices
        SET
          status = 'paid',
          paid_at = ?,
          cancelled_at = NULL
        WHERE id = ?
      `,
      [
        normalizedPaymentDate,
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
      paymentId,
      enrollmentId: invoice.enrollment_id,
      eventType: "invoice_paid_manually",
      source: "admin",
      actorUserId,
      previousValue: {
        invoiceStatus: invoice.status,
        paidAt: invoice.paid_at,
      },
      newValue: {
        invoiceStatus: "paid",
        paymentStatus: "approved",
        amount: normalizedAmount,
        paymentMethod,
        paidAt: normalizedPaymentDate,
      },
      reason: reason.trim(),
    });

    await recalculateFinancialContractStatus(
      connection,
      invoice.financial_contract_id
    );

    await notifyPaymentApproved(db, connection, {
      paymentId,
      invoiceId: normalizedInvoiceId,
      invoiceDescription: invoice.description,
      amount: normalizedAmount.toFixed(2),
      studentId: invoice.student_id,
      courseId: invoice.course_id,
      courseName: invoice.course_name,
    });

    return {
      paymentId,
      invoiceId: normalizedInvoiceId,
      financialContractId:
        invoice.financial_contract_id,
      amount: normalizedAmount,
      paymentMethod,
      paymentDate: normalizedPaymentDate,
      invoiceStatus: "paid",
      paymentStatus: "approved",
    };
  });
}

module.exports = {
  registerManualPayment,
};