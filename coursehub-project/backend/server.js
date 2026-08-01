/* ==========================================================
   COURSEHUB API
   Configuração inicial, autenticação e rotas gerais
   ========================================================== */

const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
const studentContentRoutes = require("./routes/studentContentRoutes");
const teacherContentRoutes = require("./routes/teacherContentRoutes");
const studentActivityRoutes = require("./routes/studentActivityRoutes");
const teacherActivityRoutes = require("./routes/teacherActivityRoutes");

const {
  getPublicCourseContents,
} = require("./services/courseContents/studentCourseContentService");

require("dotenv").config();

if (
  process.env.NODE_ENV === "production" &&
  process.env.PAYMENT_GATEWAY === "simulated"
) {
  throw new Error(
    "O gateway de pagamento simulado não pode ser utilizado em produção."
  );
}

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateAccessToken = require("./utils/generateToken");
const db = require("./db");

const authenticateToken = require("./middlewares/authenticateToken");
const authorizeRoles = require("./middlewares/authorizeRoles");

const cookieParser = require("cookie-parser");

const {
  loginRateLimiter,
  forgotPasswordRateLimiter,
} = require("./middlewares/rateLimiters");

const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} = require("./utils/cookies");

const {
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshTokenByRawValue,
  revokeAllUserRefreshTokens,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} = require("./repositories/authTokens");

const { sendPasswordResetEmail } = require("./utils/mailer");

const app = express();
const PORT = process.env.PORT || 3001;



app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());





/* ==========================================================
   MIDDLEWARES GLOBAIS
   ========================================================== */

/**
 * Permite requisições vindas do frontend.
 */

/**
 * Permite que a API receba dados JSON no corpo das requisições.
 */


/* ==========================================================
   FUNÇÕES AUXILIARES
   ========================================================== */

/**
 * Busca o ID de um aluno a partir do ID registrado em users.
 *
 * Fluxo:
 * users.id -> students.user_id -> students.id
 */
async function getStudentIdByUserId(userId) {
  console.log("userId recebido:", userId);

  const [studentRows] = await db.promise().query(
    `
      SELECT id, user_id
      FROM students
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  console.log("Aluno encontrado:", studentRows);

  return studentRows.length > 0
    ? studentRows[0].id
    : null;
}

/**
 * Monta o perfil completo de um usuário (dados de `users` +
 * dados específicos de `students`/`teachers`, conforme o role).
 *
 * Usado tanto por GET /api/profile/me quanto por
 * PATCH /api/profile/me, para nunca duplicar essa lógica.
 *
 * Retorna null se o usuário não existir.
 */
async function getFullProfileByUserId(userId) {
  const [userRows] = await db.promise().query(
    `
    SELECT
      id,
      name,
      email,
      gender,
      role,
      status,
      avatar_key
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (userRows.length === 0) {
    return null;
  }

  const user = userRows[0];

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    role: user.role,
    status: user.status,
    avatarKey: user.avatar_key || null,

    phone: null,
    address: null,
    specialty: null,
    cpf: null,
    registrationNumber: null,
    birthDate: null,
    institutionalStatus: null,
  };

  if (user.role === "student") {
    const [studentRows] = await db.promise().query(
      `
      SELECT
        phone,
        address,
        cpf,
        registration_number,
        birth_date,
        status
      FROM students
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (studentRows.length > 0) {
      const student = studentRows[0];

      profile.phone = student.phone || null;
      profile.address = student.address || null;
      profile.cpf = student.cpf || null;

      profile.registrationNumber =
        student.registration_number || null;

      profile.birthDate = student.birth_date || null;

      profile.institutionalStatus = student.status || null;
    }
  }

  if (user.role === "teacher") {
    const [teacherRows] = await db.promise().query(
      `
      SELECT
        phone,
        specialty,
        cpf,
        registration_number,
        status
      FROM teachers
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (teacherRows.length > 0) {
      const teacher = teacherRows[0];

      profile.phone = teacher.phone || null;
      profile.specialty = teacher.specialty || null;
      profile.cpf = teacher.cpf || null;

      profile.registrationNumber =
        teacher.registration_number || null;

      profile.institutionalStatus = teacher.status || null;
    }
  }

  return profile;
}


/* ==========================================================
   INFRAESTRUTURA
   ========================================================== */

// ======================================================
// PERFIL DO USUÁRIO AUTENTICADO
// GET /api/profile/me
// ======================================================

app.get(
  "/api/profile/me",
  authenticateToken,
  async (req, res) => {
    try {
      const profile = await getFullProfileByUserId(
        req.auth.userId
      );

      if (!profile) {
        return res.status(404).json({
          message: "Usuário não encontrado.",
        });
      }

      if (profile.status !== "active") {
        return res.status(403).json({
          message: "Conta inativa ou bloqueada.",
        });
      }

      return res.status(200).json({
        profile,
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);

      return res.status(500).json({
        message: "Erro ao carregar perfil.",
      });
    }
  }
);

// ======================================================
// ATUALIZAÇÃO DO PERFIL DO USUÁRIO AUTENTICADO
// PATCH /api/profile/me
// ======================================================

app.patch(
  "/api/profile/me",
  authenticateToken,
  async (req, res) => {
    let connection;

    try {
      const userId = req.auth.userId;
      const role = req.auth.role;

      const { name, email, gender, phone, address, specialty } =
        req.body;

      const normalizedName = name?.trim();
      const normalizedEmail = email?.trim().toLowerCase();
      const normalizedGender = gender?.trim() || null;

      if (!normalizedName || !normalizedEmail) {
        return res.status(400).json({
          message: "Nome e e-mail são obrigatórios.",
        });
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
          message: "Informe um e-mail válido.",
        });
      }

      const [emailOwnerRows] = await db.promise().query(
        `
        SELECT id
        FROM users
        WHERE email = ? AND id <> ?
        LIMIT 1
        `,
        [normalizedEmail, userId]
      );

      if (emailOwnerRows.length > 0) {
        return res.status(409).json({
          message: "Este e-mail já está em uso por outra conta.",
        });
      }

      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      await connection.query(
        `
        UPDATE users
        SET name = ?, email = ?, gender = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [normalizedName, normalizedEmail, normalizedGender, userId]
      );

      if (role === "student") {
        await connection.query(
          `
          UPDATE students
          SET
            name = ?,
            email = ?,
            phone = ?,
            address = ?,
            updated_at = NOW()
          WHERE user_id = ?
          `,
          [
            normalizedName,
            normalizedEmail,
            phone?.trim() || null,
            address?.trim() || null,
            userId,
          ]
        );
      }

      if (role === "teacher") {
        await connection.query(
          `
          UPDATE teachers
          SET
            name = ?,
            email = ?,
            phone = ?,
            specialty = ?,
            updated_at = NOW()
          WHERE user_id = ?
          `,
          [
            normalizedName,
            normalizedEmail,
            phone?.trim() || null,
            specialty?.trim() || null,
            userId,
          ]
        );
      }

      await connection.commit();

      const profile = await getFullProfileByUserId(userId);

      return res.status(200).json({
        message: "Perfil atualizado com sucesso.",
        profile,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error("Erro ao atualizar perfil:", error);

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "Este e-mail já está em uso por outra conta.",
        });
      }

      return res.status(500).json({
        message: "Erro ao atualizar perfil.",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// ======================================================
// ATUALIZAÇÃO DE SENHA DO USUÁRIO AUTENTICADO
// PATCH /api/profile/me/password
//
// Ao trocar a senha, revoga todos os refresh tokens do
// usuário — qualquer outra sessão aberta (outro navegador,
// outro dispositivo) precisa fazer login de novo. É o
// comportamento esperado quando alguém troca a senha por
// segurança (ex.: suspeita de acesso indevido).
// ======================================================

app.patch(
  "/api/profile/me/password",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message:
            "Senha atual e nova senha são obrigatórias.",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message:
            "A nova senha deve possuir pelo menos 6 caracteres.",
        });
      }

      const [userRows] = await db.promise().query(
        `
        SELECT password_hash
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          message: "Usuário não encontrado.",
        });
      }

      const currentPasswordMatches = await bcrypt.compare(
        currentPassword,
        userRows[0].password_hash
      );

      if (!currentPasswordMatches) {
        return res.status(401).json({
          message: "Senha atual incorreta.",
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db.promise().query(
        `
        UPDATE users
        SET password_hash = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [newPasswordHash, userId]
      );

      await revokeAllUserRefreshTokens(userId);
      clearAuthCookies(res);

      return res.status(200).json({
        message:
          "Senha alterada com sucesso. Faça login novamente.",
      });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);

      return res.status(500).json({
        message: "Erro ao atualizar senha.",
      });
    }
  }
);

/*LOGIN */

app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "E-mail e senha são obrigatórios.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const [userRows] = await db.promise().query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        status,
        avatar_key
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const user = userRows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Conta inativa ou bloqueada.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = await createRefreshToken(user.id);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarKey: user.avatar_key || null,
      },
    });
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return res.status(500).json({
      message: "Erro ao realizar login.",
    });
  }
});

/* ======================================================
   LOGOUT
   POST /api/auth/logout
   ====================================================== */
app.post("/api/auth/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (refreshToken) {
      await revokeRefreshTokenByRawValue(refreshToken);
    }
  } catch (error) {
    console.error("Erro ao revogar refresh token:", error);
    // Mesmo se a revogação falhar, o logout deve limpar os cookies do
    // navegador — a sessão local do usuário não pode ficar presa a isso.
  }

  clearAuthCookies(res);

  return res.status(200).json({
    message: "Logout realizado com sucesso.",
  });
});

/* ======================================================
   REFRESH
   POST /api/auth/refresh
   Renova o access token usando o refresh token do cookie.
   Rotaciona o refresh token a cada uso (defesa contra reuso
   de um token roubado).
   ====================================================== */
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!currentRefreshToken) {
      return res.status(401).json({
        message: "Sessão não encontrada.",
      });
    }

    const tokenRow = await findValidRefreshToken(currentRefreshToken);

    if (!tokenRow) {
      clearAuthCookies(res);

      return res.status(401).json({
        message: "Sessão expirada. Faça login novamente.",
      });
    }

    const [userRows] = await db.promise().query(
      `
      SELECT id, role, status
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [tokenRow.user_id]
    );

    if (userRows.length === 0 || userRows[0].status !== "active") {
      await revokeRefreshTokenByRawValue(currentRefreshToken);
      clearAuthCookies(res);

      return res.status(401).json({
        message: "Sessão inválida.",
      });
    }

    const user = userRows[0];

    const newRefreshToken = await createRefreshToken(user.id);

    await revokeRefreshTokenByRawValue(
      currentRefreshToken,
      newRefreshToken
    );

    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      message: "Sessão renovada.",
    });
  } catch (error) {
    console.error("Erro ao renovar sessão:", error);

    return res.status(500).json({
      message: "Erro ao renovar sessão.",
    });
  }
});







/**
 * PATCH /api/profile/me/password
 *
 * Atualiza a senha do usuário.
 *
 * Fluxo:
 *
 * 1. Buscar password_hash
 * 2. Comparar senha atual
 * 3. Gerar novo hash
 * 4. Atualizar users.password_hash
 */





/* ======================================================
   RECUPERAÇÃO DE SENHA — ETAPA 1
   POST /api/forgot-password/check-email
   Body: { email }

   Gera um token de redefinição de curta duração e envia
   por e-mail. Sempre responde com a mesma mensagem genérica,
   exista ou não a conta — isso evita que alguém use esta
   rota para descobrir quais e-mails têm cadastro no sistema
   (enumeration attack).
   ====================================================== */

app.post(
  "/api/forgot-password/check-email",
  forgotPasswordRateLimiter,
  async (req, res) => {
    const genericResponse = {
      message:
        "Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha.",
    };

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "O e-mail é obrigatório.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const [userRows] = await db.promise().query(
        `
        SELECT id, email, status
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [normalizedEmail]
      );

      if (userRows.length === 0 || userRows[0].status !== "active") {
        return res.status(200).json(genericResponse);
      }

      const user = userRows[0];

      const resetToken = await createPasswordResetToken(user.id);

      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/redefinir-senha?token=${resetToken}`;

      await sendPasswordResetEmail({ to: user.email, resetUrl });

      return res.status(200).json(genericResponse);
    } catch (error) {
      console.error("Erro ao processar recuperação de senha:", error);

      // Mesmo em erro interno, não revela se o e-mail existe.
      return res.status(200).json(genericResponse);
    }
  }
);

/* ======================================================
   RECUPERAÇÃO DE SENHA — ETAPA 2
   PATCH /api/forgot-password/reset
   Body: { token, newPassword, confirmPassword }

   Só troca a senha se o token recebido corresponder a um
   token válido (existente, não usado, não expirado) — é a
   prova de que quem está pedindo a troca teve acesso à
   caixa de e-mail da conta.
   ====================================================== */

app.patch(
  "/api/forgot-password/reset",
  forgotPasswordRateLimiter,
  async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          message:
            "Token, nova senha e confirmação são obrigatórios.",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: "A confirmação da nova senha não confere.",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message:
            "A nova senha deve possuir pelo menos 6 caracteres.",
        });
      }

      const resetToken = await findValidPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({
          message:
            "Este link de redefinição é inválido ou expirou. Solicite um novo.",
        });
      }

      const [userRows] = await db.promise().query(
        `
        SELECT id, status
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [resetToken.user_id]
      );

      if (userRows.length === 0 || userRows[0].status !== "active") {
        return res.status(403).json({
          message: "Não é possível redefinir a senha desta conta.",
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db.promise().query(
        `
        UPDATE users
        SET password_hash = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [newPasswordHash, resetToken.user_id]
      );

      await markPasswordResetTokenUsed(resetToken.id);
      await revokeAllUserRefreshTokens(resetToken.user_id);

      return res.status(200).json({
        message:
          "Senha redefinida com sucesso. Você já pode entrar novamente.",
      });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);

      return res.status(500).json({
        message: "Erro interno ao redefinir a senha.",
      });
    }
  }
);




/* ==========================================================
   CURSOS — ROTAS GERAIS
   ========================================================== */

/**
 * GET /courses
 * Lista todos os cursos cadastrados.
 */
