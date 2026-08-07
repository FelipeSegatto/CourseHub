const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");

const {
  listAdministrativeQueue,
  assignAdministrativeTicket,
} = require("../services/chat/chatAdministrativeSupportService");

const {
  listStaffQueue,
  openStaffConversation,
  assignStaffTicket,
} = require("../services/chat/chatStaffSupportService");

const router = express.Router();

// Both ticket-style admin-queue modalities share the same assign
// route -- the conversation's own type decides which service handles
// the claim, so the client never has to know or supply it.
const ASSIGN_HANDLERS_BY_TYPE = {
  administrative_support: assignAdministrativeTicket,
  staff_support: assignStaffTicket,
};

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
 * GET /api/admin/chat/staff-tickets
 * Same shape as the administrative-tickets queue, for teacher <->
 * admin conversations instead of student <-> admin.
 */
router.get(
  "/admin/chat/staff-tickets",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await listStaffQueue(db, {
        category: req.query.category,
        status: req.query.status,
        unassignedOnly: req.query.unassignedOnly === "true",
        assignedToUserId: req.query.assignedToMe === "true" ? req.auth.userId : undefined,
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao buscar fila de atendimento a professores.");
    }
  }
);

/**
 * POST /api/admin/chat/staff-conversations
 * Admin-initiated half of staff_support -- the "bidirectional" side.
 * The admin picks a specific teacher; both are participants from
 * creation, self-assigned to the admin who opened it.
 */
router.post(
  "/admin/chat/staff-conversations",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await openStaffConversation(db, {
        adminUserId: req.auth.userId,
        teacherUserId: req.body.teacherUserId,
        category: req.body.category,
        subject: req.body.subject,
        body: req.body.body,
      });

      return res.status(201).json(result);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao iniciar conversa com o professor.");
    }
  }
);

/**
 * PATCH /api/admin/chat/conversations/:conversationId/assign
 * Claiming an unassigned ticket and reassigning an already-assigned
 * one are the same action -- the caller (the admin themself, from
 * the token, never a body param) becomes assigned_user_id. Shared by
 * every ticket-style admin-queue modality; the conversation's own
 * type (looked up here, never trusted from the client) picks which
 * service actually performs the claim.
 */
router.patch(
  "/admin/chat/conversations/:conversationId/assign",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [typeRows] = await db
        .promise()
        .query("SELECT type FROM chat_conversations WHERE id = ? LIMIT 1", [req.params.conversationId]);

      const handler = ASSIGN_HANDLERS_BY_TYPE[typeRows[0]?.type];

      if (!handler) {
        return res.status(404).json({ message: "Protocolo não encontrado." });
      }

      const result = await handler(db, {
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
