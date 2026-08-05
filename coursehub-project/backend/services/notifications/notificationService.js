const {
  getNotificationType,
  assertRequiredContext,
  resolvePriority,
  EMAIL_POLICIES,
} = require("./notificationTypeRegistry");

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw createServiceError("At least one recipient is required.", 400);
  }

  const byUserId = new Map();

  for (const recipient of recipients) {
    const userId = Number(recipient?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw createServiceError("Every recipient requires a valid userId.", 400);
    }

    if (!recipient.email) {
      throw createServiceError(`Recipient ${userId} is missing a resolved email.`, 400);
    }

    if (!byUserId.has(userId)) {
      byUserId.set(userId, { ...recipient, userId });
    }
  }

  return Array.from(byUserId.values());
}

/**
 * "essential" always gets an email row (opt-out is ignored).
 * "default_on" gets one unless the user explicitly disabled the
 * category. "default_off" only gets one if the user explicitly
 * enabled the category. Absence of a preference row always falls
 * back to the policy's own default -- this function never invents a
 * preference row, it only reads.
 */
async function resolveEmailEligibility(connection, { userId, category, emailPolicy }) {
  if (emailPolicy === "essential") {
    return { eligible: true, skipReason: null };
  }

  const [rows] = await connection.query(
    `SELECT email_enabled FROM notification_preferences WHERE user_id = ? AND category = ? LIMIT 1`,
    [userId, category]
  );

  const preference = rows[0] || null;

  if (emailPolicy === "default_on") {
    const eligible = !preference || Boolean(preference.email_enabled);

    return { eligible, skipReason: eligible ? null : "user_opted_out" };
  }

  // default_off
  const eligible = Boolean(preference) && Boolean(preference.email_enabled);

  return { eligible, skipReason: eligible ? null : "default_off_not_opted_in" };
}

/**
 * Creates a notification event + its recipients + their delivery
 * rows in a single transaction. Idempotent on
 * (type -> buildDeduplicationKey(context)): a second call with the
 * same logical event is a no-op that returns the existing
 * notification untouched -- it never adds recipients on a retry,
 * matching the "an event never rewrites/re-fans-out" rule.
 *
 * `recipients` must already be resolved by the caller (userId, role,
 * name, email) -- this stage has no domain resolvers yet (those are
 * stage 5); this function only does the generic materialization
 * part: dedup, fan-out, and email-eligibility.
 */
async function createNotificationEvent(
  db,
  { type, sourceType, sourceId, actorUserId, courseId, classId, context = {}, recipients, excludeActor = true }
) {
  const definition = getNotificationType(type);

  assertRequiredContext(definition, context);

  const normalizedRecipients = normalizeRecipients(recipients).filter(
    (recipient) => !excludeActor || Number(recipient.userId) !== Number(actorUserId)
  );

  if (normalizedRecipients.length === 0) {
    throw createServiceError(
      `Notification type "${type}" resolved to zero recipients after excluding the actor.`,
      400
    );
  }

  const deduplicationKey = definition.buildDeduplicationKey(context);

  if (!deduplicationKey || typeof deduplicationKey !== "string") {
    throw createServiceError(
      `Notification type "${type}" produced an invalid deduplication key.`,
      500
    );
  }

  const priority = resolvePriority(definition, context);

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    let notificationId;
    let deduplicated = false;

    try {
      const [insertResult] = await connection.query(
        `
          INSERT INTO notifications
          (type, category, priority, title, message, source_type, source_id,
           actor_user_id, course_id, class_id, deduplication_key, metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          type,
          definition.category,
          priority,
          definition.buildTitle(context, null),
          definition.buildMessage(context, null),
          sourceType,
          sourceId ?? null,
          actorUserId ?? null,
          courseId ?? null,
          classId ?? null,
          deduplicationKey,
          context.metadata ? JSON.stringify(context.metadata) : null,
        ]
      );

      notificationId = insertResult.insertId;
    } catch (error) {
      if (error.code !== "ER_DUP_ENTRY") {
        throw error;
      }

      deduplicated = true;

      const [existingRows] = await connection.query(
        `SELECT id FROM notifications WHERE deduplication_key = ? LIMIT 1`,
        [deduplicationKey]
      );

      if (existingRows.length === 0) {
        throw createServiceError(
          "Duplicate key reported but no existing notification found.",
          500
        );
      }

      notificationId = existingRows[0].id;
    }

    if (deduplicated) {
      await connection.commit();

      return { notificationId, deduplicated: true, recipientIds: [] };
    }

    const recipientIds = [];

    for (const recipient of normalizedRecipients) {
      const actionPath = definition.buildActionPath(context, recipient.role);

      const [recipientResult] = await connection.query(
        `
          INSERT INTO notification_recipients
          (notification_id, user_id, action_path, created_at)
          VALUES (?, ?, ?, NOW())
        `,
        [notificationId, recipient.userId, actionPath]
      );

      const recipientId = recipientResult.insertId;

      recipientIds.push(recipientId);

      const { eligible, skipReason } = await resolveEmailEligibility(connection, {
        userId: recipient.userId,
        category: definition.category,
        emailPolicy: definition.emailPolicy,
      });

      await connection.query(
        `
          INSERT INTO notification_deliveries
          (recipient_id, channel, destination_snapshot, status, next_attempt_at, skip_reason, created_at, updated_at)
          VALUES (?, 'email', ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          recipientId,
          recipient.email,
          eligible ? "pending" : "skipped",
          eligible ? new Date() : null,
          eligible ? null : skipReason,
        ]
      );
    }

    await connection.commit();

    return { notificationId, deduplicated: false, recipientIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createServiceError,
  createNotificationEvent,
  EMAIL_POLICIES,
};