app.get("/api/courses", (req, res) => {
  const sql = `
    SELECT *
    FROM courses
    ORDER BY name ASC
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Erro ao buscar cursos:", error);

      return res.status(500).json({
        message: "Erro ao buscar cursos.",
      });
    }

    return res.status(200).json(results);
  });
});


/**
 * GET /courses/:id
 * Busca os detalhes de um curso ativo pelo ID.
 */
app.get("/api/courses/:id", async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "ID do curso inválido.",
      });
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
      [courseId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Curso não encontrado.",
      });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar curso:", error);

    return res.status(500).json({
      message: "Erro interno ao buscar o curso.",
    });
  }
});


/**
 * GET api/courses/:id/contents
 * Lista os conteúdos GERAIS (class_id NULL) de um curso.
 *
 * Rota pública — nunca deve expor conteúdo exclusivo de turma.
 * Alunos autenticados que precisam ver também o conteúdo da própria
 * turma devem usar GET /api/students/courses/:courseId/contents.
 */
app.get("/api/courses/:id/contents", async (req, res) => {
  try {
    const { id } = req.params;

    const contents = await getPublicCourseContents(db, id);

    return res.status(200).json(contents);
  } catch (error) {
    console.error(
      "Erro ao buscar conteúdos do curso:",
      error
    );

    return res.status(error.statusCode || 500).json({
      message: error.message || "Erro ao buscar conteúdos do curso.",
    });
  }
});


/* ==========================================================
   USUÁRIOS — ROTAS GERAIS
   ========================================================== */

/**
 * GET /users
 * Lista os usuários sem retornar os hashes das senhas.
 */
app.get("/api/users", (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      email,
      gender,
      role,
      status,
      created_at,
      updated_at
    FROM users
    ORDER BY id ASC
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Erro ao buscar usuários:", error);

      return res.status(500).json({
        message: "Erro ao buscar usuários.",
      });
    }

    return res.status(200).json(results);
  });
});


/**
 * POST /users
 * Cadastra um usuário aluno e cria seu perfil na tabela students.
 *
 * Observação:
 * Esta é a rota pública de cadastro que já existia no projeto.
  * O cadastro administrativo permanece em POST /api/admin/students.
 */
app.post("/api/users", async (req, res) => {
  let connection;

  try {
    const {
      name,
      email,
      password,
      gender,
      birth_date,
      cpf,
      phone,
    } = req.body;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const finalGender = gender || "Masculino";

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Nome, e-mail e senha são obrigatórios.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "A senha deve possuir pelo menos 6 caracteres.",
      });
    }

    /*
     * Gera o hash antes de abrir a transação.
     */
    const passwordHash = await bcrypt.hash(password, 10);

    /*
     * Obtém uma conexão exclusiva do pool.
     */
    connection = await db.promise().getConnection();

    await connection.beginTransaction();

    /*
     * Cria o usuário.
     */
    const [userResult] = await connection.query(
      `
        INSERT INTO users
        (
          name,
          email,
          password_hash,
          gender,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'student', 'active', NOW(), NOW())
      `,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        finalGender,
      ]
    );

    const userId = userResult.insertId;

    const temporaryCpf =
      cpf?.trim() || `PENDENTE-${userId}`;

    const temporaryRegistration = `TEMP-${userId}`;

    /*
     * Cria o perfil de aluno.
     */
    const [studentResult] = await connection.query(
      `
        INSERT INTO students
        (
          user_id,
          name,
          email,
          gender,
          registration_number,
          birth_date,
          cpf,
          phone
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        normalizedName,
        normalizedEmail,
        finalGender,
        temporaryRegistration,
        birth_date || "2000-01-01",
        temporaryCpf,
        phone?.trim() || "",
      ]
    );

    const studentId = studentResult.insertId;

    const registrationNumber =
      `STU2026${String(studentId).padStart(3, "0")}`;

    /*
     * Substitui a matrícula temporária.
     */
    await connection.query(
      `
        UPDATE students
        SET registration_number = ?
        WHERE id = ?
      `,
      [registrationNumber, studentId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      userId,
      studentId,
      registrationNumber,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Erro ao cadastrar usuário:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          error.sqlMessage?.includes("email")
            ? "Este e-mail já está cadastrado."
            : "Já existe um cadastro com esses dados.",
      });
    }

    return res.status(500).json({
      message: "Erro ao cadastrar usuário.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   FIM DA PARTE 1
   A próxima seção começa com as rotas da área do aluno.
   ========================================================== */

   /* ==========================================================
   ÁREA DO ALUNO
   Cursos, atividades e envios
   ========================================================== */


/* ==========================================================
   ALUNO — CURSOS
   ========================================================== */

/**
 * GET /api/students/by-user/:userId/courses
 * Lista os cursos em que o aluno possui matrícula ativa.
 */
app.get(
  "/api/students/me/courses",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      const [studentRows] = await db.promise().query(
        `
        SELECT id
        FROM students
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (studentRows.length === 0) {
        return res.status(404).json({
          message:
            "Perfil de aluno não encontrado para este usuário.",
        });
      }

      const studentId = studentRows[0].id;

      const [courses] = await db.promise().query(
        `
        SELECT
          c.id,
          c.name,
          c.description,
          c.category,
          c.nivel,
          c.image_url,
          c.workload_hours,
          e.status AS enrollment_status,
          e.created_at AS enrollment_date
        FROM enrollments e
        INNER JOIN courses c
          ON c.id = e.course_id
        WHERE e.student_id = ?
          AND e.status = 'active'
        ORDER BY e.created_at DESC
        `,
        [studentId]
      );

      return res.status(200).json(courses);
    } catch (error) {
      console.error(
        "Erro ao buscar cursos matriculados:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar cursos matriculados.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   ALUNO — ATIVIDADES, AVALIAÇÕES E ENVIOS

   Migradas para backend/routes/studentActivityRoutes.js e
   backend/services/activities/studentActivityService.js:
   - GET /api/students/by-user/activities
   - GET /api/students/by-user/activities/:activityId/full
   - POST /api/students/activities/:activityId/submissions
   ========================================================== */



/*
 * ALUNO — PROGRESSO DE CONTEÚDOS DE UM CURSO E PROGRESSO
 * DE UM CONTEÚDO ESPECÍFICO
 *
 * Migradas para backend/routes/studentContentRoutes.js e
 * backend/services/courseContents/courseContentProgressService.js.
 */

/*
 * ============================================================
 * ALUNO — PROGRESSO ACADÊMICO EM UM CURSO
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do aluno;
 * - recebe o ID do curso;
 * - converte users.id em students.id;
 * - verifica se o aluno possui matrícula ativa no curso;
 * - busca todas as atividades e avaliações ativas do curso;
 * - carrega a submission do aluno quando ela existir;
 * - considera atividades sem submission como pendentes;
 * - calcula quantas foram entregues, corrigidas e devolvidas;
 * - calcula separadamente atividades e avaliações;
 * - calcula a média das entregas corrigidas;
 * - retorna resumo e lista completa de itens acadêmicos.
 *
 * Especificidades:
 * - utiliza LEFT JOIN para incluir atividades ainda não realizadas;
 * - ausência de submission significa pendência para o aluno;
 * - submitted e pending_review são tratados como aguardando correção;
 * - graded representa uma entrega corrigida;
 * - returned representa uma entrega devolvida para ajustes;
 * - a média é calculada apenas com submissions corrigidas e com nota;
 * - esta rota não calcula progresso de vídeos, PDFs, textos ou aulas;
 * - o progresso de conteúdos pertence a student_content_progress.
 */
app.get(
  "/api/students/by-user/:userId/courses/:courseId/academic-progress",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Identidade sempre vem do token — nunca da URL.
      const normalizedUserId = req.auth.userId;
      const normalizedCourseId = Number(courseId);

      /*
       * Valida o ID do curso.
       */
      if (
        !Number.isInteger(normalizedCourseId) ||
        normalizedCourseId <= 0
      ) {
        return res.status(400).json({
          message: "ID do curso inválido.",
        });
      }

      /*
       * Converte users.id em students.id.
       */
      const studentId = await getStudentIdByUserId(
        normalizedUserId
      );

      if (!studentId) {
        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      /*
       * Confirma que:
       * - o curso existe;
       * - o curso está ativo;
       * - o aluno possui matrícula ativa.
       */
      const [enrollmentRows] = await db.promise().query(
        `
          SELECT
            e.id AS enrollment_id,
            e.student_id,
            e.course_id,
            e.status AS enrollment_status,

            c.name AS course_title,
            c.category,
            c.image_url,
            c.status AS course_status

          FROM enrollments e

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?
            AND e.course_id = ?
            AND e.status = 'active'
            AND c.status = 'active'

          LIMIT 1
        `,
        [
          studentId,
          normalizedCourseId,
        ]
      );

      if (enrollmentRows.length === 0) {
        return res.status(403).json({
          message:
            "O aluno não possui matrícula ativa neste curso.",
        });
      }

      const enrollment = enrollmentRows[0];

      /*
       * Busca todas as atividades e avaliações ativas.
       *
       * O LEFT JOIN com submissions é essencial:
       * - se existe submission, o aluno interagiu com o item;
       * - se não existe submission, o item ainda está pendente.
       */
      const [academicRows] = await db.promise().query(
        `
          SELECT
            a.id AS activity_id,
            a.course_id,
            a.activity_kind,
            a.title,
            a.description,
            a.type,
            a.due_date,
            a.max_score,
            a.order_index,
            a.is_required,
            a.status AS activity_status,

            sub.id AS submission_id,
            sub.status AS submission_status,
            sub.score,
            sub.feedback,
            sub.submitted_at,
            sub.graded_at,

            CASE
              WHEN sub.id IS NULL
                AND a.due_date IS NOT NULL
                AND a.due_date < NOW()
              THEN 1
              ELSE 0
            END AS is_overdue

          FROM activities a

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id
            AND sub.student_id = ?

          WHERE a.course_id = ?
            AND a.status = 'active'

          ORDER BY
            CASE
              WHEN a.due_date IS NULL
              THEN 1
              ELSE 0
            END ASC,

            a.due_date ASC,
            a.order_index ASC,
            a.id ASC
        `,
        [
          studentId,
          normalizedCourseId,
        ]
      );

      /*
       * Normaliza o status acadêmico de cada item.
       *
       * O status retornado aqui é um status de interface:
       *
       * pending:
       * - ainda não possui submission;
       * - prazo ainda não terminou.
       *
       * overdue:
       * - ainda não possui submission;
       * - prazo já terminou.
       *
       * submitted:
       * - entregue;
       * - aguardando correção.
       *
       * graded:
       * - corrigida e avaliada.
       *
       * returned:
       * - devolvida para ajustes.
       */
      const items = academicRows.map((item) => {
        let academicStatus = "pending";

        if (
          item.submission_status === "graded"
        ) {
          academicStatus = "graded";
        } else if (
          item.submission_status === "returned"
        ) {
          academicStatus = "returned";
        } else if (
          item.submission_status === "submitted" ||
          item.submission_status === "pending_review"
        ) {
          academicStatus = "submitted";
        } else if (Boolean(item.is_overdue)) {
          academicStatus = "overdue";
        }

        return {
          activity_id: Number(item.activity_id),
          course_id: Number(item.course_id),

          activity_kind: item.activity_kind,
          title: item.title,
          description: item.description,
          type: item.type,
          due_date: item.due_date,

          max_score:
            item.max_score !== null &&
            item.max_score !== undefined
              ? Number(item.max_score)
              : 10,

          order_index: Number(
            item.order_index
          ),

          is_required: Boolean(
            item.is_required
          ),

          activity_status:
            item.activity_status,

          submission_id:
            item.submission_id !== null &&
            item.submission_id !== undefined
              ? Number(item.submission_id)
              : null,

          submission_status:
            item.submission_status,

          academic_status: academicStatus,

          score:
            item.score !== null &&
            item.score !== undefined
              ? Number(item.score)
              : null,

          feedback: item.feedback,
          submitted_at: item.submitted_at,
          graded_at: item.graded_at,

          is_overdue: Boolean(
            item.is_overdue
          ),
        };
      });

      /*
       * Totais gerais.
       */
      const totalItems = items.length;

      const submittedItems = items.filter(
        (item) =>
          item.academic_status === "submitted"
      ).length;

      const gradedItems = items.filter(
        (item) =>
          item.academic_status === "graded"
      ).length;

      const returnedItems = items.filter(
        (item) =>
          item.academic_status === "returned"
      ).length;

      const pendingItems = items.filter(
        (item) =>
          item.academic_status === "pending" ||
          item.academic_status === "overdue"
      ).length;

      const overdueItems = items.filter(
        (item) =>
          item.academic_status === "overdue"
      ).length;

      /*
       * Entregues inclui qualquer item que já possui
       * submission válida:
       *
       * - submitted;
       * - graded;
       * - returned.
       *
       * Returned continua sendo uma entrega realizada,
       * embora exija uma nova ação do aluno.
       */
      const deliveredItems =
        submittedItems +
        gradedItems +
        returnedItems;

      /*
       * Percentual de entregas acadêmicas.
       *
       * Não representa desempenho ou nota.
       * Representa apenas quantos itens receberam
       * alguma entrega do aluno.
       */
      const progressPercentage =
        totalItems > 0
          ? Number(
              (
                (deliveredItems /
                  totalItems) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * Separa atividades e avaliações.
       */
      const activityItems = items.filter(
        (item) =>
          item.activity_kind === "activity"
      );

      const examItems = items.filter(
        (item) =>
          item.activity_kind === "exam"
      );

      function buildKindSummary(kindItems) {
        const total = kindItems.length;

        const submitted =
          kindItems.filter(
            (item) =>
              item.academic_status ===
              "submitted"
          ).length;

        const graded =
          kindItems.filter(
            (item) =>
              item.academic_status ===
              "graded"
          ).length;

        const returned =
          kindItems.filter(
            (item) =>
              item.academic_status ===
              "returned"
          ).length;

        const pending =
          kindItems.filter(
            (item) =>
              item.academic_status ===
                "pending" ||
              item.academic_status ===
                "overdue"
          ).length;

        const overdue =
          kindItems.filter(
            (item) =>
              item.academic_status ===
              "overdue"
          ).length;

        const delivered =
          submitted +
          graded +
          returned;

        return {
          total_items: total,
          delivered_items: delivered,
          submitted_items: submitted,
          graded_items: graded,
          returned_items: returned,
          pending_items: pending,
          overdue_items: overdue,

          progress_percentage:
            total > 0
              ? Number(
                  (
                    (delivered / total) *
                    100
                  ).toFixed(2)
                )
              : 0,
        };
      }

      /*
       * Calcula a média somente com itens corrigidos.
       *
       * Cada nota é primeiro convertida para uma escala
       * percentual, respeitando o max_score da atividade.
       *
       * Depois o percentual médio é convertido para
       * a escala de 0 a 10 usada na interface.
       *
       * Exemplo:
       * score = 8
       * max_score = 10
       * aproveitamento = 80%
       * nota normalizada = 8,0
       */
      const gradedItemsWithScore = items.filter(
        (item) =>
          item.academic_status === "graded" &&
          item.score !== null &&
          Number.isFinite(item.score) &&
          item.max_score > 0
      );

      const averagePercentage =
        gradedItemsWithScore.length > 0
          ? gradedItemsWithScore.reduce(
              (total, item) => {
                return (
                  total +
                  (item.score /
                    item.max_score) *
                    100
                );
              },
              0
            ) /
            gradedItemsWithScore.length
          : null;

      const averageGrade =
        averagePercentage !== null
          ? Number(
              (
                averagePercentage / 10
              ).toFixed(2)
            )
          : null;

      /*
       * Busca a correção mais recente para permitir
       * destacar feedbacks ou notas recentes.
       */
      const recentGradedItem =
        items
          .filter(
            (item) =>
              item.academic_status ===
                "graded" &&
              item.graded_at
          )
          .sort(
            (firstItem, secondItem) =>
              new Date(
                secondItem.graded_at
              ).getTime() -
              new Date(
                firstItem.graded_at
              ).getTime()
          )[0] || null;

      return res.status(200).json({
        student_id: Number(studentId),

        course: {
          course_id: normalizedCourseId,
          course_title:
            enrollment.course_title,
          category: enrollment.category,
          image_url: enrollment.image_url,
        },

        summary: {
          total_items: totalItems,

          delivered_items:
            deliveredItems,

          submitted_items:
            submittedItems,

          graded_items:
            gradedItems,

          returned_items:
            returnedItems,

          pending_items:
            pendingItems,

          overdue_items:
            overdueItems,

          progress_percentage:
            progressPercentage,

          average_grade:
            averageGrade,

          average_percentage:
            averagePercentage !== null
              ? Number(
                  averagePercentage.toFixed(
                    2
                  )
                )
              : null,
        },

        by_kind: {
          activities:
            buildKindSummary(
              activityItems
            ),

          exams:
            buildKindSummary(
              examItems
            ),
        },

        recent_graded_item:
          recentGradedItem,

        items,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar progresso acadêmico do curso:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar o progresso acadêmico do curso.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);

/*
 * ============================================================
 * ALUNO — VISÃO GERAL DO PROGRESSO ACADÊMICO
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do aluno;
 * - converte users.id em students.id;
 * - busca todos os cursos ativos em que o aluno possui
 *   matrícula ativa;
 * - consolida o progresso dos conteúdos de todos os cursos;
 * - considera conteúdos sem registro como "not_started";
 * - consolida atividades, avaliações e submissions;
 * - considera atividades sem submission como pendentes;
 * - calcula progresso de conteúdo e progresso acadêmico;
 * - calcula média geral e média por curso;
 * - identifica o próximo conteúdo de cada curso;
 * - identifica o curso acessado mais recentemente;
 * - retorna dados prontos para:
 *   - StatCards;
 *   - gráficos de rosca;
 *   - barras de progresso;
 *   - cards de progresso por curso;
 *   - ações rápidas;
 *   - seção de conquistas.
 *
 * Especificidades:
 * - progresso de conteúdo e progresso acadêmico permanecem
 *   separados;
 * - o progresso de conteúdo usa apenas course_contents e
 *   student_content_progress;
 * - o progresso acadêmico usa activities e submissions;
 * - ausência de progresso significa "not_started";
 * - ausência de submission significa atividade pendente;
 * - submitted e pending_review são tratados como entregas
 *   aguardando correção;
 * - graded representa uma entrega corrigida;
 * - returned representa uma entrega devolvida para ajustes;
 * - a média considera apenas entregas corrigidas com nota;
 * - o backend descobre todos os relacionamentos;
 * - nenhuma porcentagem é confiada ao frontend.
 */
app.get(
  "/api/students/by-user/:userId/progress-overview",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      // Identidade sempre vem do token — nunca da URL.
      const normalizedUserId = req.auth.userId;

      /*
       * Converte users.id em students.id.
       */
      const studentId = await getStudentIdByUserId(
        normalizedUserId
      );

      if (!studentId) {
        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      /*
       * Busca todos os cursos ativos em que o aluno
       * possui matrícula ativa.
       */
      const [courseRows] = await db.promise().query(
        `
          SELECT
            c.id AS course_id,
            c.name AS course_title,
            c.description,
            c.category,
            c.nivel,
            c.image_url,
            c.workload_hours,
            c.status AS course_status,

            e.id AS enrollment_id,
            e.status AS enrollment_status,
            e.enrolled_at,
            e.class_id

          FROM enrollments e

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?
            AND e.status = 'active'
            AND c.status = 'active'

          ORDER BY
            e.enrolled_at DESC,
            c.name ASC
        `,
        [studentId]
      );

      /*
       * O aluno pode existir, mas ainda não possuir
       * matrícula ativa.
       *
       * Retornamos uma estrutura vazia compatível
       * com o frontend, em vez de erro.
       */
      if (courseRows.length === 0) {
        return res.status(200).json({
          student_id: Number(studentId),

          summary: {
            total_courses: 0,
            courses_in_progress: 0,
            completed_courses: 0,
            not_started_courses: 0,

            total_contents: 0,
            completed_contents: 0,
            in_progress_contents: 0,
            not_started_contents: 0,
            content_progress_percentage: 0,

            total_academic_items: 0,
            delivered_academic_items: 0,
            submitted_academic_items: 0,
            graded_academic_items: 0,
            returned_academic_items: 0,
            pending_academic_items: 0,
            overdue_academic_items: 0,
            academic_progress_percentage: 0,

            average_grade: null,
            average_percentage: null,
          },

          continue_learning: null,
          recent_graded_item: null,
          courses: [],
        });
      }

      const courseIds = courseRows.map((course) =>
        Number(course.course_id)
      );

      /*
       * Mapa course_id -> class_id da matrícula do aluno.
       *
       * Usado para excluir, logo abaixo, qualquer conteúdo
       * exclusivo de uma turma diferente da turma do aluno.
       */
      const classIdByCourse = new Map(
        courseRows.map((course) => [
          Number(course.course_id),
          course.class_id,
        ])
      );

      /*
       * Cria os placeholders (?, ?, ?) necessários
       * para filtrar todos os cursos em uma consulta.
       */
      const coursePlaceholders = courseIds
        .map(() => "?")
        .join(", ");

      /*
       * Busca todos os conteúdos rastreáveis dos cursos.
       *
       * LEFT JOIN é essencial porque conteúdos nunca
       * acessados ainda não possuem registro em
       * student_content_progress.
       */
      const [contentRows] = await db.promise().query(
        `
          SELECT
            cc.id AS content_id,
            cc.course_id,
            cc.class_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.order_index,
            cc.is_required,
            cc.status AS content_status,

            scp.id AS progress_id,
            scp.status AS progress_status,
            scp.progress_percentage,
            scp.last_position_seconds,
            scp.started_at,
            scp.completed_at,
            scp.last_accessed_at,
            scp.created_at AS progress_created_at,
            scp.updated_at AS progress_updated_at

          FROM course_contents cc

          LEFT JOIN student_content_progress scp
            ON scp.content_id = cc.id
            AND scp.student_id = ?

          WHERE cc.course_id IN (${coursePlaceholders})
            AND cc.status = 'active'
            AND cc.type IN (
              'video',
              'pdf',
              'text',
              'live_class'
            )

          ORDER BY
            cc.course_id ASC,
            cc.order_index ASC,
            cc.id ASC
        `,
        [studentId, ...courseIds]
      );

      /*
       * Busca atividades, avaliações e a submission
       * correspondente ao aluno.
       */
      const [academicRows] = await db.promise().query(
        `
          SELECT
            a.id AS activity_id,
            a.course_id,
            a.activity_kind,
            a.title,
            a.description,
            a.type,
            a.due_date,
            a.max_score,
            a.order_index,
            a.is_required,
            a.status AS activity_status,

            sub.id AS submission_id,
            sub.status AS submission_status,
            sub.score,
            sub.feedback,
            sub.submitted_at,
            sub.graded_at,

            CASE
              WHEN sub.id IS NULL
                AND a.due_date IS NOT NULL
                AND a.due_date < NOW()
              THEN 1
              ELSE 0
            END AS is_overdue

          FROM activities a

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id
            AND sub.student_id = ?

          WHERE a.course_id IN (${coursePlaceholders})
            AND a.status = 'active'

          ORDER BY
            a.course_id ASC,

            CASE
              WHEN a.due_date IS NULL
              THEN 1
              ELSE 0
            END ASC,

            a.due_date ASC,
            a.order_index ASC,
            a.id ASC
        `,
        [studentId, ...courseIds]
      );

      /*
       * Agrupa conteúdos por course_id.
       */
      const contentsByCourse = new Map();

      for (const content of contentRows) {
        const courseId = Number(content.course_id);

        /*
         * Nunca considerar conteúdo exclusivo de uma turma
         * diferente da turma da matrícula do aluno neste curso.
         * Conteúdo geral (class_id null) sempre entra.
         */
        const enrollmentClassId = classIdByCourse.get(courseId);

        if (
          content.class_id !== null &&
          content.class_id !== undefined &&
          Number(content.class_id) !== Number(enrollmentClassId)
        ) {
          continue;
        }

        if (!contentsByCourse.has(courseId)) {
          contentsByCourse.set(courseId, []);
        }

        const normalizedProgressStatus =
          content.progress_status || "not_started";

        contentsByCourse.get(courseId).push({
          content_id: Number(content.content_id),
          course_id: courseId,
          title: content.title,
          description: content.description,
          type: content.type,
          content_url: content.content_url,

          order_index: Number(
            content.order_index
          ),

          is_required: Boolean(
            content.is_required
          ),

          content_status:
            content.content_status,

          progress_id:
            content.progress_id !== null &&
            content.progress_id !== undefined
              ? Number(content.progress_id)
              : null,

          progress_status:
            normalizedProgressStatus,

          progress_percentage:
            content.progress_percentage !== null &&
            content.progress_percentage !== undefined
              ? Number(
                  content.progress_percentage
                )
              : 0,

          last_position_seconds:
            content.last_position_seconds !== null &&
            content.last_position_seconds !== undefined
              ? Number(
                  content.last_position_seconds
                )
              : null,

          started_at: content.started_at,
          completed_at: content.completed_at,
          last_accessed_at:
            content.last_accessed_at,

          progress_created_at:
            content.progress_created_at,

          progress_updated_at:
            content.progress_updated_at,
        });
      }

      /*
       * Normaliza e agrupa os itens acadêmicos
       * por course_id.
       */
      const academicItemsByCourse = new Map();

      for (const item of academicRows) {
        const courseId = Number(item.course_id);

        if (
          !academicItemsByCourse.has(
            courseId
          )
        ) {
          academicItemsByCourse.set(
            courseId,
            []
          );
        }

        let academicStatus = "pending";

        if (
          item.submission_status === "graded"
        ) {
          academicStatus = "graded";
        } else if (
          item.submission_status === "returned"
        ) {
          academicStatus = "returned";
        } else if (
          item.submission_status === "submitted" ||
          item.submission_status ===
            "pending_review"
        ) {
          academicStatus = "submitted";
        } else if (Boolean(item.is_overdue)) {
          academicStatus = "overdue";
        }

        academicItemsByCourse
          .get(courseId)
          .push({
            activity_id: Number(
              item.activity_id
            ),

            course_id: courseId,
            activity_kind:
              item.activity_kind,

            title: item.title,
            description: item.description,
            type: item.type,
            due_date: item.due_date,

            max_score:
              item.max_score !== null &&
              item.max_score !== undefined
                ? Number(item.max_score)
                : 10,

            order_index: Number(
              item.order_index
            ),

            is_required: Boolean(
              item.is_required
            ),

            activity_status:
              item.activity_status,

            submission_id:
              item.submission_id !== null &&
              item.submission_id !== undefined
                ? Number(
                    item.submission_id
                  )
                : null,

            submission_status:
              item.submission_status,

            academic_status:
              academicStatus,

            score:
              item.score !== null &&
              item.score !== undefined
                ? Number(item.score)
                : null,

            feedback: item.feedback,
            submitted_at: item.submitted_at,
            graded_at: item.graded_at,

            is_overdue: Boolean(
              item.is_overdue
            ),
          });
      }

      /*
       * Calcula um resumo acadêmico reutilizável.
       */
      function buildAcademicSummary(items) {
        const totalItems = items.length;

        const submittedItems = items.filter(
          (item) =>
            item.academic_status ===
            "submitted"
        ).length;

        const gradedItems = items.filter(
          (item) =>
            item.academic_status ===
            "graded"
        ).length;

        const returnedItems = items.filter(
          (item) =>
            item.academic_status ===
            "returned"
        ).length;

        const pendingItems = items.filter(
          (item) =>
            item.academic_status ===
              "pending" ||
            item.academic_status ===
              "overdue"
        ).length;

        const overdueItems = items.filter(
          (item) =>
            item.academic_status ===
            "overdue"
        ).length;

        /*
         * Uma entrega é considerada realizada quando
         * existe submission, mesmo que:
         * - ainda aguarde correção;
         * - já esteja corrigida;
         * - tenha sido devolvida.
         */
        const deliveredItems =
          submittedItems +
          gradedItems +
          returnedItems;

        const progressPercentage =
          totalItems > 0
            ? Number(
                (
                  (deliveredItems /
                    totalItems) *
                  100
                ).toFixed(2)
              )
            : 0;

        /*
         * Calcula a média somente com itens corrigidos.
         *
         * Cada nota é normalizada pelo max_score.
         */
        const gradedWithScore =
          items.filter(
            (item) =>
              item.academic_status ===
                "graded" &&
              item.score !== null &&
              Number.isFinite(item.score) &&
              item.max_score > 0
          );

        const averagePercentage =
          gradedWithScore.length > 0
            ? gradedWithScore.reduce(
                (total, item) =>
                  total +
                  (item.score /
                    item.max_score) *
                    100,
                0
              ) / gradedWithScore.length
            : null;

        const averageGrade =
          averagePercentage !== null
            ? Number(
                (
                  averagePercentage / 10
                ).toFixed(2)
              )
            : null;

        return {
          total_items: totalItems,
          delivered_items: deliveredItems,
          submitted_items: submittedItems,
          graded_items: gradedItems,
          returned_items: returnedItems,
          pending_items: pendingItems,
          overdue_items: overdueItems,

          progress_percentage:
            progressPercentage,

          average_grade: averageGrade,

          average_percentage:
            averagePercentage !== null
              ? Number(
                  averagePercentage.toFixed(
                    2
                  )
                )
              : null,
        };
      }

      /*
       * Monta o resumo completo de cada curso.
       */
      const courses = courseRows.map(
        (courseRow) => {
          const courseId = Number(
            courseRow.course_id
          );

          const courseContents =
            contentsByCourse.get(courseId) ||
            [];

          const academicItems =
            academicItemsByCourse.get(
              courseId
            ) || [];

          /*
           * Para o cálculo do percentual geral,
           * consideramos somente conteúdos obrigatórios.
           *
           * Caso nenhum conteúdo esteja marcado como
           * obrigatório, utilizamos todos os conteúdos
           * para evitar um curso sempre em 0%.
           */
          const requiredContents =
            courseContents.filter(
              (content) =>
                content.is_required
            );

          const contentsForProgress =
            requiredContents.length > 0
              ? requiredContents
              : courseContents;

          const totalContents =
            contentsForProgress.length;

          const completedContents =
            contentsForProgress.filter(
              (content) =>
                content.progress_status ===
                "completed"
            ).length;

          const inProgressContents =
            contentsForProgress.filter(
              (content) =>
                content.progress_status ===
                "in_progress"
            ).length;

          const notStartedContents =
            totalContents -
            completedContents -
            inProgressContents;

          const contentProgressPercentage =
            totalContents > 0
              ? Number(
                  (
                    (completedContents /
                      totalContents) *
                    100
                  ).toFixed(2)
                )
              : 0;

          let progressStatus =
            "not_started";

          if (
            totalContents > 0 &&
            completedContents ===
              totalContents
          ) {
            progressStatus = "completed";
          } else if (
            completedContents > 0 ||
            inProgressContents > 0
          ) {
            progressStatus =
              "in_progress";
          }

          const academicSummary =
            buildAcademicSummary(
              academicItems
            );

          /*
           * Identifica o conteúdo ainda não concluído
           * com menor order_index.
           */
          const nextContent =
            courseContents.find(
              (content) =>
                content.progress_status !==
                "completed"
            ) || null;

          /*
           * Obtém a data de acesso mais recente
           * dentro do curso.
           */
          const lastAccessedAt =
            courseContents
              .map(
                (content) =>
                  content.last_accessed_at
              )
              .filter(Boolean)
              .sort(
                (firstDate, secondDate) =>
                  new Date(
                    secondDate
                  ).getTime() -
                  new Date(
                    firstDate
                  ).getTime()
              )[0] || null;

          const activityItems =
            academicItems.filter(
              (item) =>
                item.activity_kind ===
                "activity"
            );

          const examItems =
            academicItems.filter(
              (item) =>
                item.activity_kind ===
                "exam"
            );

          return {
            course_id: courseId,
            course_title:
              courseRow.course_title,
            description:
              courseRow.description,
            category: courseRow.category,
            nivel: courseRow.nivel,
            image_url: courseRow.image_url,

            workload_hours:
              courseRow.workload_hours !==
                null &&
              courseRow.workload_hours !==
                undefined
                ? Number(
                    courseRow.workload_hours
                  )
                : null,

            enrolled_at:
              courseRow.enrolled_at,

            progress_status:
              progressStatus,

            last_accessed_at:
              lastAccessedAt,

            next_content_id:
              nextContent?.content_id ||
              null,

            next_content_title:
              nextContent?.title || null,

            content_progress: {
              total_contents:
                totalContents,

              completed_contents:
                completedContents,

              in_progress_contents:
                inProgressContents,

              not_started_contents:
                notStartedContents,

              progress_percentage:
                contentProgressPercentage,
            },

            academic_progress: {
              ...academicSummary,

              activities:
                buildAcademicSummary(
                  activityItems
                ),

              exams:
                buildAcademicSummary(
                  examItems
                ),
            },

            /*
             * A página geral não precisa obrigatoriamente
             * renderizar todas as listas, mas elas são
             * úteis para futuras expansões.
             */
            contents: courseContents,
            academic_items:
              academicItems,
          };
        }
      );

      /*
       * Consolida conteúdos de todos os cursos.
       *
       * Aqui usamos os mesmos conteúdos considerados
       * no cálculo individual:
       * - obrigatórios quando existirem;
       * - todos caso o curso não possua obrigatórios.
       */
      const allContentsForProgress =
        courses.flatMap((course) => {
          const originalContents =
            course.contents || [];

          const required =
            originalContents.filter(
              (content) =>
                content.is_required
            );

          return required.length > 0
            ? required
            : originalContents;
        });

      const totalContents =
        allContentsForProgress.length;

      const completedContents =
        allContentsForProgress.filter(
          (content) =>
            content.progress_status ===
            "completed"
        ).length;

      const inProgressContents =
        allContentsForProgress.filter(
          (content) =>
            content.progress_status ===
            "in_progress"
        ).length;

      const notStartedContents =
        totalContents -
        completedContents -
        inProgressContents;

      const contentProgressPercentage =
        totalContents > 0
          ? Number(
              (
                (completedContents /
                  totalContents) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * Consolida todos os itens acadêmicos.
       */
      const allAcademicItems =
        courses.flatMap(
          (course) =>
            course.academic_items || []
        );

      const globalAcademicSummary =
        buildAcademicSummary(
          allAcademicItems
        );

      const totalCourses = courses.length;

      const coursesInProgress =
        courses.filter(
          (course) =>
            course.progress_status ===
            "in_progress"
        ).length;

      const completedCourses =
        courses.filter(
          (course) =>
            course.progress_status ===
            "completed"
        ).length;

      const notStartedCourses =
        courses.filter(
          (course) =>
            course.progress_status ===
            "not_started"
        ).length;

      /*
       * Identifica o item corrigido mais recente.
       */
      const recentGradedItem =
        allAcademicItems
          .filter(
            (item) =>
              item.academic_status ===
                "graded" &&
              item.graded_at
          )
          .sort(
            (firstItem, secondItem) =>
              new Date(
                secondItem.graded_at
              ).getTime() -
              new Date(
                firstItem.graded_at
              ).getTime()
          )[0] || null;

      /*
       * Define o melhor ponto para "Continuar estudando".
       *
       * Prioridade:
       * 1. curso acessado mais recentemente;
       * 2. primeiro curso em andamento;
       * 3. primeiro curso não iniciado;
       * 4. primeiro curso disponível.
       */
      const courseWithRecentAccess =
        courses
          .filter(
            (course) =>
              course.last_accessed_at
          )
          .sort(
            (firstCourse, secondCourse) =>
              new Date(
                secondCourse.last_accessed_at
              ).getTime() -
              new Date(
                firstCourse.last_accessed_at
              ).getTime()
          )[0] || null;

      const continueCourse =
        courseWithRecentAccess ||
        courses.find(
          (course) =>
            course.progress_status ===
            "in_progress"
        ) ||
        courses.find(
          (course) =>
            course.progress_status ===
            "not_started"
        ) ||
        courses[0] ||
        null;

      const continueLearning =
        continueCourse
          ? {
              course_id:
                continueCourse.course_id,

              course_title:
                continueCourse.course_title,

              content_id:
                continueCourse.next_content_id,

              content_title:
                continueCourse.next_content_title,

              last_accessed_at:
                continueCourse.last_accessed_at,
            }
          : null;

      /*
       * Remove as listas detalhadas da resposta por curso.
       *
       * A página ProgressoAluno atualmente precisa apenas
       * dos resumos. Isso mantém o payload mais leve.
       *
       * Caso precise mostrar a lista completa futuramente,
       * use as rotas específicas de cada curso.
       */
      const summarizedCourses = courses.map(
        ({
          contents,
          academic_items,
          ...courseSummary
        }) => courseSummary
      );

      return res.status(200).json({
        student_id: Number(studentId),

        summary: {
          total_courses:
            totalCourses,

          courses_in_progress:
            coursesInProgress,

          completed_courses:
            completedCourses,

          not_started_courses:
            notStartedCourses,

          total_contents:
            totalContents,

          completed_contents:
            completedContents,

          in_progress_contents:
            inProgressContents,

          not_started_contents:
            notStartedContents,

          content_progress_percentage:
            contentProgressPercentage,

          total_academic_items:
            globalAcademicSummary.total_items,

          delivered_academic_items:
            globalAcademicSummary.delivered_items,

          submitted_academic_items:
            globalAcademicSummary.submitted_items,

          graded_academic_items:
            globalAcademicSummary.graded_items,

          returned_academic_items:
            globalAcademicSummary.returned_items,

          pending_academic_items:
            globalAcademicSummary.pending_items,

          overdue_academic_items:
            globalAcademicSummary.overdue_items,

          academic_progress_percentage:
            globalAcademicSummary.progress_percentage,

          average_grade:
            globalAcademicSummary.average_grade,

          average_percentage:
            globalAcademicSummary.average_percentage,
        },

        continue_learning:
          continueLearning,

        recent_graded_item:
          recentGradedItem,

        courses:
          summarizedCourses,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar visão geral do progresso:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar a visão geral do progresso.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);

// ======================================================
// ALUNO FINANCEIRO
// ======================================================

app.get(
  "/api/student/finance",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      const studentId = await getStudentIdByUserId(userId);

      if (!studentId) {
        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      // --------------------------------------------------
      // FINANCIAL CONTRACTS
      // --------------------------------------------------

      const [contracts] = await db.promise().query(
        `
          SELECT
            fc.id,
            fc.enrollment_id AS enrollmentId,
            fc.pricing_plan_id AS pricingPlanId,

            e.student_id AS studentId,
            e.course_id AS courseId,

            c.name AS courseName,

            fc.billing_type AS billingType,
            fc.plan_name AS planName,
            fc.total_amount AS totalAmount,

            fc.monthly_payment_count AS monthlyPaymentCount,
            fc.monthly_payment_amount AS monthlyPaymentAmount,
            fc.max_card_installments AS maxCardInstallments,

            fc.accepts_pix AS acceptsPix,
            fc.accepts_boleto AS acceptsBoleto,
            fc.accepts_credit_card AS acceptsCreditCard,

            fc.status,
            fc.start_date AS startDate,
            fc.completed_at AS completedAt,
            fc.cancelled_at AS cancelledAt,

            fc.created_at AS createdAt,
            fc.updated_at AS updatedAt

          FROM financial_contracts fc

          INNER JOIN enrollments e
            ON e.id = fc.enrollment_id

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?

          ORDER BY
            fc.created_at DESC,
            fc.id DESC
        `,
        [studentId]
      );

      // --------------------------------------------------
      // INVOICES
      // --------------------------------------------------

      const [invoices] = await db.promise().query(
        `
          SELECT
            i.id,
            i.financial_contract_id AS contractId,

            e.student_id AS studentId,
            e.course_id AS courseId,

            c.name AS courseName,

            i.invoice_type AS invoiceType,
            i.installment_number AS installmentNumber,
            i.installment_count AS totalInstallments,

            i.description,
            i.amount,
            i.due_date AS dueDate,
            i.status,

            i.paid_at AS paidAt,
            i.cancelled_at AS cancelledAt,

            i.created_at AS createdAt,
            i.updated_at AS updatedAt

          FROM invoices i

          INNER JOIN financial_contracts fc
            ON fc.id = i.financial_contract_id

          INNER JOIN enrollments e
            ON e.id = fc.enrollment_id

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?

          ORDER BY
            i.due_date ASC,
            i.id ASC
        `,
        [studentId]
      );

      // --------------------------------------------------
      // PAYMENTS
      // --------------------------------------------------

      const [payments] = await db.promise().query(
        `
          SELECT
            p.id,
            p.invoice_id AS invoiceId,

            i.financial_contract_id AS contractId,

            e.student_id AS studentId,
            e.course_id AS courseId,

            c.name AS courseName,

            p.gateway,
            p.gateway_payment_id AS gatewayPaymentId,
            p.payment_method AS paymentMethod,

            p.amount,
            p.status,

            p.card_installments AS cardInstallments,
            p.card_brand AS cardBrand,
            p.card_last_four AS cardLastFour,

            p.pix_expires_at AS pixExpiresAt,
            p.boleto_due_date AS boletoDueDate,

            p.paid_at AS paidAt,
            p.rejected_at AS rejectedAt,
            p.cancelled_at AS cancelledAt,
            p.refunded_at AS refundedAt,

            p.created_at AS createdAt,
            p.updated_at AS updatedAt

          FROM payments p

          INNER JOIN invoices i
            ON i.id = p.invoice_id

          INNER JOIN financial_contracts fc
            ON fc.id = i.financial_contract_id

          INNER JOIN enrollments e
            ON e.id = fc.enrollment_id

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?

          ORDER BY
            COALESCE(
              p.paid_at,
              p.rejected_at,
              p.cancelled_at,
              p.refunded_at,
              p.created_at
            ) DESC,
            p.id DESC
        `,
        [studentId]
      );

      // --------------------------------------------------
      // SUMMARY
      // --------------------------------------------------

      const summary = {
        totalContracted: contracts.reduce(
          (total, contract) =>
            total + Number(contract.totalAmount || 0),
          0
        ),

        totalPaid: invoices.reduce(
          (total, invoice) => {
            if (invoice.status !== "paid") {
              return total;
            }

            return total + Number(invoice.amount || 0);
          },
          0
        ),

        totalPending: invoices.reduce(
          (total, invoice) => {
            if (
              !["pending", "processing"].includes(
                invoice.status
              )
            ) {
              return total;
            }

            return total + Number(invoice.amount || 0);
          },
          0
        ),

        totalOverdue: invoices.reduce(
          (total, invoice) => {
            if (invoice.status !== "overdue") {
              return total;
            }

            return total + Number(invoice.amount || 0);
          },
          0
        ),
      };

      // As faturas já estão ordenadas por vencimento crescente.
      const overdueInvoice =
        invoices.find(
          (invoice) => invoice.status === "overdue"
        ) || null;

      const nextInvoice =
        invoices.find((invoice) =>
          ["pending", "processing"].includes(
            invoice.status
          )
        ) || null;

      return res.status(200).json({
        summary,
        overdueInvoice,
        nextInvoice,
        contracts,
        invoices,
        payments,
      });
    } catch (error) {
      console.error("Erro ao buscar dados financeiros do aluno:");
      console.error("Mensagem:", error.message);
      console.error("Código:", error.code);
      console.error("SQL message:", error.sqlMessage);
      console.error("SQL:", error.sql);

      return res.status(500).json({
        message: "Erro interno ao buscar os dados financeiros.",
        error:
          process.env.NODE_ENV === "development"
            ? error.sqlMessage || error.message
            : undefined,
      });
    }
  }
);




   /* ==========================================================
   ÁREA DO PROFESSOR
   Cursos, alunos, tarefas e conteúdos
   ========================================================== */




/* ==========================================================
   PROFESSOR — CURSOS
   ========================================================== */

/**
 * GET /api/teacher/by-user/:userId/courses
 * Lista os cursos atribuídos ao professor.
 */
app.get(
  "/api/teacher/by-user/:userId/courses",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      // Identidade sempre vem do token — nunca da URL.
      const normalizedUserId = req.auth.userId;

      /*
       * Busca os cursos do professor e calcula
       * o total de alunos com matrícula ativa.
       */
      const [courses] = await db.promise().query(
        `
          SELECT
            c.id,
            c.name,
            c.description,
            c.status,
            c.category,
            c.nivel,
            c.workload_hours,
            c.image_url,

            COUNT(DISTINCT e.student_id) AS total_students

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          LEFT JOIN enrollments e
            ON e.course_id = c.id
            AND e.status = 'active'

          WHERE t.user_id = ?

          GROUP BY
            c.id,
            c.name,
            c.description,
            c.status,
            c.category,
            c.nivel,
            c.workload_hours,
            c.image_url

          ORDER BY c.name ASC
        `,
        [normalizedUserId]
      );

      return res.status(200).json(courses);
    } catch (error) {
      console.error(
        "Erro ao buscar cursos do professor:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar cursos do professor.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — ALUNOS
   ========================================================== */

/**
 * GET /api/teacher/by-user/:userId/students
 * Lista os alunos matriculados nos cursos do professor.
 */
app.get(
  "/api/teacher/by-user/:userId/students",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      // Identidade sempre vem do token — nunca da URL.
      const normalizedUserId = req.auth.userId;

      /*
       * Retorna uma linha por matrícula.
       *
       * Caso o mesmo aluno esteja matriculado em dois
       * cursos do professor, ele aparecerá duas vezes,
       * cada vez associado ao respectivo curso.
       */
      const [students] = await db.promise().query(
        `
          SELECT
            s.id AS student_id,
            s.user_id,
            s.name,
            s.email,
            s.gender,
            s.registration_number,
            s.status AS student_status,

            e.course_id,
            e.status AS enrollment_status,
            e.enrolled_at,

            c.name AS course_title

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          INNER JOIN enrollments e
            ON e.course_id = c.id

          INNER JOIN students s
            ON s.id = e.student_id

          WHERE t.user_id = ?

          ORDER BY
            s.name ASC,
            c.name ASC
        `,
        [normalizedUserId]
      );

      return res.status(200).json(students);
    } catch (error) {
      console.error(
        "Erro ao buscar alunos do professor:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar alunos do professor.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — LISTAGEM E CRUD DE CONTEÚDOS

   Migradas para backend/routes/teacherContentRoutes.js e
   backend/services/courseContents/teacherCourseContentService.js:
   - GET /api/teacher/by-user/:userId/course-contents
   - POST /api/course-contents
   - PUT /api/course-contents/:id
   - DELETE /api/course-contents/:id
   ========================================================== */


/* ==========================================================
   FIM DA PARTE 3
   A próxima seção contém atividades, avaliações,
   submissões e correção do professor.
   ========================================================== */

/* ==========================================================
   PROFESSOR — ATIVIDADES E AVALIAÇÕES

   Migradas para backend/routes/teacherActivityRoutes.js e
   backend/services/activities/teacherActivityService.js:
   - POST /api/activities
   - GET /api/teacher/by-user/:userId/activities
   - GET /api/teacher/by-user/:userId/activities/:activityId/full
   - PUT /api/teacher/by-user/:userId/activities/:activityId
   - DELETE /api/activities/:id
   ========================================================== */

/*
 * ============================================================
 * HELPER — BUSCAR PROFESSOR PELO ID DO USUÁRIO
 * ============================================================
 *
 * O frontend envia users.id.
 * As tabelas acadêmicas usam teachers.id.
 */
async function getTeacherIdByUserId(userId) {
  const [rows] = await db.promise().query(
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
/*
 * ============================================================
 * HELPER — VALIDAR TURMA VINCULADA AO PROFESSOR
 * ============================================================
 *
 * Confirma que:
 * - o usuário corresponde a um professor;
 * - a turma existe;
 * - a turma está vinculada ao professor;
 * - o curso relacionado existe.
 */


/*
 * ============================================================
 * HELPER — VALIDAR IDS DE USUÁRIO E TURMA
 * ============================================================
 */
function validateTeacherClassParams(req, res) {
  // Identidade sempre vem do token (exige authenticateToken no
  // middleware da rota) — nunca do :userId da URL.
  const userId = req.auth.userId;
  const classId = Number(req.params.classId);

  if (!Number.isInteger(classId) || classId <= 0) {
    res.status(400).json({
      message: "ID da turma inválido.",
    });

    return null;
  }

  return {
    userId,
    classId,
  };
}

/*
 * ============================================================
 * PROFESSOR — LISTAR TURMAS ATRIBUÍDAS
 * GET /api/teacher/by-user/:userId/classes
 * ============================================================
 *
 * Retorna uma linha por turma, incluindo:
 * - dados da turma;
 * - curso;
 * - quantidade de alunos ativos;
 * - quantidade de conteúdos ativos;
 * - quantidade de atividades ativas.
 */
app.get(
  "/api/teacher/by-user/:userId/classes",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      // Identidade sempre vem do token — nunca da URL.
      const userId = req.auth.userId;

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim()
          : "";

      const allowedStatuses = new Set([
        "",
        "active",
        "inactive",
        "finished",
      ]);

      if (!allowedStatuses.has(status)) {
        return res.status(400).json({
          message:
            "Status de turma inválido.",
        });
      }

      const teacherId =
        await getTeacherIdByUserId(userId);

      if (!teacherId) {
        return res.status(404).json({
          message:
            "Professor não encontrado.",
        });
      }

      const queryParams = [teacherId];

      let statusCondition = "";

      if (status) {
        statusCondition =
          "AND cl.status = ?";

        queryParams.push(status);
      }

      const [rows] =
        await db.promise().query(
          `
            SELECT
              cl.id,
              cl.course_id,
              cl.teacher_id,
              cl.name,
              cl.shift,
              cl.start_date,
              cl.end_date,
              cl.status,
              cl.created_at,
              cl.updated_at,

              c.name AS course_name,
              c.description
                AS course_description,
              c.image_url
                AS course_image_url,
              c.category
                AS course_category,
              c.nivel
                AS course_level,

              COALESCE(
                enrollment_stats.student_count,
                0
              ) AS student_count,

              (
                SELECT COUNT(*)
                FROM course_contents cc
                WHERE cc.course_id = cl.course_id
                  AND (
                    cc.class_id IS NULL
                    OR cc.class_id = cl.id
                  )
                  AND cc.status = 'active'
                  AND cc.type IN (
                    'video',
                    'pdf',
                    'text',
                    'live_class'
                  )
              ) AS content_count,

              (
                SELECT COUNT(*)
                FROM activities a
                WHERE a.course_id = cl.course_id
                  AND (
                    a.class_id IS NULL
                    OR a.class_id = cl.id
                  )
                  AND a.status = 'active'
              ) AS activity_count

            FROM classes cl

            INNER JOIN courses c
              ON c.id = cl.course_id

            LEFT JOIN (
              SELECT
                e.class_id,

                COUNT(
                  DISTINCT e.student_id
                ) AS student_count

              FROM enrollments e

              WHERE e.status = 'active'

              GROUP BY e.class_id
            ) enrollment_stats
              ON enrollment_stats.class_id =
                cl.id

            WHERE cl.teacher_id = ?
              ${statusCondition}

            ORDER BY
              CASE
                WHEN cl.status = 'active'
                  THEN 1
                WHEN cl.status = 'inactive'
                  THEN 2
                WHEN cl.status = 'finished'
                  THEN 3
                ELSE 4
              END,

              cl.start_date DESC,
              cl.name ASC
          `,
          queryParams
        );

      return res.status(200).json({
        classes: rows.map(
          (classItem) => ({
            id: classItem.id,
            name: classItem.name,

            courseId:
              classItem.course_id,

            teacherId:
              classItem.teacher_id,

            courseName:
              classItem.course_name,

            courseDescription:
              classItem.course_description,

            courseImageUrl:
              classItem.course_image_url,

            courseCategory:
              classItem.course_category,

            courseLevel:
              classItem.course_level,

            shift: classItem.shift,

            startDate:
              classItem.start_date,

            endDate:
              classItem.end_date,

            status: classItem.status,

            studentCount: Number(
              classItem.student_count || 0
            ),

            contentCount: Number(
              classItem.content_count || 0
            ),

            activityCount: Number(
              classItem.activity_count || 0
            ),

            createdAt:
              classItem.created_at,

            updatedAt:
              classItem.updated_at,
          })
        ),
      });
    } catch (error) {
      console.error(
        "Erro ao listar turmas do professor:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar turmas do professor.",

        error: error.message,

        sqlMessage:
          error.sqlMessage || null,

        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — BUSCAR DASHBOARD DE UMA TURMA
 * GET /api/teacher/by-user/:userId/classes/:classId
 * ============================================================
 *
 * Retorna:
 * - dados da turma;
 * - dados do curso;
 * - quantidade de alunos;
 * - quantidade de conteúdos;
 * - quantidade de atividades.
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(
        req,
        res
      );

      if (!params) return;

      const { userId, classId } = params;

      const classData =
        await getTeacherClassByUserId(
          db.promise(),
          userId,
          classId
      );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada ao professor.",
        });
      }

      const [
        [studentRows],
        [contentRows],
        [activityRows],
      ] = await Promise.all([
        db.promise().query(
          `
            SELECT
              COUNT(DISTINCT e.student_id)
                AS student_count

            FROM enrollments e

            WHERE e.class_id = ?
              AND e.status = 'active'
          `,
          [classId]
        ),

        db.promise().query(
          `
            SELECT
              COUNT(*) AS content_count

            FROM course_contents cc

            WHERE cc.course_id = ?
              AND (
                cc.class_id IS NULL
                OR cc.class_id = ?
              )
              AND cc.status = 'active'
              AND cc.type IN (
                'video',
                'pdf',
                'text',
                'live_class'
              )
          `,
          [classData.course_id, classId]
        ),

        db.promise().query(
          `
            SELECT
              COUNT(*) AS activity_count

            FROM activities a

            WHERE a.course_id = ?
              AND (
                a.class_id IS NULL
                OR a.class_id = ?
              )
              AND a.status = 'active'
          `,
          [classData.course_id, classId]
        ),
      ]);

      const studentStats =
        studentRows[0] || {};

      const contentStats =
        contentRows[0] || {};

      const activityStats =
        activityRows[0] || {};

      return res.status(200).json({
        class: {
          id: classData.id,
          name: classData.name,

          courseId: classData.course_id,
          teacherId: classData.teacher_id,

          shift: classData.shift,
          startDate: classData.start_date,
          endDate: classData.end_date,
          status: classData.status,

          createdAt: classData.created_at,
          updatedAt: classData.updated_at,
        },

        course: {
          id: classData.course_id,
          name: classData.course_name,

          description:
            classData.course_description,

          imageUrl:
            classData.course_image_url,

          category:
            classData.course_category,

          level:
            classData.course_level,
        },

        stats: {
          studentCount: Number(
            studentStats.student_count || 0
          ),

          contentCount: Number(
            contentStats.content_count || 0
          ),

          activityCount: Number(
            activityStats.activity_count || 0
          ),

          attendancePercentage: null,
        },
      });
    } catch (error) {
      console.error(
        "Erro ao buscar dashboard da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar os dados da turma.",

        error: error.message,
        sqlMessage: error.sqlMessage || null,
        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — LISTAR ALUNOS DE UMA TURMA
 * GET /api/teacher/by-user/:userId/classes/:classId/students
 * ============================================================
 *
 * Lista apenas matrículas relacionadas à turma selecionada.
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId/students",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(req, res);

      if (!params) return;

      const { userId, classId } = params;

      const classData = await getTeacherClassByUserId(
                                db.promise(),
                                userId,
                                classId
                              );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada ao professor.",
        });
      }

      const [rows] = await db.promise().query(
        `
          SELECT
            e.id AS enrollment_id,
            e.status AS enrollment_status,
            e.created_at AS enrolled_at,

            s.id AS student_id,
            s.registration_number,

            u.id AS user_id,
            u.name,
            u.email

          FROM enrollments e

          INNER JOIN students s
            ON s.id = e.student_id

          INNER JOIN users u
            ON u.id = s.user_id

          WHERE e.class_id = ?

          ORDER BY
            CASE
              WHEN e.status = 'active' THEN 1
              WHEN e.status = 'completed' THEN 2
              WHEN e.status = 'inactive' THEN 3
              ELSE 4
            END,
            u.name ASC
        `,
        [classId]
      );

      return res.status(200).json({
        class: {
          id: classData.id,
          name: classData.name,
          shift: classData.shift,
          status: classData.status,

          courseId: classData.course_id,
          courseTitle: classData.course_title,
        },

        students: rows.map((student) => ({
          enrollmentId: student.enrollment_id,
          enrollmentStatus:
            student.enrollment_status,
          enrolledAt: student.enrolled_at,

          studentId: student.student_id,
          registrationNumber:
            student.registration_number,

          userId: student.user_id,
          name: student.name,
          email: student.email,
        })),
      });
    } catch (error) {
      console.error(
        "Erro ao listar alunos da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar os alunos da turma.",
        error: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
      });
    }
  }
);

/*
 * PROFESSOR — LISTAR CONTEÚDOS DO CURSO DA TURMA
 * GET /api/teacher/by-user/:userId/classes/:classId/contents
 *
 * Migrada para backend/routes/teacherContentRoutes.js e
 * backend/services/courseContents/teacherCourseContentService.js.
 */

/*
 * ============================================================
 * PROFESSOR — LISTAR ATIVIDADES DO CURSO DA TURMA
 * GET /api/teacher/by-user/:userId/classes/:classId/activities
 * ============================================================
 *
 * Retorna atividades gerais do curso (class_id NULL) e
 * exclusivas desta turma — nunca atividades de outra turma.
 *
 * As submissões não são contadas nesta rota para evitar
 * misturar alunos de turmas diferentes.
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId/activities",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(req, res);

      if (!params) return;

      const { userId, classId } = params;

      const activityKind =
        req.query.activityKind?.trim() || "";

      const status =
        req.query.status?.trim() || "";

      const allowedKinds = new Set([
        "",
        "activity",
        "exam",
      ]);

      const allowedStatuses = new Set([
        "",
        "active",
        "inactive",
        "draft",
        "archived",
      ]);

      if (!allowedKinds.has(activityKind)) {
        return res.status(400).json({
          message: "Tipo de atividade inválido.",
        });
      }

      if (!allowedStatuses.has(status)) {
        return res.status(400).json({
          message: "Status de atividade inválido.",
        });
      }

      const classData = await getTeacherClassByUserId(
              db.promise(),
              userId,
              classId
            );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada ao professor.",
        });
      }

      const queryParams = [classData.course_id, classId];

      let activityKindCondition = "";
      let statusCondition = "";

      if (activityKind) {
        activityKindCondition =
          "AND a.activity_kind = ?";

        queryParams.push(activityKind);
      }

      if (status) {
        statusCondition = "AND a.status = ?";
        queryParams.push(status);
      }

      const [rows] = await db.promise().query(
        `
          SELECT
            a.id,
            a.course_id,
            a.class_id,
            a.activity_kind,
            a.title,
            a.description,
            a.type,
            a.due_date,
            a.max_score,
            a.order_index,
            a.is_required,
            a.status,
            a.created_at,
            a.updated_at,

            COUNT(DISTINCT aq.id)
              AS question_count

          FROM activities a

          LEFT JOIN activity_questions aq
            ON aq.activity_id = a.id

          WHERE a.course_id = ?
            AND (
              a.class_id IS NULL
              OR a.class_id = ?
            )
            ${activityKindCondition}
            ${statusCondition}

          GROUP BY
            a.id,
            a.course_id,
            a.class_id,
            a.activity_kind,
            a.title,
            a.description,
            a.type,
            a.due_date,
            a.max_score,
            a.order_index,
            a.is_required,
            a.status,
            a.created_at,
            a.updated_at

          ORDER BY
            a.order_index ASC,
            a.due_date ASC,
            a.created_at ASC
        `,
        queryParams
      );

      return res.status(200).json({
        class: {
          id: classData.id,
          name: classData.name,
          shift: classData.shift,
          status: classData.status,

          courseId: classData.course_id,
          courseTitle: classData.course_title,
        },

        activities: rows.map((activity) => {
          const isClassSpecific = activity.class_id !== null;

          return {
          id: activity.id,
          courseId: activity.course_id,

          classId: activity.class_id,
          className: isClassSpecific ? classData.name : null,
          activityScope: isClassSpecific
            ? "class_specific"
            : "general",

          activityKind:
            activity.activity_kind,

          title: activity.title,
          description: activity.description,
          type: activity.type,

          dueDate: activity.due_date,
          maxScore: Number(activity.max_score),

          orderIndex: activity.order_index,
          isRequired: Boolean(
            activity.is_required
          ),

          status: activity.status,

          questionCount: Number(
            activity.question_count || 0
          ),

          createdAt: activity.created_at,
          updatedAt: activity.updated_at,
        };
        }),
      });
    } catch (error) {
      console.error(
        "Erro ao listar atividades da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar as atividades da turma.",
        error: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — HELPERS DE SESSÕES DA TURMA
 * ============================================================
 */

const allowedClassSessionTypes = new Set([
  "class",
  "review",
  "exam",
  "presentation",
  "workshop",
  "lab",
  "recovery",
  "other",
]);

const allowedClassSessionStatuses = new Set([
  "scheduled",
  "completed",
  "cancelled",
]);

function isValidDateString(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

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

  if (
    typeof value !== "string" ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(value)
  ) {
    return false;
  }

  const [hours, minutes, seconds = "00"] =
    value.split(":");

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

function validateSessionId(req, res) {
  // Identidade sempre vem do token (exige authenticateToken no
  // middleware da rota) — nunca do :userId da URL.
  const userId = req.auth.userId;
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    res.status(400).json({
      message: "ID da sessão inválido.",
    });

    return null;
  }

  return {
    userId,
    sessionId,
  };
}

/*
 * Busca uma sessão e confirma que sua turma pertence
 * ao professor identificado por users.id.
 */
async function getTeacherSessionByUserId(
  userId,
  sessionId,
  options = {}
) {
  const {
    includeCancelled = true,
    connection = null,
  } = options;

  const queryExecutor =
    connection || db.promise();

  const cancelledCondition =
    includeCancelled
      ? ""
      : "AND cs.status <> 'cancelled'";

  const [rows] =
    await queryExecutor.query(
      `
        SELECT
          cs.id,
          cs.class_id,
          cs.session_number,
          cs.title,
          cs.session_date,
          cs.start_time,
          cs.end_time,
          cs.session_type,
          cs.description,
          cs.status,
          cs.created_at,
          cs.updated_at,

          cl.name AS class_name,
          cl.shift,
          cl.course_id,
          cl.teacher_id,
          cl.start_date
            AS class_start_date,
          cl.end_date
            AS class_end_date,
          cl.status
            AS class_status,

          c.name AS course_name,
          c.planned_session_count,

          t.user_id
            AS teacher_user_id

        FROM class_sessions cs

        INNER JOIN classes cl
          ON cl.id = cs.class_id

        INNER JOIN courses c
          ON c.id = cl.course_id

        INNER JOIN teachers t
          ON t.id = cl.teacher_id

        WHERE cs.id = ?
          AND t.user_id = ?
          ${cancelledCondition}

        LIMIT 1
      `,
      [sessionId, userId]
    );

  return rows[0] || null;
}

function mapClassSession(session) {
  return {
    id: session.id,
    classId: session.class_id,

    sessionNumber:
      session.session_number,

    title: session.title,
    sessionDate:
      session.session_date,

    startTime:
      session.start_time,

    endTime:
      session.end_time,

    sessionType:
      session.session_type,

    description:
      session.description,

    status: session.status,

    createdAt:
      session.created_at,

    updatedAt:
      session.updated_at,
  };
}

/*
 * ============================================================
 * PROFESSOR — LISTAR SESSÕES DE UMA TURMA
 * ============================================================
 *
 * GET
 * /api/teacher/by-user/:userId/classes/:classId/sessions
 *
 * Filtros opcionais:
 * ?status=scheduled
 * ?sessionType=class
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId/sessions",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(
        req,
        res
      );

      if (!params) return;

      const { userId, classId } = params;

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim()
          : "";

      const sessionType =
        typeof req.query.sessionType === "string"
          ? req.query.sessionType.trim()
          : "";

      const allowedStatusFilters = new Set([
        "",
        ...allowedClassSessionStatuses,
      ]);

      const allowedTypeFilters = new Set([
        "",
        ...allowedClassSessionTypes,
      ]);

      if (!allowedStatusFilters.has(status)) {
        return res.status(400).json({
          message: "Status de sessão inválido.",
        });
      }

      if (!allowedTypeFilters.has(sessionType)) {
        return res.status(400).json({
          message: "Tipo de sessão inválido.",
        });
      }

      const classData = await getTeacherClassByUserId(
              db.promise(),
              userId,
              classId
            );
      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada ao professor.",
        });
      }

      const queryParams = [classId];

      let statusCondition = "";
      let typeCondition = "";

      if (status) {
        statusCondition = "AND cs.status = ?";
        queryParams.push(status);
      }

      if (sessionType) {
        typeCondition =
          "AND cs.session_type = ?";

        queryParams.push(sessionType);
      }

      const [sessionRows] = await db.promise().query(
        `
          SELECT
            cs.id,
            cs.class_id,
            cs.session_number,
            cs.title,
            cs.session_date,
            cs.start_time,
            cs.end_time,
            cs.session_type,
            cs.description,
            cs.status,
            cs.created_at,
            cs.updated_at,

            COUNT(a.id) AS attendance_record_count,

            SUM(
              CASE
                WHEN a.status = 'present'
                THEN 1
                ELSE 0
              END
            ) AS present_count,

            SUM(
              CASE
                WHEN a.status = 'absent'
                THEN 1
                ELSE 0
              END
            ) AS absent_count,

            SUM(
              CASE
                WHEN a.status = 'late'
                THEN 1
                ELSE 0
              END
            ) AS late_count,

            SUM(
              CASE
                WHEN a.status = 'excused'
                THEN 1
                ELSE 0
              END
            ) AS excused_count

          FROM class_sessions cs

          LEFT JOIN attendance a
            ON a.class_session_id = cs.id

          WHERE cs.class_id = ?
            ${statusCondition}
            ${typeCondition}

          GROUP BY
            cs.id,
            cs.class_id,
            cs.session_number,
            cs.title,
            cs.session_date,
            cs.start_time,
            cs.end_time,
            cs.session_type,
            cs.description,
            cs.status,
            cs.created_at,
            cs.updated_at

          ORDER BY
            cs.session_date ASC,
            cs.start_time ASC,
            cs.session_number ASC
        `,
        queryParams
      );

      const [summaryRows] = await db.promise().query(
        `
          SELECT
            COUNT(*) AS total_sessions,

            SUM(
              CASE
                WHEN status = 'scheduled'
                THEN 1
                ELSE 0
              END
            ) AS scheduled_sessions,

            SUM(
              CASE
                WHEN status = 'completed'
                THEN 1
                ELSE 0
              END
            ) AS completed_sessions,

            SUM(
              CASE
                WHEN status = 'cancelled'
                THEN 1
                ELSE 0
              END
            ) AS cancelled_sessions

          FROM class_sessions

          WHERE class_id = ?
        `,
        [classId]
      );

      const summaryRow = summaryRows[0];

      const plannedSessionCount = Number(
        classData.planned_session_count || 0
      );

      const totalSessions = Number(
        summaryRow.total_sessions || 0
      );

      const activeSessionCount =
        Number(
          summaryRow.scheduled_sessions || 0
        ) +
        Number(
          summaryRow.completed_sessions || 0
        );

      return res.status(200).json({
        class: {
          id: classData.id,
          name: classData.name,
          shift: classData.shift,
          status: classData.status,

          courseId: classData.course_id,
          courseTitle:
            classData.course_title ||
            classData.course_name,

          plannedSessionCount,
        },

        sessions: sessionRows.map((session) => ({
          ...mapClassSession(session),

          attendanceSummary: {
            total: Number(
              session.attendance_record_count || 0
            ),

            present: Number(
              session.present_count || 0
            ),

            absent: Number(
              session.absent_count || 0
            ),

            late: Number(
              session.late_count || 0
            ),

            excused: Number(
              session.excused_count || 0
            ),
          },
        })),

        summary: {
          totalSessions,

          activeSessionCount,

          scheduled: Number(
            summaryRow.scheduled_sessions || 0
          ),

          completed: Number(
            summaryRow.completed_sessions || 0
          ),

          cancelled: Number(
            summaryRow.cancelled_sessions || 0
          ),

          plannedSessionCount,

          remainingToPlan:
            plannedSessionCount > 0
              ? Math.max(
                  plannedSessionCount -
                    activeSessionCount,
                  0
                )
              : null,
        },
      });
    } catch (error) {
      console.error(
        "Erro ao listar sessões da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar as sessões da turma.",

        error:
          error.sqlMessage || error.message,

        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — BUSCAR UMA SESSÃO
 * ============================================================
 *
 * GET
 * /api/teacher/by-user/:userId/class-sessions/:sessionId
 */
app.get(
  "/api/teacher/by-user/:userId/class-sessions/:sessionId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateSessionId(req, res);

      if (!params) return;

      const { userId, sessionId } = params;

      const session =
        await getTeacherSessionByUserId(
          userId,
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          message:
            "Sessão não encontrada ou não vinculada ao professor.",
        });
      }

      return res.status(200).json({
        class: {
          id: session.class_id,
          name: session.class_name,
          shift: session.shift,
          status: session.class_status,

          courseId: session.course_id,
          courseName: session.course_name,

          plannedSessionCount:
            session.planned_session_count,
        },

        session: mapClassSession(session),
      });
    } catch (error) {
      console.error(
        "Erro ao buscar sessão da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar a sessão.",

        error:
          error.sqlMessage || error.message,

        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — CRIAR SESSÃO
 * ============================================================
 *
 * POST
 * /api/teacher/by-user/:userId/classes/:classId/sessions
 */
app.post(
  "/api/teacher/by-user/:userId/classes/:classId/sessions",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(
        req,
        res
      );

      if (!params) return;

      const { userId, classId } = params;

      const {
        sessionNumber,
        title,
        sessionDate,
        startTime,
        endTime,
        sessionType = "class",
        description,
        status = "scheduled",
      } = req.body;

      const normalizedSessionNumber = Number(
        sessionNumber
      );

      const normalizedTitle =
        typeof title === "string"
          ? title.trim()
          : "";

      const normalizedDescription =
        typeof description === "string"
          ? description.trim() || null
          : null;

      const normalizedStartTime =
        normalizeTimeValue(startTime);

      const normalizedEndTime =
        normalizeTimeValue(endTime);

      if (
        !Number.isInteger(
          normalizedSessionNumber
        ) ||
        normalizedSessionNumber <= 0
      ) {
        return res.status(400).json({
          message:
            "O número da sessão deve ser um inteiro maior que zero.",
        });
      }

      if (!normalizedTitle) {
        return res.status(400).json({
          message:
            "O título da sessão é obrigatório.",
        });
      }

      if (normalizedTitle.length > 180) {
        return res.status(400).json({
          message:
            "O título da sessão deve possuir no máximo 180 caracteres.",
        });
      }

      if (!isValidDateString(sessionDate)) {
        return res.status(400).json({
          message:
            "A data da sessão é obrigatória e deve usar o formato YYYY-MM-DD.",
        });
      }

      if (
        !isValidTimeString(normalizedStartTime) ||
        !isValidTimeString(normalizedEndTime)
      ) {
        return res.status(400).json({
          message:
            "Os horários devem usar o formato HH:MM ou HH:MM:SS.",
        });
      }

      if (
        normalizedStartTime &&
        normalizedEndTime &&
        normalizedEndTime <=
          normalizedStartTime
      ) {
        return res.status(400).json({
          message:
            "O horário final deve ser posterior ao horário inicial.",
        });
      }

      if (
        !allowedClassSessionTypes.has(
          sessionType
        )
      ) {
        return res.status(400).json({
          message: "Tipo de sessão inválido.",
        });
      }

      if (
        !allowedClassSessionStatuses.has(
          status
        )
      ) {
        return res.status(400).json({
          message: "Status de sessão inválido.",
        });
      }

      const classData = await getTeacherClassByUserId(
              db.promise(),
              userId,
              classId
            );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada ao professor.",
        });
      }

      const [result] = await db.promise().query(
        `
          INSERT INTO class_sessions (
            class_id,
            session_number,
            title,
            session_date,
            start_time,
            end_time,
            session_type,
            description,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          classId,
          normalizedSessionNumber,
          normalizedTitle,
          sessionDate,
          normalizedStartTime,
          normalizedEndTime,
          sessionType,
          normalizedDescription,
          status,
        ]
      );

      const createdSession =
        await getTeacherSessionByUserId(
          userId,
          result.insertId
        );

      return res.status(201).json({
        message: "Sessão criada com sucesso.",

        session: mapClassSession(
          createdSession
        ),
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message:
            "Já existe uma sessão com esse número nesta turma.",

          code: error.code,
        });
      }

      console.error(
        "Erro ao criar sessão da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao criar a sessão.",

        error:
          error.sqlMessage || error.message,

        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — EDITAR SESSÃO
 * ============================================================
 *
 * PUT
 * /api/teacher/by-user/:userId/class-sessions/:sessionId
 */
app.put(
  "/api/teacher/by-user/:userId/class-sessions/:sessionId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateSessionId(req, res);

      if (!params) return;

      const { userId, sessionId } = params;

      const currentSession =
        await getTeacherSessionByUserId(
          userId,
          sessionId
        );

      if (!currentSession) {
        return res.status(404).json({
          message:
            "Sessão não encontrada ou não vinculada ao professor.",
        });
      }

      const {
        sessionNumber,
        title,
        sessionDate,
        startTime,
        endTime,
        sessionType,
        description,
        status,
      } = req.body;

      const normalizedSessionNumber = Number(
        sessionNumber
      );

      const normalizedTitle =
        typeof title === "string"
          ? title.trim()
          : "";

      const normalizedDescription =
        typeof description === "string"
          ? description.trim() || null
          : null;

      const normalizedStartTime =
        normalizeTimeValue(startTime);

      const normalizedEndTime =
        normalizeTimeValue(endTime);

      if (
        !Number.isInteger(
          normalizedSessionNumber
        ) ||
        normalizedSessionNumber <= 0
      ) {
        return res.status(400).json({
          message:
            "O número da sessão deve ser um inteiro maior que zero.",
        });
      }

      if (!normalizedTitle) {
        return res.status(400).json({
          message:
            "O título da sessão é obrigatório.",
        });
      }

      if (normalizedTitle.length > 180) {
        return res.status(400).json({
          message:
            "O título da sessão deve possuir no máximo 180 caracteres.",
        });
      }

      if (!isValidDateString(sessionDate)) {
        return res.status(400).json({
          message:
            "A data da sessão é obrigatória e deve usar o formato YYYY-MM-DD.",
        });
      }

      if (
        !isValidTimeString(normalizedStartTime) ||
        !isValidTimeString(normalizedEndTime)
      ) {
        return res.status(400).json({
          message:
            "Os horários devem usar o formato HH:MM ou HH:MM:SS.",
        });
      }

      if (
        normalizedStartTime &&
        normalizedEndTime &&
        normalizedEndTime <=
          normalizedStartTime
      ) {
        return res.status(400).json({
          message:
            "O horário final deve ser posterior ao horário inicial.",
        });
      }

      if (
        !allowedClassSessionTypes.has(
          sessionType
        )
      ) {
        return res.status(400).json({
          message: "Tipo de sessão inválido.",
        });
      }

      if (
        !allowedClassSessionStatuses.has(
          status
        )
      ) {
        return res.status(400).json({
          message: "Status de sessão inválido.",
        });
      }

      await db.promise().query(
        `
          UPDATE class_sessions
          SET
            session_number = ?,
            title = ?,
            session_date = ?,
            start_time = ?,
            end_time = ?,
            session_type = ?,
            description = ?,
            status = ?

          WHERE id = ?
        `,
        [
          normalizedSessionNumber,
          normalizedTitle,
          sessionDate,
          normalizedStartTime,
          normalizedEndTime,
          sessionType,
          normalizedDescription,
          status,
          sessionId,
        ]
      );

      const updatedSession =
        await getTeacherSessionByUserId(
          userId,
          sessionId
        );

      return res.status(200).json({
        message:
          "Sessão atualizada com sucesso.",

        session: mapClassSession(
          updatedSession
        ),
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message:
            "Já existe uma sessão com esse número nesta turma.",

          code: error.code,
        });
      }

      console.error(
        "Erro ao atualizar sessão da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao atualizar a sessão.",

        error:
          error.sqlMessage || error.message,

        code: error.code || null,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — CANCELAR SESSÃO
 * ============================================================
 *
 * DELETE
 * /api/teacher/by-user/:userId/class-sessions/:sessionId
 *
 * Não remove a sessão fisicamente.
 * Apenas altera o status para cancelled.
 */
app.delete(
  "/api/teacher/by-user/:userId/class-sessions/:sessionId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const params = validateSessionId(req, res);

      if (!params) return;

      const { userId, sessionId } = params;

      const session =
        await getTeacherSessionByUserId(
          userId,
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          message:
            "Sessão não encontrada ou não vinculada ao professor.",
        });
      }

      if (session.status === "cancelled") {
        return res.status(200).json({
          message:
            "A sessão já estava cancelada.",

          session: mapClassSession(session),
        });
      }

      await pool.query(
        `
          UPDATE class_sessions
          SET
            status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP

          WHERE id = ?
        `,
        [sessionId]
      );

      const cancelledSession =
        await getTeacherSessionByUserId(
          userId,
          sessionId
        );

      return res.status(200).json({
        message:
          "Sessão cancelada com sucesso.",

        session: mapClassSession(
          cancelledSession
        ),
      });
    } catch (error) {
      console.error(
        "Erro ao cancelar sessão da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao cancelar a sessão.",

        error:
          error.sqlMessage || error.message,

        code: error.code || null,
      });
    }
  }
);

