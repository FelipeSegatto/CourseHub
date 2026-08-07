const { withTransaction } = require("../../utils/dbTransaction");
const { createServiceError, assertParticipant } = require("./chatParticipantService");

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const MAX_BODY_LENGTH = 4000;

function normalizeLimit(limit) {
  const normalized = Number(limit);

  return Number.isInteger(normalized) && normalized > 0
    ? Math.min(normalized, MAX_LIMIT)
    : DEFAULT_LIMIT;
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || cursor === "") {
    return null;
  }

  const normalized = Number(cursor);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createServiceError("Cursor inválido.", 400);
  }

  return normalized;
}

/**
 * A soft-deleted message keeps its metadata (who/when) but never its
 * body, for every caller -- the "placeholder for participants, only
 * authorized supervision sees the original" split from the master
 * prompt is Etapa 12's job (chat_access_logs-gated reads); this
 * service has no supervision path yet, so it always applies the
 * placeholder rule uniformly.
 */
function mapMessageRow(row) {
  const isDeleted = Boolean(row.deleted_at);

  return {
    messageId: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name,
    replyToMessageId: row.reply_to_message_id,
    messageType: row.message_type,
    body: isDeleted ? null : row.body,
    isDeleted,
    editedAt: row.edited_at,
    createdAt: row.created_at,
  };
}

async function getMessageById(runner, messageId) {
  const [rows] = await runner.query(
    `
      SELECT
        cm.id, cm.conversation_id, cm.sender_user_id, cm.reply_to_message_id,
        cm.message_type, cm.body, cm.edited_at, cm.deleted_at, cm.created_at,
        u.name AS sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_user_id
      WHERE cm.id = ?
      LIMIT 1
    `,
    [messageId]
  );

  return rows.length > 0 ? mapMessageRow(rows[0]) : null;
}

/**
 * Transactional: validates participation + can_post + body length +
 * reply_to ownership, inserts the message, and bumps the
 * conversation's last_message_id/last_message_at -- all in the same
 * transaction, so a message is never visible without its conversation
 * being updated to match, and a rollback never leaves a stray
 * message. client_message_id + sender is the idempotency guard: a
 * repeated send with the same id from the same sender returns the
 * already-created message instead of duplicating -- checked upfront
 * (fast path for the common re-send) and again via ER_DUP_ENTRY
 * (handles two genuinely concurrent identical sends racing the
 * upfront check).
 */
async function createMessage(
  db,
  { conversationId, userId, body, clientMessageId = null, replyToMessageId = null, messageType = "text" }
) {
  const trimmedBody = typeof body === "string" ? body.trim() : "";

  if (!trimmedBody) {
    throw createServiceError("A mensagem não pode ficar vazia.", 400);
  }

  if (trimmedBody.length > MAX_BODY_LENGTH) {
    throw createServiceError(`A mensagem deve ter no máximo ${MAX_BODY_LENGTH} caracteres.`, 400);
  }

  return withTransaction(db, async (connection) => {
    const participant = await assertParticipant(connection, { conversationId, userId });

    if (!participant.canPost) {
      throw createServiceError("Você não pode enviar mensagens nesta conversa.", 403);
    }

    if (clientMessageId) {
      const [existingRows] = await connection.query(
        `SELECT id FROM chat_messages WHERE sender_user_id = ? AND client_message_id = ? LIMIT 1`,
        [userId, clientMessageId]
      );

      if (existingRows.length > 0) {
        return getMessageById(connection, existingRows[0].id);
      }
    }

    if (replyToMessageId) {
      const [replyRows] = await connection.query(
        `SELECT id FROM chat_messages WHERE id = ? AND conversation_id = ? LIMIT 1`,
        [replyToMessageId, conversationId]
      );

      if (replyRows.length === 0) {
        throw createServiceError("A mensagem respondida não pertence a esta conversa.", 400);
      }
    }

    let messageId;

    try {
      const [result] = await connection.query(
        `
          INSERT INTO chat_messages
            (conversation_id, sender_user_id, reply_to_message_id, client_message_id, message_type, body, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
        `,
        [conversationId, userId, replyToMessageId, clientMessageId, messageType, trimmedBody]
      );

      messageId = result.insertId;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY" && clientMessageId) {
        const [existingRows] = await connection.query(
          `SELECT id FROM chat_messages WHERE sender_user_id = ? AND client_message_id = ? LIMIT 1`,
          [userId, clientMessageId]
        );

        if (existingRows.length > 0) {
          return getMessageById(connection, existingRows[0].id);
        }
      }

      throw error;
    }

    await connection.query(
      `
        UPDATE chat_conversations
        SET last_message_id = ?, last_message_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `,
      [messageId, conversationId]
    );

    return getMessageById(connection, messageId);
  });
}

/**
 * Cursor pagination by chat_messages.id (never OFFSET), most recent
 * first -- cursor moves strictly older, matching "load older history
 * on scroll up".
 */
async function listMessages(db, { conversationId, userId, cursor, limit }) {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedCursor = normalizeCursor(cursor);

  await assertParticipant(db.promise(), { conversationId, userId });

  const conditions = ["cm.conversation_id = ?"];
  const params = [conversationId];

  if (normalizedCursor) {
    conditions.push("cm.id < ?");
    params.push(normalizedCursor);
  }

  const [rows] = await db.promise().query(
    `
      SELECT
        cm.id, cm.conversation_id, cm.sender_user_id, cm.reply_to_message_id,
        cm.message_type, cm.body, cm.edited_at, cm.deleted_at, cm.created_at,
        u.name AS sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY cm.id DESC
      LIMIT ?
    `,
    [...params, normalizedLimit + 1]
  );

  const hasMore = rows.length > normalizedLimit;
  const pageRows = hasMore ? rows.slice(0, normalizedLimit) : rows;

  return {
    items: pageRows.map(mapMessageRow),
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}

module.exports = {
  createServiceError,
  createMessage,
  listMessages,
  getMessageById,
};
