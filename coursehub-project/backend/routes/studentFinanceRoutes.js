const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const { paymentCreateRateLimiter } = require("../middlewares/rateLimiters");

const {
  getStudentFinance,
} = require("../services/students/studentFinanceService");

const {
  createInvoicePayment,
  getInvoicePaymentByUser,
} = require("../services/financial/studentPaymentService");

const router = express.Router();

/**
 * GET /api/student/finance
 */
router.get(
  "/student/finance",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const result = await getStudentFinance(db, req.auth.userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros do aluno:", error);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode
          ? error.message
          : "Erro interno ao buscar os dados financeiros.",
      });
    }
  }
);

/**
 * POST /api/student/finance/invoices/:invoiceId/payments
 *
 * O corpo da requisição carrega SOMENTE paymentMethod -- invoiceId
 * vem da URL e amount/currency/description são lidos do banco de
 * dados dentro do service. Qualquer outra propriedade que o cliente
 * envie (amount, status, gateway, studentId...) simplesmente nunca é
 * lida, então tentativas de mass assignment contra este endpoint não
 * têm efeito -- ver seção 92 das notas de hardening do gateway de
 * pagamentos.
 */
router.post(
  "/student/finance/invoices/:invoiceId/payments",
  authenticateToken,
  authorizeRoles("student"),
  paymentCreateRateLimiter,
  async (req, res) => {
    try {
      const { paymentMethod } = req.body || {};

      const result = await createInvoicePayment(db, {
        userId: req.auth.userId,
        invoiceId: req.params.invoiceId,
        paymentMethod,
      });

      return res.status(201).json({ data: result });
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : "Não foi possível criar o pagamento.",
      });
    }
  }
);

/**
 * GET /api/student/finance/payments/:paymentId
 */
router.get(
  "/student/finance/payments/:paymentId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const result = await getInvoicePaymentByUser(db, {
        userId: req.auth.userId,
        paymentId: req.params.paymentId,
      });

      return res.status(200).json({ data: result });
    } catch (error) {
      console.error("Erro ao consultar pagamento:", error);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : "Não foi possível consultar o pagamento.",
      });
    }
  }
);

module.exports = router;