// ======================================================
// LEGACY — FREQUÊNCIA BASEADA EM DATA
// Mantido temporariamente durante migração para sessões.
// Novas rotas usam class_sessions e sessionId.
// ======================================================
/*
 * ============================================================
 * PROFESSOR — CONSULTA DE FREQUÊNCIA DE UMA TURMA
 * ============================================================
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId/attendance",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    const promiseDb = db.promise();

    try {
      // Identidade sempre vem do token — nunca da URL.
      const userId = req.auth.userId;
      const classId = Number(req.params.classId);

      const attendanceDate =
        typeof req.query.date === "string"
          ? req.query.date.trim()
          : "";

      if (
        !Number.isInteger(classId) ||
        classId <= 0
      ) {
        return res.status(400).json({
          message: "ID da turma inválido.",
        });
      }

      if (
        !attendanceDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
          attendanceDate
        )
      ) {
        return res.status(400).json({
          message:
            "A data da frequência é obrigatória e deve estar no formato YYYY-MM-DD.",
        });
      }

      const [teacherRows] =
        await promiseDb.query(
          `
            SELECT id

            FROM teachers

            WHERE user_id = ?

            LIMIT 1
          `,
          [userId]
        );

      if (teacherRows.length === 0) {
        return res.status(404).json({
          message:
            "Professor não encontrado.",
        });
      }

      const teacherId =
        teacherRows[0].id;

      const [classRows] =
        await promiseDb.query(
          `
            SELECT
              cl.id,
              cl.name,
              cl.shift,
              cl.course_id,
              cl.start_date,
              cl.end_date,
              cl.status,

              c.name AS course_name

            FROM classes cl

            INNER JOIN courses c
              ON c.id = cl.course_id

            WHERE cl.id = ?
              AND cl.teacher_id = ?

            LIMIT 1
          `,
          [classId, teacherId]
        );

      if (classRows.length === 0) {
        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada a este professor.",
        });
      }

      const classData =
        classRows[0];

      /*
       * Localiza a sessão da turma na data informada.
       */
      const [sessionRows] =
        await promiseDb.query(
          `
            SELECT
              cs.id,
              cs.session_number,
              cs.title,
              cs.session_date,
              cs.start_time,
              cs.end_time,
              cs.session_type,
              cs.description,
              cs.status

            FROM class_sessions cs

            WHERE cs.class_id = ?
              AND cs.session_date = ?
              AND cs.status <> 'cancelled'

            ORDER BY
              cs.start_time ASC,
              cs.session_number ASC

            LIMIT 1
          `,
          [classId, attendanceDate]
        );

      /*
       * Pode existir uma data ainda sem sessão cadastrada.
       * Nesse caso, os alunos continuam sendo retornados,
       * mas sem registros de frequência salvos.
       */
      const session =
        sessionRows[0] || null;

      const classSessionId =
        session?.id || null;

      const [studentRows] =
        await promiseDb.query(
          `
            SELECT
              s.id AS student_id,
              u.name AS student_name,
              u.email,
              s.registration_number,

              a.id AS attendance_id,
              a.class_session_id,
              a.notes,

              COALESCE(
                a.status,
                'present'
              ) AS attendance_status,

              CASE
                WHEN a.id IS NULL THEN 0
                ELSE 1
              END AS is_saved

            FROM enrollments e

            INNER JOIN students s
              ON s.id = e.student_id

            INNER JOIN users u
              ON u.id = s.user_id

            LEFT JOIN attendance a
              ON a.student_id = s.id
             AND a.class_session_id = ?

            WHERE e.class_id = ?
              AND e.status = 'active'
              AND s.status = 'active'

            ORDER BY u.name ASC
          `,
          [
            classSessionId,
            classId,
          ]
        );

      const summary =
        studentRows.reduce(
          (accumulator, student) => {
            accumulator.total += 1;

            const status =
              student.attendance_status;

            if (
              Object.prototype.hasOwnProperty.call(
                accumulator,
                status
              )
            ) {
              accumulator[status] += 1;
            }

            if (student.is_saved) {
              accumulator.saved += 1;
            } else {
              accumulator.unsaved += 1;
            }

            return accumulator;
          },
          {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            saved: 0,
            unsaved: 0,
          }
        );

      return res.status(200).json({
        class: {
          id: classData.id,
          name: classData.name,
          shift: classData.shift,

          courseId:
            classData.course_id,

          courseName:
            classData.course_name,

          startDate:
            classData.start_date,

          endDate:
            classData.end_date,

          status:
            classData.status,
        },

        attendanceDate,

        session: session
          ? {
              id: session.id,

              sessionNumber:
                session.session_number,

              title: session.title,

              sessionDate:
                session.session_date,

              startTime:
                session.start_time,

              endTime:
                session.end_time,

              sessionType:
                session.session_type,

              description:
                session.description,

              status:
                session.status,
            }
          : null,

        students: studentRows.map(
          (student) => ({
            studentId:
              student.student_id,

            name:
              student.student_name,

            email:
              student.email,

            registrationNumber:
              student.registration_number,

            attendanceId:
              student.attendance_id,

            classSessionId:
              student.class_session_id,

            status:
              student.attendance_status,

            notes:
              student.notes ?? "",

            isSaved:
              Boolean(student.is_saved),
          })
        ),

        summary,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar frequência da turma:",
        {
          message: error.message,
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
          sql: error.sql,
        }
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar a frequência da turma.",

        error:
          error.sqlMessage ||
          error.message,

        code:
          error.code || null,
      });
    }
  }
);

