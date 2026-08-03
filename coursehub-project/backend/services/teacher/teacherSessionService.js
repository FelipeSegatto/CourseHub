const { createServiceError } = require("../classes/classAccessService");
const { requireOwnedClass } = require("./teacherClassService");

const ALLOWED_SESSION_TYPES = new Set([
  "class",
  "review",
  "exam",
  "presentation",
  "workshop",
  "lab",
  "recovery",
  "other",
]);

const ALLOWED_SESSION_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTimeString(value) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return false;
  }

  const [hours, minutes, seconds = "00"] = value.split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);

  return (
    parsedHours >= 0 &&
    parsedHours <= 23 &&
    parsedMinutes >= 0 &&
    parsedMinutes <= 59 &&
    parsedSeconds >= 0 &&
    parsedSeconds <= 59
  );
}

function normalizeTimeValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = value.trim();

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  return normalized;
}

function mapClassSession(session) {
  return {
    id: session.id,
    classId: session.class_id,
    sessionNumber: session.session_number,
    title: session.title,
    sessionDate: session.session_date,
    startTime: session.start_time,
    endTime: session.end_time,
    sessionType: session.session_type,
    description: session.description,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

/**
 * Busca uma sessão e confirma que sua turma pertence ao
 * professor identificado por users.id.
 */
async function getTeacherSessionByUserId(db, userId, sessionId, options = {}) {
  const { includeCancelled = true, connection = null } = options;
  const queryExecutor = connection || db.promise();

  const cancelledCondition = includeCancelled
    ? ""
    : "AND cs.status <> 'cancelled'";

  const [rows] = await queryExecutor.query(
    `
      SELECT
        cs.id, cs.class_id, cs.session_number, cs.title, cs.session_date,
        cs.start_time, cs.end_time, cs.session_type, cs.description,
        cs.status, cs.created_at, cs.updated_at,
        cl.name AS class_name, cl.shift, cl.course_id, cl.teacher_id,
        cl.start_date AS class_start_date, cl.end_date AS class_end_date,
        cl.status AS class_status,
        c.name AS course_name, c.planned_session_count,
        t.user_id AS teacher_user_id
      FROM class_sessions cs
      INNER JOIN classes cl ON cl.id = cs.class_id
      INNER JOIN courses c ON c.id = cl.course_id
      INNER JOIN teachers t ON t.id = cl.teacher_id
      WHERE cs.id = ? AND t.user_id = ? ${cancelledCondition}
      LIMIT 1
    `,
    [sessionId, userId]
  );

  return rows[0] || null;
}

function validateSessionPayload({
  sessionNumber,
  title,
  description,
  sessionDate,
  startTime,
  endTime,
  sessionType,
  status,
}) {
  const normalizedSessionNumber = Number(sessionNumber);
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const normalizedStartTime = normalizeTimeValue(startTime);
  const normalizedEndTime = normalizeTimeValue(endTime);

  if (!Number.isInteger(normalizedSessionNumber) || normalizedSessionNumber <= 0) {
    throw createServiceError(
      "O número da sessão deve ser um inteiro maior que zero.",
      400
    );
  }

  if (!normalizedTitle) {
    throw createServiceError("O título da sessão é obrigatório.", 400);
  }

  if (normalizedTitle.length > 180) {
    throw createServiceError(
      "O título da sessão deve possuir no máximo 180 caracteres.",
      400
    );
  }

  if (!isValidDateString(sessionDate)) {
    throw createServiceError(
      "A data da sessão é obrigatória e deve usar o formato YYYY-MM-DD.",
      400
    );
  }

  if (!isValidTimeString(normalizedStartTime) || !isValidTimeString(normalizedEndTime)) {
    throw createServiceError(
      "Os horários devem usar o formato HH:MM ou HH:MM:SS.",
      400
    );
  }

  if (
    normalizedStartTime &&
    normalizedEndTime &&
    normalizedEndTime <= normalizedStartTime
  ) {
    throw createServiceError(
      "O horário final deve ser posterior ao horário inicial.",
      400
    );
  }

  if (!ALLOWED_SESSION_TYPES.has(sessionType)) {
    throw createServiceError("Tipo de sessão inválido.", 400);
  }

  if (!ALLOWED_SESSION_STATUSES.has(status)) {
    throw createServiceError("Status de sessão inválido.", 400);
  }

  return {
    sessionNumber: normalizedSessionNumber,
    title: normalizedTitle,
    description:
      typeof description === "string" ? description.trim() || null : null,
    sessionDate,
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    sessionType,
    status,
  };
}

/**
 * Lista as sessões de uma turma, com resumo de frequência por
 * sessão e um resumo geral de status.
 */
async function listSessions(db, { userId, classId, status, sessionType }) {
  const normalizedStatus = typeof status === "string" ? status.trim() : "";
  const normalizedType = typeof sessionType === "string" ? sessionType.trim() : "";

  const allowedStatusFilters = new Set(["", ...ALLOWED_SESSION_STATUSES]);
  const allowedTypeFilters = new Set(["", ...ALLOWED_SESSION_TYPES]);

  if (!allowedStatusFilters.has(normalizedStatus)) {
    throw createServiceError("Status de sessão inválido.", 400);
  }

  if (!allowedTypeFilters.has(normalizedType)) {
    throw createServiceError("Tipo de sessão inválido.", 400);
  }

  const { classData } = await requireOwnedClass(db.promise(), { userId, classId });

  const queryParams = [classId];
  let statusCondition = "";
  let typeCondition = "";

  if (normalizedStatus) {
    statusCondition = "AND cs.status = ?";
    queryParams.push(normalizedStatus);
  }

  if (normalizedType) {
    typeCondition = "AND cs.session_type = ?";
    queryParams.push(normalizedType);
  }

  const [sessionRows] = await db.promise().query(
    `
      SELECT
        cs.id, cs.class_id, cs.session_number, cs.title, cs.session_date,
        cs.start_time, cs.end_time, cs.session_type, cs.description,
        cs.status, cs.created_at, cs.updated_at,
        COUNT(a.id) AS attendance_record_count,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused_count
      FROM class_sessions cs
      LEFT JOIN attendance a ON a.class_session_id = cs.id
      WHERE cs.class_id = ? ${statusCondition} ${typeCondition}
      GROUP BY
        cs.id, cs.class_id, cs.session_number, cs.title, cs.session_date,
        cs.start_time, cs.end_time, cs.session_type, cs.description,
        cs.status, cs.created_at, cs.updated_at
      ORDER BY cs.session_date ASC, cs.start_time ASC, cs.session_number ASC
    `,
    queryParams
  );

  const [summaryRows] = await db.promise().query(
    `
      SELECT
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_sessions
      FROM class_sessions
      WHERE class_id = ?
    `,
    [classId]
  );

  const summaryRow = summaryRows[0];
  const plannedSessionCount = Number(classData.planned_session_count || 0);
  const totalSessions = Number(summaryRow.total_sessions || 0);
  const activeSessionCount =
    Number(summaryRow.scheduled_sessions || 0) +
    Number(summaryRow.completed_sessions || 0);

  return {
    class: {
      id: classData.id,
      name: classData.name,
      shift: classData.shift,
      status: classData.status,
      courseId: classData.course_id,
      courseTitle: classData.course_title || classData.course_name,
      plannedSessionCount,
    },
    sessions: sessionRows.map((session) => ({
      ...mapClassSession(session),
      attendanceSummary: {
        total: Number(session.attendance_record_count || 0),
        present: Number(session.present_count || 0),
        absent: Number(session.absent_count || 0),
        late: Number(session.late_count || 0),
        excused: Number(session.excused_count || 0),
      },
    })),
    summary: {
      totalSessions,
      activeSessionCount,
      scheduled: Number(summaryRow.scheduled_sessions || 0),
      completed: Number(summaryRow.completed_sessions || 0),
      cancelled: Number(summaryRow.cancelled_sessions || 0),
      plannedSessionCount,
      remainingToPlan:
        plannedSessionCount > 0
          ? Math.max(plannedSessionCount - activeSessionCount, 0)
          : null,
    },
  };
}

/**
 * Busca uma sessão específica (por sessionId, sem exigir o
 * classId na URL — a posse é confirmada via join com teachers).
 */
async function getSession(db, userId, sessionId) {
  const session = await getTeacherSessionByUserId(db, userId, sessionId);

  if (!session) {
    throw createServiceError(
      "Sessão não encontrada ou não vinculada ao professor.",
      404
    );
  }

  return {
    class: {
      id: session.class_id,
      name: session.class_name,
      shift: session.shift,
      status: session.class_status,
      courseId: session.course_id,
      courseName: session.course_name,
      plannedSessionCount: session.planned_session_count,
    },
    session: mapClassSession(session),
  };
}

/**
 * Cria uma nova sessão de aula para uma turma.
 */
async function createSession(db, { userId, classId, payload }) {
  const normalized = validateSessionPayload({
    ...payload,
    sessionType: payload.sessionType || "class",
    status: payload.status || "scheduled",
  });

  await requireOwnedClass(db.promise(), { userId, classId });

  let insertId;

  try {
    const [result] = await db.promise().query(
      `
        INSERT INTO class_sessions (
          class_id, session_number, title, session_date, start_time,
          end_time, session_type, description, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        classId,
        normalized.sessionNumber,
        normalized.title,
        normalized.sessionDate,
        normalized.startTime,
        normalized.endTime,
        normalized.sessionType,
        normalized.description,
        normalized.status,
      ]
    );

    insertId = result.insertId;
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createServiceError(
        "Já existe uma sessão com esse número nesta turma.",
        409
      );
    }

    throw error;
  }

  const createdSession = await getTeacherSessionByUserId(db, userId, insertId);

  return { session: mapClassSession(createdSession) };
}

/**
 * Edita uma sessão existente (identificada só por sessionId).
 */
async function updateSession(db, { userId, sessionId, payload }) {
  const currentSession = await getTeacherSessionByUserId(db, userId, sessionId);

  if (!currentSession) {
    throw createServiceError(
      "Sessão não encontrada ou não vinculada ao professor.",
      404
    );
  }

  const normalized = validateSessionPayload(payload);

  try {
    await db.promise().query(
      `
        UPDATE class_sessions
        SET
          session_number = ?, title = ?, session_date = ?, start_time = ?,
          end_time = ?, session_type = ?, description = ?, status = ?
        WHERE id = ?
      `,
      [
        normalized.sessionNumber,
        normalized.title,
        normalized.sessionDate,
        normalized.startTime,
        normalized.endTime,
        normalized.sessionType,
        normalized.description,
        normalized.status,
        sessionId,
      ]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createServiceError(
        "Já existe uma sessão com esse número nesta turma.",
        409
      );
    }

    throw error;
  }

  const updatedSession = await getTeacherSessionByUserId(db, userId, sessionId);

  return { session: mapClassSession(updatedSession) };
}

/**
 * Cancela (soft) uma sessão — nunca remove fisicamente.
 * Idempotente: cancelar uma sessão já cancelada só confirma.
 */
async function cancelSession(db, { userId, sessionId }) {
  const session = await getTeacherSessionByUserId(db, userId, sessionId);

  if (!session) {
    throw createServiceError(
      "Sessão não encontrada ou não vinculada ao professor.",
      404
    );
  }

  if (session.status === "cancelled") {
    return { alreadyCancelled: true, session: mapClassSession(session) };
  }

  await db.promise().query(
    `
      UPDATE class_sessions
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [sessionId]
  );

  const cancelledSession = await getTeacherSessionByUserId(db, userId, sessionId);

  return { alreadyCancelled: false, session: mapClassSession(cancelledSession) };
}

module.exports = {
  createServiceError,
  mapClassSession,
  getTeacherSessionByUserId,
  listSessions,
  getSession,
  createSession,
  updateSession,
  cancelSession,
};
