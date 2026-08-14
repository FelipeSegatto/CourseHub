const crypto = require("crypto");

const { withTransaction } = require("../../utils/dbTransaction");
const { getStudentIdByUserId, createServiceError } = require("../classes/classAccessService");
const { assertValidTransition } = require("./paymentStateMachine");
const { applyApproval } = require("./paymentProcessingService");
const { dispatchActivationNotifications } = require("./activateContractService");
const { getPaymentGateway, getPaymentGatewayName } = require("../paymentGateway/paymentGatewayFactory");
const { buildExternalReference, buildIdempotencyKey } = require("../paymentGateway/paymentGatewayContract");

const ALLOWED_PAYMENT_METHODS = ["pix"];
const OPEN_INVOICE_STATUSES = new Set(["pending", "processing", "overdue"]);

// Uma tentativa de PIX pendente recente o suficiente é segura para
// devolver sem alterações em vez de criar uma nova -- cobre o caso
// de duplo clique / duas abas (ver
// docs/features/payment-gateway.md#idempotencia-na-criacao) sem
// precisar de um token de idempotência fornecido pelo cliente.
function isReusableAttempt(payment) {
  if (payment.status !== "pending" || payment.payment_method !== "pix") {
    return false;
  }

  if (payment.gateway !== getPaymentGatewayName()) {
    return false;
  }

  if (!payment.pix_expires_at) {
    return true;
  }

  return new Date(payment.pix_expires_at).getTime() > Date.now();
}

function toPaymentDto(payment) {
  return {
    paymentId: payment.id,
    invoiceId: payment.invoice_id,
    paymentMethod: payment.payment_method,
    status: payment.status,
    amount: Number(payment.amount),
    pixQrCode: payment.pix_qr_code || null,
    pixCopyPaste: payment.pix_copy_paste || null,
    pixExpiresAt: payment.pix_expires_at || null,
    paidAt: payment.paid_at || null,
  };
}

/**
 * Resolve a identidade do pagador que o gateway precisa a partir do
 * próprio registro de usuário autenticado do CourseHub -- nunca de
 * algo que o cliente envie nesta requisição (não existe campo de
 * pagador no corpo da requisição, ver a rota).
 */
async function resolvePayer(connection, userId) {
  const [rows] = await connection.execute(`SELECT name, email FROM users WHERE id = ? LIMIT 1`, [userId]);
  const user = rows[0];

  if (!user) {
    throw createServiceError("Usuário autenticado não encontrado.", 404);
  }

  const [firstName, ...rest] = String(user.name || "").trim().split(/\s+/);

  return {
    email: user.email,
    firstName: firstName || undefined,
    lastName: rest.length > 0 ? rest.join(" ") : undefined,
  };
}

/**
 * Carrega a fatura que o aluno está tentando pagar E prova, na mesma
 * query, que ela pertence a ele -- a cadeia completa de propriedade
 * (usuário -> aluno -> contrato financeiro -> fatura) se reduz a um
 * join com `fc.student_id = ?` na cláusula WHERE. Deliberadamente
 * usa fc.student_id (não en.student_id via enrollments) -- um
 * contrato ainda em pending_payment não tem matrícula (enrollment_id
 * NULL) até o pagamento ser confirmado, mas já pertence ao aluno e
 * já pode receber pagamento. Um invoiceId que não bate (fatura de
 * outro aluno, ou uma que não existe) produz zero linhas nos dois
 * casos, então o chamador não consegue distinguir "não é sua" de
 * "não existe" -- deliberado, mesmo padrão do 404 usado no resto
 * deste código para acesso cross-tenant (ver assertParticipant no
 * módulo de chat).
 */
async function lockOwnedOpenInvoice(connection, { studentId, invoiceId }) {
  const [rows] = await connection.execute(
    `
      SELECT
        i.id, i.status, i.amount, i.description, i.financial_contract_id,
        fc.enrollment_id
      FROM invoices i
      INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
      WHERE i.id = ? AND fc.student_id = ?
      FOR UPDATE
    `,
    [invoiceId, studentId]
  );

  return rows[0] || null;
}

/**
 * Cria (ou reaproveita) uma tentativa de pagamento PIX para uma
 * fatura que pertence ao aluno autenticado. A chamada HTTP ao
 * gateway acontece FORA de qualquer transação/lock -- pode ser
 * lenta, e um lock de linha do banco nunca pode ficar aberto durante
 * uma ida e volta de rede até terceiros.
 */