//Helper para validar professor e turma

async function getTeacherClassByUserId(
  database,
  userId,
  classId
) {
  const [rows] = await database.execute(
    `
      SELECT
        c.id,
        c.name,
        c.shift,
        c.status,
        c.course_id,
        c.start_date,
        c.end_date,
        co.name AS course_name,
        t.id AS teacher_id
      FROM classes c
      INNER JOIN teachers t
        ON t.id = c.teacher_id
      LEFT JOIN courses co
        ON co.id = c.course_id
      WHERE c.id = ?
        AND t.user_id = ?
        AND c.status <> 'archived'
      LIMIT 1
    `,
    [classId, userId]
  );

  return rows[0] || null;
}

// ======================================================
// PROFESSOR - EDITAR ENCONTRO DA TURMA
//
// Atualiza os dados de um encontro existente,
// permitindo alterar informações como título,
// data, horário, tipo, descrição e status,
// após validar a permissão do professor.
// ======================================================

app.put(
  "/api/teacher/by-user/:userId/classes/:classId/sessions/:sessionId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    // Identidade sempre vem do token — nunca da URL.
    const userId = req.auth.userId;
    const classId = Number(req.params.classId);
    const sessionId = Number(
      req.params.sessionId
    );

    const {
      sessionNumber,
      title,
      description = "",
      sessionDate,
      startTime = null,
      endTime = null,
      sessionType = "class",
      status = "scheduled",
    } = req.body;

    const normalizedSessionNumber =
      Number(sessionNumber);

    const validSessionTypes = new Set([
      "class",
      "review",
      "exam",
      "presentation",
      "workshop",
      "lab",
      "recovery",
      "other",
    ]);

    const validStatuses = new Set([
      "scheduled",
      "completed",
      "cancelled",
    ]);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(classId) ||
      classId <= 0 ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return res.status(400).json({
        message:
          "Parâmetros inválidos.",
      });
    }

    if (
      !Number.isInteger(
        normalizedSessionNumber
      ) ||
      normalizedSessionNumber <= 0 ||
      !title?.trim() ||
      !sessionDate
    ) {
      return res.status(400).json({
        message:
          "Número, título e data são obrigatórios.",
      });
    }

    if (
      !validSessionTypes.has(sessionType) ||
      !validStatuses.has(status)
    ) {
      return res.status(400).json({
        message:
          "Tipo ou status do encontro inválido.",
      });
    }

    if (
      startTime &&
      endTime &&
      startTime >= endTime
    ) {
      return res.status(400).json({
        message:
          "O horário final deve ser posterior ao horário inicial.",
      });
    }

    const connection =
      await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const classData =
        await getTeacherClassByUserId(
          connection,
          userId,
          classId
        );

      if (!classData) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Turma não encontrada para este professor.",
        });
      }

      const [sessionRows] =
        await connection.execute(
          `
            SELECT id
            FROM class_sessions
            WHERE id = ?
              AND class_id = ?
              AND status <> 'archived'
            LIMIT 1
          `,
          [sessionId, classId]
        );

      if (sessionRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Encontro não encontrado.",
        });
      }

      const [duplicateRows] =
        await connection.execute(
          `
            SELECT id
            FROM class_sessions
            WHERE class_id = ?
              AND session_number = ?
              AND id <> ?
              AND status <> 'archived'
            LIMIT 1
          `,
          [
            classId,
            normalizedSessionNumber,
            sessionId,
          ]
        );

      if (duplicateRows.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Já existe outro encontro com esse número.",
        });
      }

      await connection.execute(
        `
          UPDATE class_sessions
          SET
            session_number = ?,
            title = ?,
            description = ?,
            session_date = ?,
            start_time = ?,
            end_time = ?,
            session_type = ?,
            status = ?
          WHERE id = ?
            AND class_id = ?
        `,
        [
          normalizedSessionNumber,
          title.trim(),
          String(description || "").trim(),
          sessionDate,
          startTime || null,
          endTime || null,
          sessionType,
          status,
          sessionId,
          classId,
        ]
      );

      const [updatedRows] =
        await connection.execute(
          `
            SELECT
              cs.id,
              cs.class_id AS classId,
              cs.session_number AS sessionNumber,
              cs.title,
              cs.description,
              cs.session_date AS sessionDate,
              cs.start_time AS startTime,
              cs.end_time AS endTime,
              cs.session_type AS sessionType,
              cs.status,
              cs.created_at AS createdAt,
              cs.updated_at AS updatedAt
            FROM class_sessions cs
            WHERE cs.id = ?
            LIMIT 1
          `,
          [sessionId]
        );

      await connection.commit();

      return res.json({
        message:
          "Encontro atualizado com sucesso.",
        session: updatedRows[0],
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        "Erro ao atualizar encontro:",
        error
      );

      return res.status(500).json({
        message:
          "Não foi possível atualizar o encontro.",
      });
    } finally {
      connection.release();
    }
  }
);

