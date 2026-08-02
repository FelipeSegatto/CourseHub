/**
 * Cria um erro de negócio com status HTTP associado.
 */
function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/**
 * Resolve o teachers.id a partir do users.id (req.auth.userId).
 *
 * `runner` pode ser o pool (db.promise()) ou uma connection
 * já aberta dentro de uma transação — ambos expõem .execute().
 */
async function getTeacherIdByUserId(runner, userId) {
  const [rows] = await runner.execute(
    `
      SELECT id
      FROM teachers
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0]?.id ?? null;
}

/**
 * Resolve o students.id a partir do users.id (req.auth.userId).
 */
async function getStudentIdByUserId(runner, userId) {
  const [rows] = await runner.execute(
    `
      SELECT id
      FROM students
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0]?.id ?? null;
}

/**
 * Confirma que o curso pertence ao professor autenticado.
 * Lança 403 quando não pertence, 404 quando o curso não existe.
 */
async function assertCourseBelongsToTeacher(runner, { courseId, teacherId }) {
  const [rows] = await runner.execute(
    `
      SELECT id, name, status, teacher_id
      FROM courses
      WHERE id = ?
      LIMIT 1
    `,
    [courseId]
  );

  if (rows.length === 0) {
    throw createServiceError("Curso não encontrado.", 404);
  }

  if (Number(rows[0].teacher_id) !== Number(teacherId)) {
    throw createServiceError(
      "O curso selecionado não pertence ao professor.",
      403
    );
  }

  return rows[0];
}

/**
 * Busca uma turma garantindo que pertence ao professor autenticado.
 *
 * Devolve course_name e course_title como aliases da mesma coluna
 * (courses.name) — algumas rotas já em produção leem course_title,
 * outras leem course_name; expor as duas evita quebrar qualquer uma.
 */
async function getClassOwnedByTeacher(runner, { classId, teacherId }) {
  const [rows] = await runner.execute(
    `
      SELECT
        c.id,
        c.name,
        c.shift,
        c.status,
        c.course_id,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at,

        co.name AS course_name,
        co.name AS course_title,
        co.description AS course_description,
        co.image_url AS course_image_url,
        co.category AS course_category,
        co.nivel AS course_level

      FROM classes c

      INNER JOIN teachers t
        ON t.id = c.teacher_id

      LEFT JOIN courses co
        ON co.id = c.course_id

      WHERE c.id = ?
        AND t.id = ?
        AND c.status <> 'archived'

      LIMIT 1
    `,
    [classId, teacherId]
  );

  return rows[0] || null;
}

/**
 * Garante que a turma existe, pertence ao professor autenticado
 * e pertence ao mesmo course_id informado.
 *
 * Lança 404 quando a turma não existe/não pertence ao professor,
 * 409 quando a turma existe mas é de outro curso.
 */
async function assertClassBelongsToCourseAndTeacher(
  runner,
  { classId, courseId, teacherId }
) {
  const classRow = await getClassOwnedByTeacher(runner, {
    classId,
    teacherId,
  });

  if (!classRow) {
    throw createServiceError(
      "Turma não encontrada ou não vinculada ao professor.",
      404
    );
  }

  if (Number(classRow.course_id) !== Number(courseId)) {
    throw createServiceError(
      "A turma informada não pertence ao curso selecionado.",
      409
    );
  }

  return classRow;
}

/**
 * Busca a matrícula ativa do aluno em um curso.
 * Devolve null quando não há matrícula ativa (o chamador decide o status HTTP).
 */
async function getActiveEnrollmentForStudent(runner, { studentId, courseId }) {
  const [rows] = await runner.execute(
    `
      SELECT
        id,
        student_id,
        course_id,
        class_id,
        status
      FROM enrollments
      WHERE student_id = ?
        AND course_id = ?
        AND status = 'active'
      LIMIT 1
    `,
    [studentId, courseId]
  );

  return rows[0] || null;
}

module.exports = {
  createServiceError,
  getTeacherIdByUserId,
  getStudentIdByUserId,
  assertCourseBelongsToTeacher,
  getClassOwnedByTeacher,
  assertClassBelongsToCourseAndTeacher,
  getActiveEnrollmentForStudent,
};