async function createInvoicePayment(db, { userId, invoiceId, paymentMethod }) {
  const normalizedInvoiceId = Number(invoiceId);

  if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
    throw createServiceError("O identificador da fatura é obrigatório e deve ser válido.", 400);
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw createServiceError("Forma de pagamento não suportada. Utilize pix.", 400);
  }

  const studentId = await getStudentIdByUserId(db.promise(), userId);

  if (!studentId) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  const { paymentId, reused, gatewayInput } = await withTransaction(db, async (connection) => {
    const invoice = await lockOwnedOpenInvoice(connection, { studentId, invoiceId: normalizedInvoiceId });

    if (!invoice) {
      throw createServiceError("Fatura não encontrada.", 404);
    }

    if (invoice.status === "paid") {
      throw createServiceError("Esta fatura já está paga.", 409);
    }

    if (invoice.status === "cancelled") {
      throw createServiceError("Esta fatura foi cancelada.", 409);
    }

    if (invoice.status === "refunded") {
      throw createServiceError("Esta fatura foi reembolsada.", 409);
    }

    if (!OPEN_INVOICE_STATUSES.has(invoice.status)) {
      throw createServiceError("Esta fatura não está disponível para pagamento.", 409);
    }

    const amount = Number(invoice.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw createServiceError("Valor da fatura inválido.", 500);
    }

    const [attemptRows] = await connection.execute(
      `
        SELECT id, status, payment_method, gateway, pix_expires_at
        FROM payments
        WHERE invoice_id = ?
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedInvoiceId]
    );

    if (attemptRows.length > 0 && isReusableAttempt(attemptRows[0])) {
      return { paymentId: attemptRows[0].id, reused: true, gatewayInput: null };
    }

    const payer = await resolvePayer(connection, userId);
    const gatewayName = getPaymentGatewayName();

    const [insertResult] = await connection.execute(
      `
        INSERT INTO payments (
          invoice_id, gateway, gateway_payment_id, source, payment_method,
          amount, currency, status
        )
        VALUES (?, ?, ?, 'gateway', ?, ?, 'BRL', 'created')
      `,
      [normalizedInvoiceId, gatewayName, `pending_${crypto.randomUUID()}`, paymentMethod, amount]
    );

    const newPaymentId = insertResult.insertId;
    const externalReference = buildExternalReference({ invoiceId: normalizedInvoiceId, paymentId: newPaymentId });
    const idempotencyKey = buildIdempotencyKey({ paymentId: newPaymentId });

    await connection.execute(`UPDATE payments SET external_reference = ?, idempotency_key = ? WHERE id = ?`, [
      externalReference,
      idempotencyKey,
      newPaymentId,
    ]);

    return {
      paymentId: newPaymentId,
      reused: false,
      gatewayInput: {
        paymentId: newPaymentId,
        invoiceId: normalizedInvoiceId,
        paymentMethod,
        amount,
        currency: "BRL",
        description: invoice.description,
        externalReference,
        idempotencyKey,
        payer,
        notificationUrl: buildNotificationUrl(),
      },
    };
  });

  if (reused) {
    return toPaymentDto(await fetchOwnedPayment(db, { studentId, paymentId }));
  }

  const gateway = getPaymentGateway();
  let gatewayResult;

  try {
    gatewayResult = await gateway.createPayment(gatewayInput);
  } catch (error) {
    console.error("[studentPaymentService] gateway.createPayment failed", {
      paymentId,
      gateway: getPaymentGatewayName(),
      message: error.message,
    });

    await withTransaction(db, async (connection) => {
      const [rows] = await connection.execute(`SELECT status FROM payments WHERE id = ? FOR UPDATE`, [paymentId]);

      if (rows[0] && rows[0].status === "created") {
        assertValidTransition("created", "rejected");

        await connection.execute(
          `UPDATE payments SET status = 'rejected', rejected_at = NOW(), failure_code = 'gateway_create_failed', last_synced_at = NOW() WHERE id = ?`,
          [paymentId]
        );
      }
    });

    throw createServiceError("Não foi possível criar o pagamento. Tente novamente em instantes.", 502);
  }

  const activationResult = await withTransaction(db, async (connection) => {
    const [rows] = await connection.execute(
      `
        SELECT
          p.id, p.status, p.invoice_id, p.amount, p.currency,
          i.status AS invoice_status, i.amount AS invoice_amount, i.description AS invoice_description,
          i.financial_contract_id,
          fc.enrollment_id,
          fc.student_id, fc.course_id,
          c.name AS course_name
        FROM payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
        INNER JOIN courses c ON c.id = fc.course_id
        WHERE p.id = ?
        FOR UPDATE
      `,
      [paymentId]
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    assertValidTransition(row.status, gatewayResult.status);

    await connection.execute(
      `
        UPDATE payments
        SET gateway_payment_id = ?,
            status = ?,
            gateway_status = ?,
            gateway_status_detail = ?,
            pix_copy_paste = ?,
            pix_qr_code = ?,
            pix_expires_at = ?,
            last_synced_at = NOW()
        WHERE id = ?
      `,
      [
        gatewayResult.gatewayPaymentId,
        gatewayResult.status,
        gatewayResult.gatewayStatus || null,
        gatewayResult.gatewayStatusDetail || null,
        gatewayResult.pixCopyPaste || null,
        gatewayResult.pixQrCode || null,
        gatewayResult.pixExpiresAt || null,
        paymentId,
      ]
    );

    await connection.execute(
      `
        INSERT INTO payment_events (payment_id, event_type, previous_status, new_status, source, payload)
        VALUES (?, 'payment_created', ?, ?, 'system', ?)
      `,
      [
        paymentId,
        row.status,
        gatewayResult.status,
        JSON.stringify({ gatewayStatus: gatewayResult.gatewayStatus || null, gatewayStatusDetail: gatewayResult.gatewayStatusDetail || null }),
      ]
    );

    // Um gateway pode aprovar um pagamento instantaneamente mesmo
    // para métodos normalmente assíncronos -- reaproveita exatamente
    // a mesma lógica de aprovação que o webhook usa em vez de
    // duplicá-la aqui (isso já inclui a ativação do contrato, quando
    // esta é a fatura de ativação).
    if (gatewayResult.status === "approved") {
      const result = await applyApproval(db, connection, row, gatewayResult);
      return result.activationResult || null;
    }

    return null;
  });

  if (activationResult?.activated) {
    await dispatchActivationNotifications(db, activationResult);
  }

  return toPaymentDto(await fetchOwnedPayment(db, { studentId, paymentId }));
}

/**
 * GET /student/finance/payments/:paymentId -- a mesma cadeia de
 * propriedade da criação da fatura (usuário -> aluno -> matrícula ->
 * contrato financeiro -> fatura -> pagamento), então um aluno nunca
 * consegue ler a tentativa de pagamento de outro aluno adivinhando/
 * incrementando um id.
 */
async function fetchOwnedPayment(db, { studentId, paymentId }) {
  const [rows] = await db.promise().query(
    `
      SELECT p.*
      FROM payments p
      INNER JOIN invoices i ON i.id = p.invoice_id
      INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
      WHERE p.id = ? AND fc.student_id = ?
      LIMIT 1
    `,
    [paymentId, studentId]
  );

  return rows[0] || null;
}

async function getInvoicePaymentByUser(db, { userId, paymentId }) {
  const normalizedPaymentId = Number(paymentId);

  if (!Number.isInteger(normalizedPaymentId) || normalizedPaymentId <= 0) {
    throw createServiceError("O identificador do pagamento é obrigatório e deve ser válido.", 400);
  }

  const studentId = await getStudentIdByUserId(db.promise(), userId);

  if (!studentId) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  const payment = await fetchOwnedPayment(db, { studentId, paymentId: normalizedPaymentId });

  if (!payment) {
    throw createServiceError("Pagamento não encontrado.", 404);
  }

  return toPaymentDto(payment);
}

function buildNotificationUrl() {
  const base = process.env.MERCADO_PAGO_WEBHOOK_URL || process.env.BACKEND_PUBLIC_URL;

  if (!base) {
    return undefined;
  }

  return `${base.replace(/\/$/, "")}/api/webhooks/payments/mercado-pago`;
}

module.exports = {
  createInvoicePayment,
  getInvoicePaymentByUser,
};