// ======================================================
// PROFESSOR - REMOVER ENCONTRO DA TURMA
//
// Realiza o arquivamento (soft delete) de um encontro,
// preservando a integridade dos registros acadêmicos.
// Apenas o professor responsável pela turma pode
// remover seus próprios encontros.
// ======================================================

app.delete(
  "/api/teacher/by-user/:userId/classes/:classId/sessions/:sessionId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    // Identidade sempre vem do token — nunca da URL.
    const userId = req.auth.userId;
    const classId = Number(req.params.classId);
    const sessionId = Number(
      req.params.sessionId
    );

    if (
      !Number.isInteger(classId) ||
      classId <= 0 ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return res.status(400).json({
        message:
          "Parâmetros inválidos.",
      });
    }

    try {
      const classData =
        await getTeacherClassByUserId(
          db.promise(),
          userId,
          classId
        );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada para este professor.",
        });
      }

      const [result] =
        await db.promise().execute(
          `
            UPDATE class_sessions
            SET status = 'archived'
            WHERE id = ?
              AND class_id = ?
              AND status <> 'archived'
          `,
          [sessionId, classId]
        );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Encontro não encontrado.",
        });
      }

      return res.json({
        message:
          "Encontro arquivado com sucesso.",
      });
    } catch (error) {
      console.error(
        "Erro ao arquivar encontro:",
        error
      );

      return res.status(500).json({
        message:
          "Não foi possível arquivar o encontro.",
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR - CARREGAR FREQUÊNCIA DE UM ENCONTRO DA TURMA
 * ============================================================
 *
 * Retorna todos os alunos ativos matriculados na turma,
 * juntamente com os registros de frequência do encontro
 * selecionado (quando já existirem).
 *
 * Caso ainda não exista frequência registrada para o
 * encontro, os alunos são retornados com status padrão
 * "present", permitindo que o professor realize a chamada.
 */
app.get(
  "/api/teacher/by-user/:userId/classes/:classId/sessions/:sessionId/attendance",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    // Identidade sempre vem do token — nunca da URL.
    const userId = req.auth.userId;
    const classId = Number(req.params.classId);
    const sessionId = Number(
      req.params.sessionId
    );

    if (
      !Number.isInteger(classId) ||
      classId <= 0 ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return res.status(400).json({
        message:
          "Parâmetros inválidos.",
      });
    }

    try {
      const classData =
        await getTeacherClassByUserId(
          db.promise(),
          userId,
          classId
        );

      if (!classData) {
        return res.status(404).json({
          message:
            "Turma não encontrada para este professor.",
        });
      }

      const [sessionRows] =
        await db.promise().execute(
          `
            SELECT
              cs.id,
              cs.class_id AS classId,
              cs.session_number AS sessionNumber,
              cs.title,
              cs.description,
              cs.session_date AS sessionDate,
              cs.start_time AS startTime,
              cs.end_time AS endTime,
              cs.session_type AS sessionType,
              cs.status
            FROM class_sessions cs
            WHERE cs.id = ?
              AND cs.class_id = ?
              AND cs.status <> 'archived'
            LIMIT 1
          `,
          [sessionId, classId]
        );

      if (sessionRows.length === 0) {
        return res.status(404).json({
          message:
            "Encontro não encontrado para esta turma.",
        });
      }

      const [students] =
        await db.promise().execute(
          `
            SELECT
              s.id AS studentId,
              u.name,
              u.email,
              s.registration_number AS registrationNumber,

              a.id AS attendanceId,

              COALESCE(
                a.status,
                'present'
              ) AS status,

              COALESCE(
                a.notes,
                ''
              ) AS notes,

              CASE
                WHEN a.id IS NULL THEN 0
                ELSE 1
              END AS isSaved

            FROM enrollments e

            INNER JOIN students s
              ON s.id = e.student_id

            INNER JOIN users u
              ON u.id = s.user_id

            LEFT JOIN attendance a
              ON a.student_id = s.id
              AND a.class_session_id = ?

            WHERE e.class_id = ?
              AND e.status = 'active'
              AND u.status = 'active'

            ORDER BY u.name ASC
          `,
          [sessionId, classId]
        );
      return res.json({
        class: classData,
        session: sessionRows[0],
        students,
      });
    } catch (error) {
      console.error(
        "Erro ao carregar frequência:",
        error
      );

      return res.status(500).json({
        message:
          "Não foi possível carregar a frequência deste encontro.",
      });
    }
  }
);



/*
 * ============================================================
 * PROFESSOR — REGISTRO DE FREQUÊNCIA DE UMA TURMA
 * ============================================================
 */
app.post(
  "/api/teacher/by-user/:userId/classes/:classId/sessions/:sessionId/attendance",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    // Identidade sempre vem do token — nunca da URL.
    const userId = req.auth.userId;

    const classId = Number(
      req.params.classId
    );

    const sessionId = Number(
      req.params.sessionId
    );

    const { records } = req.body;

    if (
      !Number.isInteger(classId) ||
      classId <= 0
    ) {
      return res.status(400).json({
        message:
          "ID da turma inválido.",
      });
    }

    if (
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return res.status(400).json({
        message:
          "ID do encontro inválido.",
      });
    }

    if (
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return res.status(400).json({
        message:
          "Envie pelo menos um registro de frequência.",
      });
    }

    const allowedStatuses =
      new Set([
        "present",
        "absent",
        "late",
        "excused",
      ]);

    const normalizedRecords =
      records.map((record) => ({
        studentId: Number(
          record.studentId
        ),

        status: record.status,

        notes:
          typeof record.notes ===
          "string"
            ? record.notes.trim() ||
              null
            : null,
      }));

    const invalidRecord =
      normalizedRecords.find(
        (record) =>
          !Number.isInteger(
            record.studentId
          ) ||
          record.studentId <= 0 ||
          !allowedStatuses.has(
            record.status
          ) ||
          (
            record.notes !== null &&
            record.notes.length > 500
          )
      );

    if (invalidRecord) {
      return res.status(400).json({
        message:
          "Existe um registro com aluno, status ou observação inválida. As observações podem ter até 500 caracteres.",
      });
    }

    const studentIds =
      normalizedRecords.map(
        (record) => record.studentId
      );

    const uniqueStudentIds = [
      ...new Set(studentIds),
    ];

    if (
      uniqueStudentIds.length !==
      studentIds.length
    ) {
      return res.status(400).json({
        message:
          "A requisição possui registros duplicados para o mesmo aluno.",
      });
    }

    let connection;
    let transactionStarted = false;

    try {
      connection =
        await db
          .promise()
          .getConnection();

      await connection.beginTransaction();

      transactionStarted = true;

      /*
       * Confirma que a turma pertence
       * ao professor autenticado.
       */
      const classData =
        await getTeacherClassByUserId(
          connection,
          userId,
          classId
        );

      if (!classData) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(404).json({
          message:
            "Turma não encontrada ou não vinculada a este professor.",
        });
      }

      /*
       * Carrega o encontro e calcula
       * se a chamada já foi liberada.
       *
       * Se start_time for NULL,
       * a chamada é liberada às 00:00
       * da data do encontro.
       */
      const [sessionRows] =
        await connection.execute(
          `
            SELECT
              cs.id,
              cs.class_id AS classId,
              cs.session_number AS sessionNumber,
              cs.title,
              cs.session_date AS sessionDate,
              cs.start_time AS startTime,
              cs.end_time AS endTime,
              cs.session_type AS sessionType,
              cs.status,

              cs.session_date AS attendanceOpensAt,

              CASE
                WHEN CURDATE() >= cs.session_date
                THEN 1
                ELSE 0
              END AS canRegisterAttendance

            FROM class_sessions cs

            WHERE cs.id = ?
              AND cs.class_id = ?

            LIMIT 1

            FOR UPDATE
          `,
          [sessionId, classId]
        );

      if (sessionRows.length === 0) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(404).json({
          message:
            "Encontro não encontrado para esta turma.",
        });
      }

      const classSession =
        sessionRows[0];

      if (
        classSession.status ===
          "cancelled" ||
        classSession.status ===
          "archived"
      ) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          message:
            "Não é possível registrar frequência em um encontro cancelado ou arquivado.",
        });
      }

      if (
        Number(
          classSession
            .canRegisterAttendance
        ) !== 1
      ) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(403).json({
          message:
            "A chamada só será liberada a partir da data e do horário de início do encontro.",

          attendanceOpensAt:
            classSession
              .attendanceOpensAt,
        });
      }

      /*
       * Confirma que todos os alunos
       * possuem matrícula ativa.
       */
      const placeholders =
        uniqueStudentIds
          .map(() => "?")
          .join(", ");

      const [enrolledRows] =
        await connection.execute(
          `
            SELECT DISTINCT
              e.student_id AS studentId

            FROM enrollments e

            INNER JOIN students s
              ON s.id = e.student_id

            INNER JOIN users u
              ON u.id = s.user_id

            WHERE e.class_id = ?
              AND e.status = 'active'
              AND u.status = 'active'
              AND e.student_id IN (
                ${placeholders}
              )
          `,
          [
            classId,
            ...uniqueStudentIds,
          ]
        );

      const enrolledStudentIds =
        new Set(
          enrolledRows.map((row) =>
            Number(row.studentId)
          )
        );

      const invalidStudentIds =
        uniqueStudentIds.filter(
          (studentId) =>
            !enrolledStudentIds.has(
              studentId
            )
        );

      if (
        invalidStudentIds.length > 0
      ) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          message:
            "Um ou mais alunos não possuem matrícula ativa nesta turma.",

          invalidStudentIds,
        });
      }

      /*
       * Cria ou atualiza a frequência.
       *
       * A tabela real é attendance.
       * A FK real é class_session_id.
       */
      const valuesPlaceholders =
        normalizedRecords
          .map(() => "(?, ?, ?, ?)")
          .join(", ");

      const insertValues =
        normalizedRecords.flatMap(
          (record) => [
            sessionId,
            record.studentId,
            record.status,
            record.notes,
          ]
        );

      const [saveResult] =
        await connection.execute(
          `
            INSERT INTO attendance (
              class_session_id,
              student_id,
              status,
              notes
            )

            VALUES ${valuesPlaceholders}

            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              notes = VALUES(notes),
              updated_at =
                CURRENT_TIMESTAMP
          `,
          insertValues
        );

      await connection.commit();
      transactionStarted = false;

      const summary =
        normalizedRecords.reduce(
          (accumulator, record) => {
            accumulator.total += 1;

            accumulator[
              record.status
            ] += 1;

            return accumulator;
          },
          {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          }
        );

      return res.status(200).json({
        message:
          "Frequência salva com sucesso.",

        classId,

        session: {
          id: classSession.id,

          sessionNumber:
            classSession.sessionNumber,

          title:
            classSession.title,

          sessionDate:
            classSession.sessionDate,

          startTime:
            classSession.startTime,

          endTime:
            classSession.endTime,

          sessionType:
            classSession.sessionType,

          status:
            classSession.status,
        },

        savedRecords:
          normalizedRecords.length,

        affectedRows:
          saveResult.affectedRows,

        summary,
      });
    } catch (error) {
      if (
        connection &&
        transactionStarted
      ) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            "Erro no rollback:",
            rollbackError
          );
        }
      }


      return res.status(500).json({
        message:
          error.sqlMessage ||
          error.message ||
          "Não foi possível salvar a frequência deste encontro.",

        code:
          error.code || null,
      });
    } finally {
      if (connection) {
        connection.release();
      }
  }
});




