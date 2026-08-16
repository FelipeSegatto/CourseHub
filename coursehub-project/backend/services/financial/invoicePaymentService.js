const crypto = require("crypto");

const { withTransaction } = require("../../utils/dbTransaction");
const { createServiceError } = require("../classes/classAccessService");
const { assertValidTransition } = require("./paymentStateMachine");
const { applyApproval } = require("./paymentProcessingService");
const { dispatchActivationNotifications } = require("./activateContractService");
const { getPaymentGateway, getPaymentGatewayName } = require("../paymentGateway/paymentGatewayFactory");
const { buildExternalReference, buildIdempotencyKey } = require("../paymentGateway/paymentGatewayContract");

/**
 * startInvoicePayment -- único lugar que fala com gateway.createPayment
 * para os canais baseados em gateway (checkout autenticado de fatura,
 * checkout autenticado de novo curso, checkout público e link privado
 * de invoice). Generaliza a lógica que antes vivia só em
 * studentPaymentService.js#createInvoicePayment para os 3 métodos
 * (pix/boleto/credit_card) e para dois "escopos de acesso":
 *
 *   { scope: "student", studentId, userId } -- aluno autenticado,
 *     ownership provada por fc.student_id = ? na trava da invoice.
 *
 *   { scope: "invoice", invoiceId } -- link privado de invoice (ou
 *     conclusão do checkout público), ownership já provada por quem
 *     chamou (sessão de pagamento / criação transacional do contrato)
 *     -- trava só por invoices.id, sem predicado extra de dono.
 *
 * invoices.amount é sempre a única fonte do valor -- nunca aceito de
 * quem chama esta função. A chamada de rede ao gateway acontece FORA
 * de qualquer transação/lock, igual ao comportamento original. Esta
 * função NUNCA marca a invoice como paga pelo próprio retorno da
 * chamada ao gateway -- só applyApproval (chamado aqui quando o
 * gateway aprova instantaneamente, ou pelo webhook depois) faz isso.
 */
const ALLOWED_PAYMENT_METHODS = ["pix", "boleto", "credit_card"];
const OPEN_INVOICE_STATUSES = new Set(["pending", "processing", "overdue"]);

function isReusableAttempt(payment, paymentMethod) {
  if (payment.status !== "pending" || payment.payment_method !== paymentMethod) {
    return false;
  }

  if (payment.gateway !== getPaymentGatewayName()) {
    return false;
  }

  // Uma tentativa de cartão nunca é reaproveitada -- cada tentativa
  // exige uma tokenização client-side nova, o token anterior não pode
  // ser reutilizado pelo provider.
  if (paymentMethod === "credit_card") {
    return false;
  }

  if (paymentMethod === "pix") {
    if (!payment.pix_expires_at) {
      return true;
    }

    return new Date(payment.pix_expires_at).getTime() > Date.now();
  }

  // boleto
  if (!payment.boleto_due_date) {
    return true;
  }

  return new Date(payment.boleto_due_date).getTime() > Date.now();
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
    boletoBarcode: payment.boleto_barcode || null,
    boletoUrl: payment.boleto_url || null,
    boletoDueDate: payment.boleto_due_date || null,
    cardBrand: payment.card_brand || null,
    cardLastFour: payment.card_last_four || null,
    cardInstallments: payment.card_installments || null,
    paidAt: payment.paid_at || null,
  };
}

/**
 * Resolve a identidade do pagador que o gateway precisa. Para o
 * escopo "student", vem do próprio registro autenticado do CourseHub
 * (nunca de algo enviado pelo cliente nesta requisição) mais o CPF do
 * aluno, quando existir, para boleto/cartão. Para o escopo "invoice"
 * (contratante externo/checkout), vem do snapshot já congelado em
 * financial_contracts.contracting_party_* -- já carregado na mesma
 * query que travou a invoice, nunca uma segunda leitura de uma fonte
 * que o cliente controla.
 */
async function resolvePayer(connection, { accessContext, row }) {
  if (accessContext.scope === "student") {
    const [userRows] = await connection.execute(
      `SELECT name, email FROM users WHERE id = ? LIMIT 1`,
      [accessContext.userId]
    );

    const user = userRows[0];

    if (!user) {
      throw createServiceError("Usuário autenticado não encontrado.", 404);
    }

    const [studentRows] = await connection.execute(`SELECT cpf FROM students WHERE id = ? LIMIT 1`, [
      accessContext.studentId,
    ]);

    const [firstName, ...rest] = String(user.name || "").trim().split(/\s+/);

    return {
      email: user.email,
      firstName: firstName || undefined,
      lastName: rest.length > 0 ? rest.join(" ") : undefined,
      documentType: studentRows[0]?.cpf ? "cpf" : undefined,
      documentNumber: studentRows[0]?.cpf || undefined,
    };
  }

  const [firstName, ...rest] = String(row.contracting_party_name || "").trim().split(/\s+/);

  return {
    email: row.contracting_party_email,
    firstName: firstName || undefined,
    lastName: rest.length > 0 ? rest.join(" ") : undefined,
    documentType: row.contracting_party_document ? "cpf" : undefined,
    documentNumber: row.contracting_party_document || undefined,
  };
}

