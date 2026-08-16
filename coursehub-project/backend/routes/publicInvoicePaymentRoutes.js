/**
 * Checkout privado de invoice -- link seguro para um contratante
 * (com ou sem conta CourseHub) pagar uma cobrança específica sem
 * login. Todo acesso passa primeiro por uma troca de token por sessão
 * (POST /session); as demais rotas dependem só do cookie
 * HTTP-only resultante (requireInvoicePaymentSession), nunca de um
 * invoiceId enviado pelo cliente.
 */
const express = require("express");
const db = require("../db");
const requireInvoicePaymentSession = require("../middlewares/requireInvoicePaymentSession");
const {
  invoicePaymentLinkAccessRateLimiter,
  publicInvoicePaymentCreateRateLimiter,
} = require("../middlewares/rateLimiters");
const {
  exchangeInvoicePaymentToken,
  getInvoicePaymentSessionSnapshot,
} = require("../services/financial/invoicePaymentAccessService");
const {
  startInvoicePayment,
  getInvoicePaymentByAccessContext,
} = require("../services/financial/invoicePaymentService");
const {
  setInvoicePaymentSessionCookie,
} = require("../utils/cookies");
const { INVOICE_PAYMENT_SESSION_TTL_MINUTES } = require("../config/checkoutConfig");

const router = express.Router();

/**
 * POST /api/public/invoice-payment/session
 * Troca o token bruto do link (enviado só nesta chamada, uma única
 * vez) por uma sessão curta -- o frontend remove o token da URL
 * (history.replaceState) assim que esta chamada retorna.
 */
router.post("/session", invoicePaymentLinkAccessRateLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};

    const { rawSessionToken, expiresAt } = await exchangeInvoicePaymentToken(db, token);

    setInvoicePaymentSessionCookie(res, rawSessionToken, {
      maxAgeMs: INVOICE_PAYMENT_SESSION_TTL_MINUTES * 60 * 1000,
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json({ expiresAt });
  } catch (error) {
    console.error("Erro ao trocar token de pagamento de fatura:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Não foi possível abrir o link de pagamento.",
    });
  }
});

/**
 * GET /api/public/invoice-payment/me
 * Leitura mínima autorizada só pela sessão -- nunca aceita um
 * invoiceId vindo do cliente.
 */
router.get("/me", requireInvoicePaymentSession, async (req, res) => {
  try {
    const snapshot = await getInvoicePaymentSessionSnapshot(db, req.invoicePaymentSession.invoiceId);

    res.set("Cache-Control", "no-store");

    return res.status(200).json({ data: snapshot });
  } catch (error) {
    console.error("Erro ao consultar cobrança via link privado:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Não foi possível carregar a cobrança.",
    });
  }
});

/**
 * POST /api/public/invoice-payment/payments
 * Inicia (ou reaproveita) uma tentativa de pagamento para a invoice da
 * sessão -- mesmo motor central usado pelo checkout autenticado e
 * público (startInvoicePayment), que sempre relê a invoice do banco e
 * recusa qualquer tentativa nova se ela já estiver paid/cancelled/
 * refunded.
 */
router.post("/payments", requireInvoicePaymentSession, publicInvoicePaymentCreateRateLimiter, async (req, res) => {
  try {
    const { paymentMethod, cardToken, cardInstallments, cardPaymentMethodId } = req.body || {};

    const result = await startInvoicePayment(db, {
      invoiceId: req.invoicePaymentSession.invoiceId,
      paymentMethod,
      cardToken,
      cardInstallments,
      cardPaymentMethodId,
      accessContext: { scope: "invoice", invoiceId: req.invoicePaymentSession.invoiceId },
    });

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error("Erro ao iniciar pagamento via link privado:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Não foi possível iniciar o pagamento.",
    });
  }
});

/**
 * GET /api/public/invoice-payment/payments/:paymentId
 * Usado pelo polling da tela de pagamento -- ownership sempre
 * verificado contra req.invoicePaymentSession.invoiceId, nunca contra
 * algo enviado pelo cliente além do próprio paymentId na URL.
 */
router.get("/payments/:paymentId", requireInvoicePaymentSession, async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);

    const payment = await getInvoicePaymentByAccessContext(db, {
      paymentId,
      accessContext: { scope: "invoice", invoiceId: req.invoicePaymentSession.invoiceId },
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json({ data: payment });
  } catch (error) {
    console.error("Erro ao consultar pagamento via link privado:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Não foi possível consultar o pagamento.",
    });
  }
});

module.exports = router;