/* ==========================================================
   SUBMISSÕES, CORREÇÃO E NOTAS

   Migradas para backend/routes/teacherActivityRoutes.js,
   backend/routes/studentActivityRoutes.js e
   backend/services/activities/activitySubmissionService.js,
   backend/services/activities/activityGradingService.js:
   - GET /api/teacher/by-user/:userId/activities/:activityId/submissions
   - GET /api/teacher/by-user/:userId/submissions/:submissionId/full
   - PUT /api/teacher/by-user/:userId/submissions/:submissionId/grade
   - GET /api/students/by-user/:userId/grades
   ========================================================== */


/* ==========================================================
   FIM DA PARTE 5
   A próxima seção contém as consultas administrativas
   de alunos, professores e cursos.
   ========================================================== */

   /* ==========================================================
   ADMINISTRAÇÃO — CONSULTAS
   Alunos, professores e cursos
   ========================================================== */


/* ==========================================================
   ADMINISTRAÇÃO — CONSULTA DE ALUNOS
   ========================================================== */

/**
 * GET /api/admin/students
 * Lista todos os alunos cadastrados.
 *
 * Também retorna:
 * - quantidade de matrículas;
 * - nomes dos cursos associados ao aluno.
 */
app.get(
  "/api/admin/students",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      /*
       * students contém os dados acadêmicos.
       * users contém os dados pessoais e de autenticação.
       *
       * LEFT JOIN em enrollments mantém alunos sem matrícula.
       */
      const [students] = await db.promise().query(
        `
          SELECT
            s.id,
            s.user_id,
            s.registration_number,
            s.birth_date,
            s.cpf,
            s.phone,
            s.address,
            s.status,

            u.name,
            u.email,
            u.gender,
            u.status AS user_status,

            COUNT(DISTINCT e.id) AS total_enrollments,

            GROUP_CONCAT(
              DISTINCT c.name
              ORDER BY c.name ASC
              SEPARATOR ', '
            ) AS courses

          FROM students s

          INNER JOIN users u
            ON u.id = s.user_id

          LEFT JOIN enrollments e
            ON e.student_id = s.id

          LEFT JOIN courses c
            ON c.id = e.course_id

          GROUP BY
            s.id,
            s.user_id,
            s.registration_number,
            s.birth_date,
            s.cpf,
            s.phone,
            s.address,
            s.status,

            u.name,
            u.email,
            u.gender,
            u.status

          ORDER BY u.name ASC
        `
      );

      return res.status(200).json(
        students.map((student) => ({
          ...student,
          total_enrollments: Number(
            student.total_enrollments || 0
          ),
        }))
      );
    } catch (error) {
      console.error(
        "Erro ao buscar alunos administrativos:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar alunos.",
        error: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
      });
    }
  }
);


