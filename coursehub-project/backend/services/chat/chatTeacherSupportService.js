const {
  createServiceError,
  getStudentIdByUserId,
  getActiveEnrollmentForStudent,
} = require("../classes/classAccessService");
const { createConversation } = require("./chatConversationService");

const MAX_SUBJECT_LENGTH = 180;
const MAX_BODY_LENGTH = 4000;

const ALLOWED_TOPICS = ["content", "activity", "exam", "grade", "attendance", "session", "general"];

/**
 * Resolves the course's actual responsible teacher server-side --
 * the student never supplies a teacherId. A course with no teacher
 * assigned, or one whose teacher/user account is inactive, has no
 * one to open a ticket with; that's an institutional data gap, not
 * something the student can work around.
 */
async function getActiveResponsibleTeacher(runner, { courseId }) {
  const [rows] = await runner.query(
    `
      SELECT t.id AS teacher_id, u.id AS teacher_user_id, c.name AS course_name
      FROM courses c
      INNER JOIN teachers t ON t.id = c.teacher_id AND t.status = 'active'
      INNER JOIN users u ON u.id = t.user_id AND u.status = 'active'
      WHERE c.id = ?
      LIMIT 1
    `,
    [courseId]
  );

  return rows[0] || null;
}

/**
 * "O aluno só abre dúvida com professor realmente responsável pelo
 * curso/turma da matrícula ativa" -- courseId (and, when the
 * enrollment is class-scoped, classId) come from the student's own
 * active enrollment, validated here, never trusted as a bare
 * assertion from the client. Opens as a single transaction covering
 * the conversation, both participants, and the opening message
 * (createConversation's initialMessage), landing directly in
 * waiting_staff -- a teacher_support ticket is never created without
 * its first question.
 */
async function openTeacherQuestion(db, { userId, courseId, classId, topic, subject, body }) {
  const normalizedCourseId = Number(courseId);
  const normalizedClassId = classId ? Number(classId) : null;
  const trimmedSubject = typeof subject === "string" ? subject.trim() : "";
  const trimmedBody = typeof body === "string" ? body.trim() : "";

  if (!Number.isInteger(normalizedCourseId) || normalizedCourseId <= 0) {
    throw createServiceError("Curso inválido.", 400);
  }

  if (!ALLOWED_TOPICS.includes(topic)) {
    throw createServiceError(`Tópico inválido. Use um de: ${ALLOWED_TOPICS.join(", ")}.`, 400);
  }

  if (!trimmedSubject) {
    throw createServiceError("Informe o assunto da dúvida.", 400);
  }

  if (trimmedSubject.length > MAX_SUBJECT_LENGTH) {
    throw createServiceError(`O assunto deve ter no máximo ${MAX_SUBJECT_LENGTH} caracteres.`, 400);
  }

  if (!trimmedBody) {
    throw createServiceError("Descreva sua dúvida.", 400);
  }

  if (trimmedBody.length > MAX_BODY_LENGTH) {
    throw createServiceError(`A mensagem deve ter no máximo ${MAX_BODY_LENGTH} caracteres.`, 400);
  }

  const runner = db.promise();

  const studentId = await getStudentIdByUserId(runner, userId);

  if (!studentId) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  const enrollment = await getActiveEnrollmentForStudent(runner, { studentId, courseId: normalizedCourseId });

  if (!enrollment) {
    throw createServiceError("Você não possui matrícula ativa neste curso.", 403);
  }

  if (normalizedClassId && enrollment.class_id && enrollment.class_id !== normalizedClassId) {
    throw createServiceError("A turma informada não corresponde à sua matrícula neste curso.", 403);
  }

  const teacher = await getActiveResponsibleTeacher(runner, { courseId: normalizedCourseId });

  if (!teacher) {
    throw createServiceError("Não foi possível identificar o professor responsável por este curso.", 404);
  }

  const { conversationId } = await createConversation(db, {
    type: "teacher_support",
    channelKind: "ticket",
    title: trimmedSubject,
    category: topic,
    courseId: normalizedCourseId,
    classId: enrollment.class_id || normalizedClassId,
    createdByUserId: userId,
    initiatorRole: "student",
    initialStatus: "waiting_staff",
    initialMessage: { senderUserId: userId, body: trimmedBody },
    participants: [
      { userId, participantRole: "student" },
      { userId: teacher.teacher_user_id, participantRole: "teacher" },
    ],
  });

  return { conversationId };
}

module.exports = {
  ALLOWED_TOPICS,
  openTeacherQuestion,
};