/** Carrega + trava a invoice, provando ownership de acordo com o escopo de acesso. */
async function lockInvoiceForPayment(connection, { accessContext, invoiceId }) {
  const baseSelect = `
    SELECT
      i.id, i.status, i.amount, i.description, i.financial_contract_id,
      fc.enrollment_id, fc.student_id,
      fc.contracting_party_name, fc.contracting_party_document, fc.contracting_party_email
    FROM invoices i
    INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
    WHERE i.id = ?
  `;

  if (accessContext.scope === "student") {
    const [rows] = await connection.execute(`${baseSelect} AND fc.student_id = ? FOR UPDATE`, [
      invoiceId,
      accessContext.studentId,
    ]);

    return rows[0] || null;
  }

  const [rows] = await connection.execute(`${baseSelect} FOR UPDATE`, [invoiceId]);

  return rows[0] || null;
}

async function startInvoicePayment(
  db,
  { invoiceId, paymentMethod, cardToken, cardInstallments, cardPaymentMethodId, accessContext }
) {
  const normalizedInvoiceId = Number(invoiceId);

  if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
    throw createServiceError("O identificador da fatura é obrigatório e deve ser válido.", 400);
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw createServiceError(
      "Forma de pagamento não suportada. Utilize pix, boleto ou credit_card.",
      400
    );
  }

  if (paymentMethod === "credit_card" && !cardToken) {
    throw createServiceError("Token de cartão é obrigatório para pagamento com cartão.", 400);
  }

  const { paymentId, reused, gatewayInput } = await withTransaction(db, async (connection) => {
    const invoice = await lockInvoiceForPayment(connection, {
      accessContext,
      invoiceId: normalizedInvoiceId,
    });

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
        SELECT id, status, payment_method, gateway, pix_expires_at, boleto_due_date
        FROM payments
        WHERE invoice_id = ?
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedInvoiceId]
    );

    if (attemptRows.length > 0 && isReusableAttempt(attemptRows[0], paymentMethod)) {
      return { paymentId: attemptRows[0].id, reused: true, gatewayInput: null };
    }

    const payer = await resolvePayer(connection, { accessContext, row: invoice });
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
        cardToken: paymentMethod === "credit_card" ? cardToken : undefined,
        cardInstallments: paymentMethod === "credit_card" ? cardInstallments : undefined,
        cardPaymentMethodId: paymentMethod === "credit_card" ? cardPaymentMethodId : undefined,
        notificationUrl: buildNotificationUrl(),
      },
    };
  });

  if (reused) {
    return toPaymentDto(await fetchPaymentByAccessContext(db, { paymentId, accessContext }));
  }

  const gateway = getPaymentGateway();
  let gatewayResult;

  try {
    gatewayResult = await gateway.createPayment(gatewayInput);
  } catch (error) {
    console.error("[invoicePaymentService] gateway.createPayment failed", {
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
            boleto_barcode = ?,
            boleto_url = ?,
            boleto_due_date = ?,
            card_brand = ?,
            card_last_four = ?,
            card_installments = ?,
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
        gatewayResult.boletoBarcode || null,
        gatewayResult.boletoUrl || null,
        gatewayResult.boletoDueDate || null,
        gatewayResult.cardBrand || null,
        gatewayResult.cardLastFour || null,
        gatewayResult.cardInstallments || null,
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

  return toPaymentDto(await fetchPaymentByAccessContext(db, { paymentId, accessContext }));
}

/**
 * Lê um pagamento comprovando ownership de acordo com o escopo de
 * acesso -- mesma cadeia de propriedade que a criação, então nenhum
 * canal consegue ler a tentativa de pagamento de uma invoice/aluno
 * diferente adivinhando/incrementando um id.
 */
async function fetchPaymentByAccessContext(db, { paymentId, accessContext }) {
  if (accessContext.scope === "student") {
    const [rows] = await db.promise().query(
      `
        SELECT p.*
        FROM payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
        WHERE p.id = ? AND fc.student_id = ?
        LIMIT 1
      `,
      [paymentId, accessContext.studentId]
    );

    return rows[0] || null;
  }

  const [rows] = await db.promise().query(
    `
      SELECT p.*
      FROM payments p
      WHERE p.id = ? AND p.invoice_id = ?
      LIMIT 1
    `,
    [paymentId, accessContext.invoiceId]
  );

  return rows[0] || null;
}

async function getInvoicePaymentByAccessContext(db, { paymentId, accessContext }) {
  const normalizedPaymentId = Number(paymentId);

  if (!Number.isInteger(normalizedPaymentId) || normalizedPaymentId <= 0) {
    throw createServiceError("O identificador do pagamento é obrigatório e deve ser válido.", 400);
  }

  const payment = await fetchPaymentByAccessContext(db, { paymentId: normalizedPaymentId, accessContext });

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
  startInvoicePayment,
  getInvoicePaymentByAccessContext,
  toPaymentDto,
};