/**
 * GET /api/admin/students/:id
 * Busca os dados completos de um aluno pelo ID.
 *
 * Os dados acadêmicos vêm de students e os dados
 * de autenticação vêm de users.
 */
app.get("/api/admin/students/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedStudentId = Number(id);

    /*
     * Valida o ID recebido pela URL.
     */
    if (
      !Number.isInteger(normalizedStudentId) ||
      normalizedStudentId <= 0
    ) {
      return res.status(400).json({
        message: "ID do aluno inválido.",
      });
    }

    /*
     * Busca os dados do aluno e do usuário associado.
     */
    const [studentRows] = await db.promise().query(
      `
        SELECT
          s.id,
          s.user_id,
          s.registration_number,
          s.birth_date,
          s.cpf,
          s.phone,
          s.address,
          s.status AS student_status,

          u.name,
          u.email,
          u.gender,
          u.status AS user_status

        FROM students s

        INNER JOIN users u
          ON u.id = s.user_id

        WHERE s.id = ?

        LIMIT 1
      `,
      [normalizedStudentId]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({
        message: "Aluno não encontrado.",
      });
    }

    /*
     * Mantém status como propriedade principal para
     * compatibilidade com formulários administrativos.
     *
     * student_status e user_status também permanecem
     * disponíveis para diagnóstico.
     */
    const student = {
      ...studentRows[0],
      status: studentRows[0].student_status,
    };

    return res.status(200).json(student);
  } catch (error) {
    console.error(
      "Erro ao buscar aluno administrativo:",
      error
    );

    return res.status(500).json({
      message: "Erro ao buscar aluno.",
      error: error.message,
    });
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — CONSULTA DE PROFESSORES
   ========================================================== */

/**
 * GET /api/admin/teachers
 * Lista todos os professores cadastrados.
 *
 * Também retorna:
 * - cursos associados;
 * - quantidade de cursos;
 * - status do professor.
 *
 * Esta rota pode ser usada tanto na tabela administrativa
 * quanto na seleção de professores dos formulários.
 */
app.get(
  "/api/admin/teachers",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      /*
       * teachers contém os dados profissionais.
       * users contém os dados pessoais e de autenticação.
       *
       * LEFT JOIN em courses mantém professores
       * que ainda não possuem cursos vinculados.
       */
      const [teachers] = await db.promise().query(
        `
          SELECT
            t.id,
            t.user_id,
            t.registration_number,
            t.cpf,
            t.phone,
            t.status,
            t.specialty,

            u.name,
            u.email,
            u.gender,
            u.status AS user_status,

            GROUP_CONCAT(
              DISTINCT c.name
              ORDER BY c.name ASC
              SEPARATOR ', '
            ) AS course_names,

            COUNT(DISTINCT c.id) AS total_courses

          FROM teachers t

          INNER JOIN users u
            ON u.id = t.user_id

          LEFT JOIN courses c
            ON c.teacher_id = t.id

          GROUP BY
            t.id,
            t.user_id,
            t.registration_number,
            t.cpf,
            t.phone,
            t.status,
            t.specialty,

            u.name,
            u.email,
            u.gender,
            u.status

          ORDER BY u.name ASC
        `
      );

      return res.status(200).json(
        teachers.map((teacher) => ({
          ...teacher,
          total_courses: Number(
            teacher.total_courses || 0
          ),
        }))
      );
    } catch (error) {
      console.error(
        "Erro ao buscar professores administrativos:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar professores.",
        error: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
      });
    }
  }
);


/* ==========================================================
   ADMINISTRAÇÃO — CONSULTA DE CURSOS
   ========================================================== */

/**
 * GET /api/admin/courses
 * Lista todos os cursos cadastrados.
 *
 * Também retorna:
 * - professor responsável;
 * - quantidade de alunos;
 * - quantidade de conteúdos.
 */
app.get("/api/admin/courses", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    /*
     * Busca os cursos com métricas resumidas.
     *
     * COUNT DISTINCT evita que os JOINs multipliquem
     * artificialmente o número de alunos ou conteúdos.
     */
    const [courses] = await db.promise().query(
      `
        SELECT
          c.id,
          c.name,
          c.category,
          c.nivel,
          c.status,
          c.workload_hours,
          c.price,

          t.name AS teacher_name,

          COUNT(
            DISTINCT e.student_id
          ) AS total_students,

          COUNT(
            DISTINCT cc.id
          ) AS total_contents

        FROM courses c

        LEFT JOIN teachers t
          ON t.id = c.teacher_id

        LEFT JOIN enrollments e
          ON e.course_id = c.id

        LEFT JOIN course_contents cc
          ON cc.course_id = c.id

        GROUP BY
          c.id,
          c.name,
          c.category,
          c.nivel,
          c.status,
          c.workload_hours,
          c.price,
          t.name

        ORDER BY c.name ASC
      `
    );

    return res.status(200).json(courses);
  } catch (error) {
    console.error(
      "Erro ao buscar cursos administrativos:",
      error
    );

    return res.status(500).json({
      message: "Erro ao buscar cursos.",
      error: error.message,
    });
  }
});


/**
 * GET /api/admin/courses/:id
 * Busca os dados completos de um curso pelo ID.
 */
app.get("/api/admin/courses/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedCourseId = Number(id);

    /*
     * Valida o ID recebido pela URL.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0
    ) {
      return res.status(400).json({
        message: "ID do curso inválido.",
      });
    }

    /*
     * Busca todos os campos utilizados pelo formulário
     * administrativo de edição de cursos.
     */
    const [courseRows] = await db.promise().query(
      `
        SELECT
          c.id,
          c.name,
          c.description,
          c.workload_hours,
          c.price,
          c.status,
          c.teacher_id,
          c.image_url,
          c.nivel,
          c.expanded_description,
          c.syllabus,
          c.category,

          t.name AS teacher_name

        FROM courses c

        LEFT JOIN teachers t
          ON t.id = c.teacher_id

        WHERE c.id = ?

        LIMIT 1
      `,
      [normalizedCourseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        message: "Curso não encontrado.",
      });
    }

    return res.status(200).json(courseRows[0]);
  } catch (error) {
    console.error(
      "Erro ao buscar curso administrativo:",
      error
    );

    return res.status(500).json({
      message: "Erro ao buscar os dados do curso.",
      error: error.message,
    });
  }
});

   /* ==========================================================
   ADMINISTRAÇÃO — ROTAS FINANCEIRO
   Alterações e registros em pagamentos, cobranças e datas de 
   de vencimento.
   ========================================================== */
app.use("/api/admin/financial", adminFinancialRoutes);
app.use("/api", studentContentRoutes);
app.use("/api", teacherContentRoutes);
app.use("/api", studentActivityRoutes);
app.use("/api", teacherActivityRoutes);


/* ==========================================================
   FIM DA PARTE 6
   A próxima seção contém os cadastros administrativos
   de alunos, professores e cursos.
   ========================================================== */

   /* ==========================================================
   ADMINISTRAÇÃO — CADASTROS
   Alunos, professores e cursos
   ========================================================== */


/* ==========================================================
   ADMINISTRAÇÃO — CADASTRO DE ALUNOS
   ========================================================== */

/**
 * POST /api/admin/students
 * Cadastra um novo aluno.
 *
 * A operação cria:
 * - um usuário para autenticação;
 * - um perfil acadêmico na tabela students.
 */
