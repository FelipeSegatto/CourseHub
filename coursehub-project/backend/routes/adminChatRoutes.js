const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");

const {
  listAdministrativeQueue,
  assignAdministrativeTicket,
} = require("../services/chat/chatAdministrativeSupportService");

const router = express.Router();

function handleServiceError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({
    message: fallbackMessage,
    error: error.message,
    code: error.code,
    sqlMessage: error.sqlMessage,
  });
}

/**
 * GET /api/admin/chat/administrative-tickets
 * Admin-facing queue -- not scoped by chat_participants membership,
 * since an admin who hasn't claimed a ticket yet still needs to see
 * it exists. Any active role='admin' user sees the whole queue (no
 * category-level granular permission exists yet -- see the service's
 * own docstring for why that's deliberately deferred).
 */
router.get(
  "/admin/chat/administrative-tickets",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await listAdministrativeQueue(db, {
        category: req.query.category,
        status: req.query.status,
        unassignedOnly: req.query.unassignedOnly === "true",
        assignedToUserId: req.query.assignedToMe === "true" ? req.auth.userId : undefined,
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao buscar fila de atendimento.");
    }
  }
);

/**
 * PATCH /api/admin/chat/conversations/:conversationId/assign
 * Claiming an unassigned ticket and reassigning an already-assigned
 * one are the same action -- the caller (the admin themself, from
 * the token, never a body param) becomes assigned_user_id.
 */
router.patch(
  "/admin/chat/conversations/:conversationId/assign",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await assignAdministrativeTicket(db, {
        conversationId: req.params.conversationId,
        adminUserId: req.auth.userId,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao assumir atendimento.");
    }
  }
);

module.exports = router;
