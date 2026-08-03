const bcrypt = require("bcryptjs");

const ALLOWED_TEACHER_STATUSES = ["active", "inactive"];

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/**
 * Lista todos os professores cadastrados, com cursos associados
 * e status. Usada tanto na tabela administrativa quanto na
 * seleção de professores dos formulários.
 */
async function listTeachers(db) {
  const [teachers] = await db.promise().query(
    `
      SELECT
        t.id, t.user_id, t.registration_number, t.cpf, t.phone, t.status,
        t.specialty,
        u.name, u.email, u.gender, u.status AS user_status,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name ASC SEPARATOR ', ') AS course_names,
        COUNT(DISTINCT c.id) AS total_courses
      FROM teachers t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN courses c ON c.teacher_id = t.id
      GROUP BY
        t.id, t.user_id, t.registration_number, t.cpf, t.phone, t.status,
        t.specialty, u.name, u.email, u.gender, u.status
      ORDER BY u.name ASC
    `
  );

  return teachers.map((teacher) => ({
    ...teacher,
    total_courses: Number(teacher.total_courses || 0),
  }));
}

/**
 * Cadastra um novo professor: cria o usuário de autenticação e
 * o perfil profissional em uma única transação.
 */
async function createTeacher(db, payload) {
  const { name, email, password, gender, cpf, phone, specialty, status } = payload;

  if (!name?.trim() || !email?.trim() || !password) {
    throw createServiceError("Nome, e-mail e senha são obrigatórios.", 400);
  }

  const normalizedStatus = status || "active";

  if (!ALLOWED_TEACHER_STATUSES.includes(normalizedStatus)) {
    throw createServiceError("Status do professor inválido.", 400);
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [existingUserRows] = await connection.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email.trim()]
    );

    if (existingUserRows.length > 0) {
      throw createServiceError("Este e-mail já está cadastrado.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      `
        INSERT INTO users
          (name, email, password_hash, gender, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'teacher', ?, NOW(), NOW())
      `,
      [name.trim(), email.trim(), passwordHash, gender || null, normalizedStatus]
    );

    const userId = userResult.insertId;
    const registrationNumber = `PROF${String(userId).padStart(5, "0")}`;

    const [teacherResult] = await connection.query(
      `
        INSERT INTO teachers
          (user_id, name, email, gender, registration_number, cpf, phone,
           specialty, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        userId,
        name.trim(),
        email.trim(),
        gender || null,
        registrationNumber,
        cpf?.trim() || null,
        phone?.trim() || null,
        specialty?.trim() || null,
        normalizedStatus,
      ]
    );

    await connection.commit();

    return {
      id: teacherResult.insertId,
      user_id: userId,
      name: name.trim(),
      email: email.trim(),
      registration_number: registrationNumber,
      status: normalizedStatus,
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw createServiceError(
        "Já existe um cadastro utilizando estes dados.",
        409
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Atualiza os dados profissionais e de autenticação de um
 * professor. A senha só é alterada quando informada.
 */
async function updateTeacher(db, id, payload) {
  const normalizedTeacherId = Number(id);

  if (!Number.isInteger(normalizedTeacherId) || normalizedTeacherId <= 0) {
    throw createServiceError("ID do professor inválido.", 400);
  }

  const { name, email, password, gender, cpf, phone, specialty, status } = payload;

  if (!name?.trim() || !email?.trim()) {
    throw createServiceError("Nome e e-mail são obrigatórios.", 400);
  }

  const normalizedStatus = status || "active";

  if (!ALLOWED_TEACHER_STATUSES.includes(normalizedStatus)) {
    throw createServiceError("Status do professor inválido.", 400);
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [teacherRows] = await connection.query(
      `SELECT id, user_id FROM teachers WHERE id = ? LIMIT 1`,
      [normalizedTeacherId]
    );

    if (teacherRows.length === 0) {
      throw createServiceError("Professor não encontrado.", 404);
    }

    const teacher = teacherRows[0];

    const [existingEmailRows] = await connection.query(
      `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
      [email.trim(), teacher.user_id]
    );

    if (existingEmailRows.length > 0) {
      throw createServiceError("Este e-mail já está cadastrado.", 409);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);

      await connection.query(
        `
          UPDATE users
          SET name = ?, email = ?, password_hash = ?, gender = ?, status = ?, updated_at = NOW()
          WHERE id = ?
        `,
        [name.trim(), email.trim(), passwordHash, gender || null, normalizedStatus, teacher.user_id]
      );
    } else {
      await connection.query(
        `
          UPDATE users
          SET name = ?, email = ?, gender = ?, status = ?, updated_at = NOW()
          WHERE id = ?
        `,
        [name.trim(), email.trim(), gender || null, normalizedStatus, teacher.user_id]
      );
    }

    const [teacherUpdateResult] = await connection.query(
      `
        UPDATE teachers
        SET
          name = ?, email = ?, gender = ?, cpf = ?, phone = ?, specialty = ?,
          status = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        name.trim(),
        email.trim(),
        gender || null,
        cpf?.trim() || null,
        phone?.trim() || null,
        specialty?.trim() || null,
        normalizedStatus,
        normalizedTeacherId,
      ]
    );

    if (teacherUpdateResult.affectedRows === 0) {
      throw createServiceError("Não foi possível atualizar o professor.", 404);
    }

    await connection.commit();

    return {
      id: normalizedTeacherId,
      user_id: teacher.user_id,
      name: name.trim(),
      email: email.trim(),
      gender: gender || null,
      cpf: cpf?.trim() || null,
      phone: phone?.trim() || null,
      specialty: specialty?.trim() || null,
      status: normalizedStatus,
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw createServiceError(
        "Já existe um cadastro utilizando estes dados.",
        409
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Desativa um professor sem removê-lo fisicamente (soft delete):
 * teachers.status='inactive' + users.status='inactive'.
 */
async function deleteTeacher(db, id) {
  const normalizedTeacherId = Number(id);

  if (!Number.isInteger(normalizedTeacherId) || normalizedTeacherId <= 0) {
    throw createServiceError("ID do professor inválido.", 400);
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [teacherRows] = await connection.query(
      `SELECT id, user_id, status FROM teachers WHERE id = ? LIMIT 1`,
      [normalizedTeacherId]
    );

    if (teacherRows.length === 0) {
      throw createServiceError("Professor não encontrado.", 404);
    }

    const teacher = teacherRows[0];

    if (teacher.status === "inactive") {
      throw createServiceError("Este professor já está inativo.", 409);
    }

    const [teacherUpdateResult] = await connection.query(
      `UPDATE teachers SET status = 'inactive', updated_at = NOW() WHERE id = ?`,
      [normalizedTeacherId]
    );

    if (teacherUpdateResult.affectedRows === 0) {
      throw createServiceError(
        "Não foi possível atualizar o status do professor.",
        404
      );
    }

    const [userUpdateResult] = await connection.query(
      `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = ?`,
      [teacher.user_id]
    );

    if (userUpdateResult.affectedRows === 0) {
      throw createServiceError(
        "Não foi possível desativar o usuário do professor.",
        404
      );
    }

    await connection.commit();

    return { id: normalizedTeacherId, user_id: teacher.user_id, status: "inactive" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createServiceError,
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