app.post("/api/admin/students", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const {
      name,
      email,
      password,
      gender,
      birth_date,
      cpf,
      phone,
      address,
      status,
    } = req.body;

    /*
     * Valida os campos principais antes de abrir
     * uma conexão e iniciar a transação.
     */
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message:
          "Nome, e-mail e senha são obrigatórios.",
      });
    }

    /*
     * Valida os dados acadêmicos obrigatórios.
     */
    if (!birth_date || !cpf?.trim()) {
      return res.status(400).json({
        message:
          "Data de nascimento e CPF são obrigatórios.",
      });
    }

    /*
     * Normaliza o status acadêmico do aluno.
     */
    const normalizedStudentStatus =
      status || "active";

    const allowedStudentStatuses = [
      "active",
      "inactive",
      "cancelled",
    ];

    if (
      !allowedStudentStatuses.includes(
        normalizedStudentStatus
      )
    ) {
      return res.status(400).json({
        message: "Status do aluno inválido.",
      });
    }

    /*
     * O status do usuário de autenticação possui
     * apenas active ou inactive.
     */
    const normalizedUserStatus =
      normalizedStudentStatus === "active"
        ? "active"
        : "inactive";

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Confirma que o e-mail ainda não está cadastrado.
     */
    const [existingUserRows] = await connection.query(
      `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email.trim()]
    );

    if (existingUserRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "Este e-mail já está cadastrado.",
      });
    }

    /*
     * Gera o hash seguro da senha.
     */
    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    /*
     * Cria o usuário responsável pelo login.
     */
    const [userResult] = await connection.query(
      `
        INSERT INTO users
        (
          name,
          email,
          password_hash,
          gender,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'student', ?, NOW(), NOW())
      `,
      [
        name.trim(),
        email.trim(),
        passwordHash,
        gender || null,
        normalizedUserStatus,
      ]
    );

    const userId = userResult.insertId;

    /*
     * Gera a matrícula do aluno.
     */
    const registrationNumber =
      `STU${String(userId).padStart(5, "0")}`;

    /*
     * Cria o perfil acadêmico.
     */
    const [studentResult] = await connection.query(
      `
        INSERT INTO students
        (
          user_id,
          name,
          email,
          gender,
          registration_number,
          birth_date,
          cpf,
          phone,
          address,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        userId,
        name.trim(),
        email.trim(),
        gender || null,
        registrationNumber,
        birth_date,
        cpf.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        normalizedStudentStatus,
      ]
    );

    /*
     * Confirma a criação do usuário e do aluno.
     */
    await connection.commit();

    return res.status(201).json({
      message: "Aluno cadastrado com sucesso.",

      student: {
        id: studentResult.insertId,
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        registration_number: registrationNumber,
        status: normalizedStudentStatus,
      },
    });
  } catch (error) {
    /*
     * Desfaz a operação caso qualquer etapa falhe.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro completo ao cadastrar aluno:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Já existe um cadastro utilizando estes dados.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao cadastrar aluno.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — CADASTRO DE PROFESSORES
   ========================================================== */

/**
 * POST /api/admin/teachers
 * Cadastra um novo professor.
 *
 * A operação cria:
 * - um usuário para autenticação;
 * - um perfil profissional na tabela teachers.
 */
app.post("/api/admin/teachers", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const {
      name,
      email,
      password,
      gender,
      cpf,
      phone,
      specialty,
      status,
    } = req.body;

    /*
     * Valida os campos essenciais.
     */
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message:
          "Nome, e-mail e senha são obrigatórios.",
      });
    }

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "active";

    const allowedStatuses = [
      "active",
      "inactive",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status do professor inválido.",
      });
    }

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Confirma que o e-mail não está em uso.
     */
    const [existingUserRows] = await connection.query(
      `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email.trim()]
    );

    if (existingUserRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "Este e-mail já está cadastrado.",
      });
    }

    /*
     * Gera o hash seguro da senha.
     */
    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    /*
     * Cria o usuário responsável pelo login.
     */
    const [userResult] = await connection.query(
      `
        INSERT INTO users
        (
          name,
          email,
          password_hash,
          gender,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'teacher', ?, NOW(), NOW())
      `,
      [
        name.trim(),
        email.trim(),
        passwordHash,
        gender || null,
        normalizedStatus,
      ]
    );

    const userId = userResult.insertId;

    /*
     * Gera a matrícula profissional.
     */
    const registrationNumber =
      `PROF${String(userId).padStart(5, "0")}`;

    /*
     * Cria o perfil do professor.
     */
    const [teacherResult] = await connection.query(
      `
        INSERT INTO teachers
        (
          user_id,
          name,
          email,
          gender,
          registration_number,
          cpf,
          phone,
          specialty,
          status,
          created_at,
          updated_at
        )
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

    /*
     * Confirma a criação do usuário e do professor.
     */
    await connection.commit();

    return res.status(201).json({
      message: "Professor cadastrado com sucesso.",

      teacher: {
        id: teacherResult.insertId,
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        registration_number: registrationNumber,
        status: normalizedStatus,
      },
    });
  } catch (error) {
    /*
     * Desfaz a transação caso qualquer etapa falhe.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro completo ao cadastrar professor:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Já existe um cadastro utilizando estes dados.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao cadastrar professor.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — CADASTRO DE CURSOS
   ========================================================== */

/**
 * POST /api/admin/courses
 * Cadastra um novo curso.
 */
app.post("/api/admin/courses", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const {
      name,
      description,
      workload_hours,
      price,
      status,
      teacher_id,
      image_url,
      nivel,
      expanded_description,
      syllabus,
      category,
    } = req.body;

    /*
     * Valida o nome do curso.
     */
    if (!name?.trim()) {
      return res.status(400).json({
        message: "O nome do curso é obrigatório.",
      });
    }

    /*
     * Normaliza o ID do professor.
     *
     * Um curso pode inicialmente ser criado sem
     * professor responsável.
     */
    const normalizedTeacherId =
      teacher_id !== null &&
      teacher_id !== undefined &&
      teacher_id !== ""
        ? Number(teacher_id)
        : null;

    if (
      normalizedTeacherId !== null &&
      (
        !Number.isInteger(normalizedTeacherId) ||
        normalizedTeacherId <= 0
      )
    ) {
      return res.status(400).json({
        message: "ID do professor inválido.",
      });
    }

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "draft";

    const allowedStatuses = [
      "active",
      "inactive",
      "draft",
      "archived",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status do curso inválido.",
      });
    }

    /*
     * Confirma que o professor existe quando
     * teacher_id foi informado.
     */
    if (normalizedTeacherId !== null) {
      const [teacherRows] = await db.promise().query(
        `
          SELECT id
          FROM teachers
          WHERE id = ?
          LIMIT 1
        `,
        [normalizedTeacherId]
      );

      if (teacherRows.length === 0) {
        return res.status(404).json({
          message: "Professor não encontrado.",
        });
      }
    }

    /*
     * Normaliza os campos numéricos.
     */
    const normalizedWorkloadHours =
      workload_hours !== null &&
      workload_hours !== undefined &&
      workload_hours !== ""
        ? Number(workload_hours)
        : null;

    const normalizedPrice =
      price !== null &&
      price !== undefined &&
      price !== ""
        ? Number(price)
        : null;

    if (
      normalizedWorkloadHours !== null &&
      (
        Number.isNaN(normalizedWorkloadHours) ||
        normalizedWorkloadHours < 0
      )
    ) {
      return res.status(400).json({
        message: "Carga horária inválida.",
      });
    }

    if (
      normalizedPrice !== null &&
      (
        Number.isNaN(normalizedPrice) ||
        normalizedPrice < 0
      )
    ) {
      return res.status(400).json({
        message: "Preço inválido.",
      });
    }

    /*
     * Cria o curso.
     */
    const [result] = await db.promise().query(
      `
        INSERT INTO courses
        (
          name,
          description,
          workload_hours,
          price,
          status,
          teacher_id,
          image_url,
          nivel,
          expanded_description,
          syllabus,
          category,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        description?.trim() || null,
        normalizedWorkloadHours,
        normalizedPrice,
        normalizedStatus,
        normalizedTeacherId,
        image_url?.trim() || null,
        nivel?.trim() || "Iniciante",
        expanded_description?.trim() || null,
        syllabus?.trim() || null,
        category?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Curso criado com sucesso.",

      course: {
        id: result.insertId,
        name: name.trim(),
        description: description?.trim() || null,
        workload_hours: normalizedWorkloadHours,
        price: normalizedPrice,
        status: normalizedStatus,
        teacher_id: normalizedTeacherId,
        image_url: image_url?.trim() || null,
        nivel: nivel?.trim() || "Iniciante",
        expanded_description:
          expanded_description?.trim() || null,
        syllabus: syllabus?.trim() || null,
        category: category?.trim() || null,
      },
    });
  } catch (error) {
    console.error(
      "Erro completo ao criar curso:",
      error
    );

    return res.status(500).json({
      message: "Erro ao criar curso.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});


/* ==========================================================
   FIM DA PARTE 7
   A próxima seção contém as atualizações administrativas
   de alunos, professores e cursos.
   ========================================================== */

   /* ==========================================================
   ADMINISTRAÇÃO — ATUALIZAÇÕES
   Alunos, professores e cursos
   ========================================================== */


/* ==========================================================
   ADMINISTRAÇÃO — ATUALIZAÇÃO DE ALUNOS
   ========================================================== */

/**
 * PUT /api/admin/students/:id
 * Atualiza os dados acadêmicos e de autenticação de um aluno.
 *
 * Quando uma nova senha é informada, ela também é atualizada
 * na tabela users utilizando bcrypt.
 */
app.put("/api/admin/students/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const { id } = req.params;

    const {
      name,
      email,
      password,
      gender,
      birth_date,
      cpf,
      phone,
      address,
      status,
    } = req.body;

    const normalizedStudentId = Number(id);

    /*
     * Valida o ID do aluno.
     */
    if (
      !Number.isInteger(normalizedStudentId) ||
      normalizedStudentId <= 0
    ) {
      return res.status(400).json({
        message: "ID do aluno inválido.",
      });
    }

    /*
     * Valida os campos principais.
     */
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Nome e e-mail são obrigatórios.",
      });
    }

    /*
     * Normaliza e valida o status acadêmico.
     */
    const normalizedStudentStatus =
      status || "active";

    const allowedStudentStatuses = [
      "active",
      "inactive",
      "cancelled",
    ];

    if (
      !allowedStudentStatuses.includes(
        normalizedStudentStatus
      )
    ) {
      return res.status(400).json({
        message: "Status do aluno inválido.",
      });
    }

    /*
     * O usuário de autenticação utiliza apenas
     * os status active e inactive.
     */
    const normalizedUserStatus =
      normalizedStudentStatus === "active"
        ? "active"
        : "inactive";

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Busca o aluno e recupera seu users.id.
     */
    const [studentRows] = await connection.query(
      `
        SELECT
          id,
          user_id
        FROM students
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedStudentId]
    );

    if (studentRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Aluno não encontrado.",
      });
    }

    const student = studentRows[0];

    /*
     * Confirma que o novo e-mail não pertence
     * a outro usuário.
     */
    const [existingEmailRows] = await connection.query(
      `
        SELECT id
        FROM users
        WHERE email = ?
          AND id <> ?
        LIMIT 1
      `,
      [email.trim(), student.user_id]
    );

    if (existingEmailRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "Este e-mail já está cadastrado.",
      });
    }

    /*
     * Atualiza users.
     *
     * A senha só é modificada quando uma nova senha
     * foi enviada pelo formulário.
     */
    if (password) {
      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      await connection.query(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            password_hash = ?,
            gender = ?,
            status = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          name.trim(),
          email.trim(),
          passwordHash,
          gender || null,
          normalizedUserStatus,
          student.user_id,
        ]
      );
    } else {
      await connection.query(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            gender = ?,
            status = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          name.trim(),
          email.trim(),
          gender || null,
          normalizedUserStatus,
          student.user_id,
        ]
      );
    }

    /*
     * Atualiza o perfil acadêmico.
     */
    const [studentUpdateResult] =
      await connection.query(
        `
          UPDATE students
          SET
            name = ?,
            email = ?,
            gender = ?,
            birth_date = ?,
            cpf = ?,
            phone = ?,
            address = ?,
            status = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          name.trim(),
          email.trim(),
          gender || null,
          birth_date || null,
          cpf?.trim() || null,
          phone?.trim() || null,
          address?.trim() || null,
          normalizedStudentStatus,
          normalizedStudentId,
        ]
      );

    if (studentUpdateResult.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Não foi possível atualizar o aluno.",
      });
    }

    /*
     * Confirma as alterações em users e students.
     */
    await connection.commit();

    return res.status(200).json({
      message: "Aluno atualizado com sucesso.",

      student: {
        id: normalizedStudentId,
        user_id: student.user_id,
        name: name.trim(),
        email: email.trim(),
        gender: gender || null,
        birth_date: birth_date || null,
        cpf: cpf?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        status: normalizedStudentStatus,
      },
    });
  } catch (error) {
    /*
     * Desfaz todas as alterações em caso de falha.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro ao atualizar aluno:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Já existe um cadastro utilizando estes dados.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao atualizar aluno.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — ATUALIZAÇÃO DE PROFESSORES
   ========================================================== */

/**
 * PUT /api/admin/teachers/:id
 * Atualiza os dados profissionais e de autenticação
 * de um professor.
 *
 * A senha só é atualizada quando uma nova senha
 * é informada.
 */
app.put("/api/admin/teachers/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const { id } = req.params;

    const {
      name,
      email,
      password,
      gender,
      cpf,
      phone,
      specialty,
      status,
    } = req.body;

    const normalizedTeacherId = Number(id);

    /*
     * Valida o ID do professor.
     */
    if (
      !Number.isInteger(normalizedTeacherId) ||
      normalizedTeacherId <= 0
    ) {
      return res.status(400).json({
        message: "ID do professor inválido.",
      });
    }

    /*
     * Valida os campos principais.
     */
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Nome e e-mail são obrigatórios.",
      });
    }

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "active";

    const allowedStatuses = [
      "active",
      "inactive",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status do professor inválido.",
      });
    }

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Busca o professor e recupera seu users.id.
     */
    const [teacherRows] = await connection.query(
      `
        SELECT
          id,
          user_id
        FROM teachers
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedTeacherId]
    );

    if (teacherRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Professor não encontrado.",
      });
    }

    const teacher = teacherRows[0];

    /*
     * Confirma que o novo e-mail não está sendo
     * utilizado por outro usuário.
     */
    const [existingEmailRows] = await connection.query(
      `
        SELECT id
        FROM users
        WHERE email = ?
          AND id <> ?
        LIMIT 1
      `,
      [email.trim(), teacher.user_id]
    );

    if (existingEmailRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "Este e-mail já está cadastrado.",
      });
    }

    /*
     * Atualiza users.
     *
     * Quando uma nova senha foi informada,
     * gera um novo hash.
     */
    if (password) {
      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      await connection.query(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            password_hash = ?,
            gender = ?,
            status = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          name.trim(),
          email.trim(),
          passwordHash,
          gender || null,
          normalizedStatus,
          teacher.user_id,
        ]
      );
    } else {
      await connection.query(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            gender = ?,
            status = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          name.trim(),
          email.trim(),
          gender || null,
          normalizedStatus,
          teacher.user_id,
        ]
      );
    }

    /*
     * Atualiza o perfil profissional.
     */
    const [teacherUpdateResult] =
      await connection.query(
        `
          UPDATE teachers
          SET
            name = ?,
            email = ?,
            gender = ?,
            cpf = ?,
            phone = ?,
            specialty = ?,
            status = ?,
            updated_at = NOW()
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
      await connection.rollback();

      return res.status(404).json({
        message:
          "Não foi possível atualizar o professor.",
      });
    }

    /*
     * Confirma as alterações.
     */
    await connection.commit();

    return res.status(200).json({
      message: "Professor atualizado com sucesso.",

      teacher: {
        id: normalizedTeacherId,
        user_id: teacher.user_id,
        name: name.trim(),
        email: email.trim(),
        gender: gender || null,
        cpf: cpf?.trim() || null,
        phone: phone?.trim() || null,
        specialty: specialty?.trim() || null,
        status: normalizedStatus,
      },
    });
  } catch (error) {
    /*
     * Desfaz a transação em caso de falha.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro ao atualizar professor:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Já existe um cadastro utilizando estes dados.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao atualizar professor.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — ATUALIZAÇÃO DE CURSOS
   ========================================================== */

/**
 * PUT /api/admin/courses/:id
 * Atualiza os dados de um curso.
 */
app.put("/api/admin/courses/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      workload_hours,
      price,
      status,
      teacher_id,
      image_url,
      nivel,
      expanded_description,
      syllabus,
      category,
    } = req.body;

    const normalizedCourseId = Number(id);

    /*
     * Valida o ID do curso.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0
    ) {
      return res.status(400).json({
        message: "ID do curso inválido.",
      });
    }

    /*
     * Valida o nome do curso.
     */
    if (!name?.trim()) {
      return res.status(400).json({
        message: "O nome do curso é obrigatório.",
      });
    }

    /*
     * Normaliza o ID do professor.
     *
     * O curso pode ficar temporariamente sem professor.
     */
    const normalizedTeacherId =
      teacher_id !== null &&
      teacher_id !== undefined &&
      teacher_id !== ""
        ? Number(teacher_id)
        : null;

    if (
      normalizedTeacherId !== null &&
      (
        !Number.isInteger(normalizedTeacherId) ||
        normalizedTeacherId <= 0
      )
    ) {
      return res.status(400).json({
        message: "ID do professor inválido.",
      });
    }

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "draft";

    const allowedStatuses = [
      "active",
      "inactive",
      "draft",
      "archived",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status do curso inválido.",
      });
    }

    /*
     * Normaliza os campos numéricos.
     */
    const normalizedWorkloadHours =
      workload_hours !== null &&
      workload_hours !== undefined &&
      workload_hours !== ""
        ? Number(workload_hours)
        : null;

    const normalizedPrice =
      price !== null &&
      price !== undefined &&
      price !== ""
        ? Number(price)
        : null;

    if (
      normalizedWorkloadHours !== null &&
      (
        Number.isNaN(normalizedWorkloadHours) ||
        normalizedWorkloadHours < 0
      )
    ) {
      return res.status(400).json({
        message: "Carga horária inválida.",
      });
    }

    if (
      normalizedPrice !== null &&
      (
        Number.isNaN(normalizedPrice) ||
        normalizedPrice < 0
      )
    ) {
      return res.status(400).json({
        message: "Preço inválido.",
      });
    }

    /*
     * Confirma que o curso existe.
     */
    const [courseRows] = await db.promise().query(
      `
        SELECT id
        FROM courses
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedCourseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        message: "Curso não encontrado.",
      });
    }

    /*
     * Confirma que o professor informado existe.
     */
    if (normalizedTeacherId !== null) {
      const [teacherRows] = await db.promise().query(
        `
          SELECT id
          FROM teachers
          WHERE id = ?
          LIMIT 1
        `,
        [normalizedTeacherId]
      );

      if (teacherRows.length === 0) {
        return res.status(404).json({
          message: "Professor não encontrado.",
        });
      }
    }

    /*
     * Atualiza o curso.
     */
    const [result] = await db.promise().query(
      `
        UPDATE courses
        SET
          name = ?,
          description = ?,
          workload_hours = ?,
          price = ?,
          status = ?,
          teacher_id = ?,
          image_url = ?,
          nivel = ?,
          expanded_description = ?,
          syllabus = ?,
          category = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [
        name.trim(),
        description?.trim() || null,
        normalizedWorkloadHours,
        normalizedPrice,
        normalizedStatus,
        normalizedTeacherId,
        image_url?.trim() || null,
        nivel?.trim() || "Iniciante",
        expanded_description?.trim() || null,
        syllabus?.trim() || null,
        category?.trim() || null,
        normalizedCourseId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message:
          "Não foi possível atualizar o curso.",
      });
    }

    return res.status(200).json({
      message: "Curso atualizado com sucesso.",

      course: {
        id: normalizedCourseId,
        name: name.trim(),
        description: description?.trim() || null,
        workload_hours: normalizedWorkloadHours,
        price: normalizedPrice,
        status: normalizedStatus,
        teacher_id: normalizedTeacherId,
        image_url: image_url?.trim() || null,
        nivel: nivel?.trim() || "Iniciante",
        expanded_description:
          expanded_description?.trim() || null,
        syllabus: syllabus?.trim() || null,
        category: category?.trim() || null,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar curso:",
      error
    );

    return res.status(500).json({
      message: "Erro ao atualizar curso.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});


/* ==========================================================
   FIM DA PARTE 8
   A próxima seção contém as remoções lógicas
   e arquivamentos administrativos.
   ========================================================== */

   /* ==========================================================
   ADMINISTRAÇÃO — REMOÇÕES LÓGICAS
   Alunos, professores e cursos
   ========================================================== */


/* ==========================================================
   ADMINISTRAÇÃO — REMOÇÃO LÓGICA DE ALUNOS
   ========================================================== */

/**
 * DELETE /api/admin/students/:id
 * Desativa um aluno sem removê-lo fisicamente do banco.
 *
 * A operação:
 * - altera students.status para cancelled;
 * - altera users.status para inactive.
 */
app.delete("/api/admin/students/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const normalizedStudentId = Number(id);

    /*
     * Valida o ID do aluno.
     */
    if (
      !Number.isInteger(normalizedStudentId) ||
      normalizedStudentId <= 0
    ) {
      return res.status(400).json({
        message: "ID do aluno inválido.",
      });
    }

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Busca o aluno e recupera o users.id associado.
     */
    const [studentRows] = await connection.query(
      `
        SELECT
          id,
          user_id,
          status
        FROM students
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedStudentId]
    );

    if (studentRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Aluno não encontrado.",
      });
    }

    const student = studentRows[0];

    /*
     * Evita repetir a remoção lógica.
     */
    if (student.status === "cancelled") {
      await connection.rollback();

      return res.status(409).json({
        message: "Este aluno já está removido.",
      });
    }

    /*
     * Desativa o perfil acadêmico.
     */
    const [studentUpdateResult] =
      await connection.query(
        `
          UPDATE students
          SET
            status = 'cancelled',
            updated_at = NOW()
          WHERE id = ?
        `,
        [normalizedStudentId]
      );

    if (studentUpdateResult.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message:
          "Não foi possível atualizar o status do aluno.",
      });
    }

    /*
     * Desativa o usuário de autenticação.
     */
    const [userUpdateResult] =
      await connection.query(
        `
          UPDATE users
          SET
            status = 'inactive',
            updated_at = NOW()
          WHERE id = ?
        `,
        [student.user_id]
      );

    if (userUpdateResult.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message:
          "Não foi possível desativar o usuário do aluno.",
      });
    }

    /*
     * Confirma as duas alterações.
     */
    await connection.commit();

    return res.status(200).json({
      message: "Aluno removido com sucesso.",

      student: {
        id: normalizedStudentId,
        user_id: student.user_id,
        status: "cancelled",
      },
    });
  } catch (error) {
    /*
     * Desfaz a operação em caso de falha.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro ao remover aluno:",
      error
    );

    return res.status(500).json({
      message: "Erro ao remover aluno.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — REMOÇÃO LÓGICA DE PROFESSORES
   ========================================================== */

/**
 * DELETE /api/admin/teachers/:id
 * Desativa um professor sem removê-lo fisicamente do banco.
 *
 * A operação:
 * - altera teachers.status para inactive;
 * - altera users.status para inactive.
 */
app.delete("/api/admin/teachers/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const normalizedTeacherId = Number(id);

    /*
     * Valida o ID do professor.
     */
    if (
      !Number.isInteger(normalizedTeacherId) ||
      normalizedTeacherId <= 0
    ) {
      return res.status(400).json({
        message: "ID do professor inválido.",
      });
    }

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Busca o professor e recupera o users.id associado.
     */
    const [teacherRows] = await connection.query(
      `
        SELECT
          id,
          user_id,
          status
        FROM teachers
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedTeacherId]
    );

    if (teacherRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Professor não encontrado.",
      });
    }

    const teacher = teacherRows[0];

    /*
     * Evita repetir a remoção lógica.
     */
    if (teacher.status === "inactive") {
      await connection.rollback();

      return res.status(409).json({
        message: "Este professor já está inativo.",
      });
    }

    /*
     * Desativa o perfil profissional.
     */
    const [teacherUpdateResult] =
      await connection.query(
        `
          UPDATE teachers
          SET
            status = 'inactive',
            updated_at = NOW()
          WHERE id = ?
        `,
        [normalizedTeacherId]
      );

    if (teacherUpdateResult.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message:
          "Não foi possível atualizar o status do professor.",
      });
    }

    /*
     * Desativa o usuário de autenticação.
     */
    const [userUpdateResult] =
      await connection.query(
        `
          UPDATE users
          SET
            status = 'inactive',
            updated_at = NOW()
          WHERE id = ?
        `,
        [teacher.user_id]
      );

    if (userUpdateResult.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message:
          "Não foi possível desativar o usuário do professor.",
      });
    }

    /*
     * Confirma as duas alterações.
     */
    await connection.commit();

    return res.status(200).json({
      message: "Professor removido com sucesso.",

      teacher: {
        id: normalizedTeacherId,
        user_id: teacher.user_id,
        status: "inactive",
      },
    });
  } catch (error) {
    /*
     * Desfaz a operação em caso de falha.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro ao remover professor:",
      error
    );

    return res.status(500).json({
      message: "Erro ao remover professor.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    /*
     * Devolve a conexão ao pool.
     */
    if (connection) {
      connection.release();
    }
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — ARQUIVAMENTO DE CURSOS
   ========================================================== */

/**
 * DELETE /api/admin/courses/:id
 * Arquiva um curso sem removê-lo fisicamente do banco.
 *
 * Esta operação altera courses.status para archived.
 */
app.delete("/api/admin/courses/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedCourseId = Number(id);

    /*
     * Valida o ID do curso.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0
    ) {
      return res.status(400).json({
        message: "ID do curso inválido.",
      });
    }

    /*
     * Busca o curso para validar sua existência
     * e verificar o status atual.
     */
    const [courseRows] = await db.promise().query(
      `
        SELECT
          id,
          status
        FROM courses
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedCourseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        message: "Curso não encontrado.",
      });
    }

    /*
     * Evita arquivar novamente.
     */
    if (courseRows[0].status === "archived") {
      return res.status(409).json({
        message: "Este curso já está arquivado.",
      });
    }

    /*
     * Realiza o soft delete.
     */
    const [result] = await db.promise().query(
      `
        UPDATE courses
        SET
          status = 'archived',
          updated_at = NOW()
        WHERE id = ?
      `,
      [normalizedCourseId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message:
          "Não foi possível arquivar o curso.",
      });
    }

    return res.status(200).json({
      message: "Curso arquivado com sucesso.",

      course: {
        id: normalizedCourseId,
        status: "archived",
      },
    });
  } catch (error) {
    console.error(
      "Erro ao arquivar curso:",
      error
    );

    return res.status(500).json({
      message: "Erro ao arquivar curso.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});


/* ==========================================================
   FIM DA PARTE 9
   A próxima seção contém as rotas restantes,
   a inicialização da API e a revisão final.
   ========================================================== */

   /* ==========================================================
   INICIALIZAÇÃO DA API
   ========================================================== */

/**
 * Inicia o servidor HTTP do CourseHub.
 *
 * A aplicação passa a escutar requisições na porta
 * definida pela constante PORT.
 */
app.listen(PORT, () => {
  console.log(
    `Servidor CourseHub rodando em http://localhost:${PORT}`
  );
});