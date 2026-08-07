const { withTransaction } = require("../../utils/dbTransaction");
const {
  createServiceError,
  assertParticipant,
  addParticipant,
} = require("./chatParticipantService");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

function mapConversationRow(row) {
  return {
    conversationId: row.id,
    type: row.type,
    channelKind: row.channel_kind,
    title: row.title,
    category: row.category,
    courseId: row.course_id,
    classId: row.class_id,
    status: row.status,
    priority: row.priority,
    lastMessageId: row.last_message_id,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Generic conversation creation shared by every modality-specific
 * "open a conversation" flow (built per modality starting Etapa 8) --
 * inserts the conversation and every initial participant in one
 * transaction. Etapa 7 has no public route that calls this directly;
 * it's the building block every later chat stage's opening endpoint
 * wraps, and is exercised here only by tests.
 */
async function createConversation(
  db,
  {
    type,
    channelKind,
    title = null,
    category = null,
    courseId = null,
    classId = null,
    createdByUserId,
    initiatorRole,
    conversationKey = null,
    participants,
  }
) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw createServiceError("Uma conversa precisa de ao menos um participante.", 400);
  }

  try {
    return await withTransaction(db, async (connection) => {
      const [result] = await connection.query(
        `
          INSERT INTO chat_conversations
            (type, channel_kind, title, category, course_id, class_id, created_by_user_id, initiator_role, conversation_key, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())
        `,
        [
          type,
          channelKind,
          title,
          category,
          courseId,
          classId,
          createdByUserId,
          initiatorRole,
          conversationKey,
        ]
      );

      const conversationId = result.insertId;

      for (const participant of participants) {
        await addParticipant(connection, {
          conversationId,
          userId: participant.userId,
          participantRole: participant.participantRole,
          canPost: participant.canPost !== false,
        });
      }

      return { conversationId };
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createServiceError("Já existe uma conversa com esta configuração.", 409);
    }

    throw error;
  }
}

/**
 * 404 (never 403) whether the id doesn't exist or the caller was
 * never a participant -- assertParticipant already guarantees that,
 * this just adds the conversation's own fields on top.
 */
async function getConversationForUser(db, { conversationId, userId }) {
  const runner = db.promise();

  await assertParticipant(runner, { conversationId, userId });

  const [rows] = await runner.query(
    `
      SELECT
        cc.id, cc.type, cc.channel_kind, cc.title, cc.category,
        cc.course_id, cc.class_id, cc.status, cc.priority,
        cc.last_message_id, cc.last_message_at,
        cc.created_at, cc.updated_at
      FROM chat_conversations cc
      WHERE cc.id = ?
      LIMIT 1
    `,
    [conversationId]
  );

  if (rows.length === 0) {
    throw createServiceError("Conversa não encontrada.", 404);
  }

  return mapConversationRow(rows[0]);
}

/**
 * Cursor pagination by chat_conversations.id (never OFFSET), most
 * recently created first. Ordering by last activity instead of
 * creation order is a reasonable future refinement once there's an
 * actual chat UI (Etapa 8+) to validate it against -- no route
 * depends on the current ordering yet.
 */
async function listConversationsForUser(db, { userId, cursor, limit, includeArchived = false }) {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedCursor = normalizeCursor(cursor);

  const conditions = ["cp.user_id = ?", "cp.left_at IS NULL"];
  const params = [userId];

  if (!includeArchived) {
    conditions.push("cp.archived_at IS NULL");
  }

  if (normalizedCursor) {
    conditions.push("cc.id < ?");
    params.push(normalizedCursor);
  }

  const [rows] = await db.promise().query(
    `
      SELECT
        cc.id, cc.type, cc.channel_kind, cc.title, cc.category,
        cc.course_id, cc.class_id, cc.status, cc.priority,
        cc.last_message_id, cc.last_message_at,
        cc.created_at, cc.updated_at
      FROM chat_conversations cc
      INNER JOIN chat_participants cp ON cp.conversation_id = cc.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY cc.id DESC
      LIMIT ?
    `,
    [...params, normalizedLimit + 1]
  );

  const hasMore = rows.length > normalizedLimit;
  const pageRows = hasMore ? rows.slice(0, normalizedLimit) : rows;

  return {
    items: pageRows.map(mapConversationRow),
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}

/**
 * Counts conversations with unseen activity (last_message_id ahead
 * of the participant's own last_read_message_id), not raw unread
 * message volume -- same "how many things need my attention" idea as
 * the notifications unread count, applied to conversations instead
 * of individual items.
 */
async function getUnreadConversationCount(db, { userId }) {
  const [rows] = await db.promise().query(
    `
      SELECT COUNT(*) AS total
      FROM chat_participants cp
      INNER JOIN chat_conversations cc ON cc.id = cp.conversation_id
      WHERE cp.user_id = ?
        AND cp.left_at IS NULL
        AND cp.archived_at IS NULL
        AND cc.last_message_id IS NOT NULL
        AND (cp.last_read_message_id IS NULL OR cp.last_read_message_id < cc.last_message_id)
    `,
    [userId]
  );

  return { unreadCount: Number(rows[0]?.total || 0) };
}

module.exports = {
  createServiceError,
  createConversation,
  getConversationForUser,
  listConversationsForUser,
  getUnreadConversationCount,
};
