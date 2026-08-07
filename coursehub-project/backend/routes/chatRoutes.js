const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");
const { chatMessageRateLimiter } = require("../middlewares/rateLimiters");

const {
  getConversationForUser,
  listConversationsForUser,
  getUnreadConversationCount,
} = require("../services/chat/chatConversationService");

const {
  markConversationRead,
  archiveConversationForUser,
} = require("../services/chat/chatParticipantService");

const { createMessage, listMessages } = require("../services/chat/chatMessageService");

const {
  listAcademicContacts,
  openAcademicPeerConversation,
} = require("../services/chat/chatAcademicPeerService");

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
 * GET /api/chat/conversations
 * Personal conversation list. userId always comes from the token --
 * never a query/body param.
 */
router.get("/chat/conversations", authenticateToken, async (req, res) => {
  try {
    const result = await listConversationsForUser(db, {
      userId: req.auth.userId,
      cursor: req.query.cursor,
      limit: req.query.limit,
      includeArchived: req.query.includeArchived === "true",
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao buscar conversas.");
  }
});

/**
 * GET /api/chat/unread-count
 */
router.get("/chat/unread-count", authenticateToken, async (req, res) => {
  try {
    const result = await getUnreadConversationCount(db, { userId: req.auth.userId });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao buscar contador de conversas.");
  }
});

/**
 * GET /api/chat/conversations/:conversationId
 * 404 (never 403) whether the id doesn't exist or the caller isn't a
 * participant -- knowing the id must never be enough to learn
 * anything about the conversation.
 */
router.get("/chat/conversations/:conversationId", authenticateToken, async (req, res) => {
  try {
    const result = await getConversationForUser(db, {
      conversationId: req.params.conversationId,
      userId: req.auth.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao buscar conversa.");
  }
});

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Cursor pagination by message id, never OFFSET.
 */
router.get("/chat/conversations/:conversationId/messages", authenticateToken, async (req, res) => {
  try {
    const result = await listMessages(db, {
      conversationId: req.params.conversationId,
      userId: req.auth.userId,
      cursor: req.query.cursor,
      limit: req.query.limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao buscar mensagens.");
  }
});

/**
 * POST /api/chat/conversations/:conversationId/messages
 * clientMessageId makes a repeated send idempotent -- the same id
 * from the same sender returns the already-created message instead
 * of duplicating it.
 */
router.post("/chat/conversations/:conversationId/messages", authenticateToken, chatMessageRateLimiter, async (req, res) => {
  try {
    const result = await createMessage(db, {
      conversationId: req.params.conversationId,
      userId: req.auth.userId,
      body: req.body.body,
      clientMessageId: req.body.clientMessageId,
      replyToMessageId: req.body.replyToMessageId,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao enviar mensagem.");
  }
});

/**
 * PATCH /api/chat/conversations/:conversationId/read
 */
router.patch("/chat/conversations/:conversationId/read", authenticateToken, async (req, res) => {
  try {
    const result = await markConversationRead(db, {
      conversationId: req.params.conversationId,
      userId: req.auth.userId,
      lastReadMessageId: req.body.lastReadMessageId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao marcar conversa como lida.");
  }
});

/**
 * PATCH /api/chat/conversations/:conversationId/archive
 */
router.patch("/chat/conversations/:conversationId/archive", authenticateToken, async (req, res) => {
  try {
    const result = await archiveConversationForUser(db, {
      conversationId: req.params.conversationId,
      userId: req.auth.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao arquivar conversa.");
  }
});

/**
 * GET /api/chat/academic-contacts
 * Student-only: colleagues sharing an active enrollment with the
 * caller. Public academic identity only (name, avatar) -- never
 * email/phone/document.
 */
router.get("/chat/academic-contacts", authenticateToken, authorizeRoles("student"), async (req, res) => {
  try {
    const result = await listAcademicContacts(db, {
      userId: req.auth.userId,
      search: req.query.search,
    });

    return res.status(200).json({ items: result });
  } catch (error) {
    return handleServiceError(res, error, "Erro ao buscar colegas.");
  }
});

/**
 * POST /api/chat/academic-conversations
 * Student-only. Idempotent: opening the same pair twice returns the
 * same conversation, never a duplicate or an error.
 */
router.post("/chat/academic-conversations", authenticateToken, authorizeRoles("student"), async (req, res) => {
  try {
    const result = await openAcademicPeerConversation(db, {
      userId: req.auth.userId,
      peerUserId: req.body.peerUserId,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error, "Erro ao iniciar conversa.");
  }
});

module.exports = router;
