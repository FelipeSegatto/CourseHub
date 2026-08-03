/**
 * Cria um erro de negócio com status HTTP associado.
 */
function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/**
 * Lista todos os cursos cadastrados (rota pública).
 */
async function listCourses(db) {
  const [rows] = await db.promise().query(
    `
    SELECT *
    FROM courses
    ORDER BY name ASC
    `
  );

  return rows;
}

/**
 * Busca os detalhes de um curso pelo ID (rota pública).
 */
async function getCourseById(db, courseId) {
  const normalizedId = Number(courseId);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw createServiceError("ID do curso inválido.", 400);
  }

  const [rows] = await db.promise().query(
    `
    SELECT
      id,
      teacher_id,
      name,
      description,
      expanded_description,
      workload_hours,
      price,
      image_url,
      nivel,
      syllabus,
      category
    FROM courses
    WHERE id = ?
    LIMIT 1
    `,
    [normalizedId]
  );

  if (rows.length === 0) {
    throw createServiceError("Curso não encontrado.", 404);
  }

  return rows[0];
}

module.exports = {
  createServiceError,
  listCourses,
  getCourseById,
};
