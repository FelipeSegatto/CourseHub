const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");

const {
  getStudentFinance,
} = require("../services/students/studentFinanceService");

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

module.exports = router;
