/* ==========================================================
   COURSEHUB API
   Configuração inicial, autenticação e rotas gerais
   ========================================================== */

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const db = require("./db");

const app = express();
const PORT = 3001;


/* ==========================================================
   MIDDLEWARES GLOBAIS
   ========================================================== */

/**
 * Permite requisições vindas do frontend.
 */
app.use(cors());

/**
 * Permite que a API receba dados JSON no corpo das requisições.
 */
app.use(express.json());


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
  const [studentRows] = await db.promise().query(
    `
      SELECT id
      FROM students
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return studentRows.length > 0
    ? studentRows[0].id
    : null;
}


/* ==========================================================
   INFRAESTRUTURA
   ========================================================== */

/**
 * GET /
 * Verifica se a API está funcionando.
 */
app.get("/", (req, res) => {
  return res.status(200).json({
    message: "API CourseHub rodando!",
  });
});


/* ==========================================================
   AUTENTICAÇÃO
   ========================================================== */

/**
 * POST /login
 * Autentica um usuário por e-mail e senha.
 */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    /*
     * Valida os campos obrigatórios.
     */
    if (!email || !password) {
      return res.status(400).json({
        message: "Email e senha são obrigatórios.",
      });
    }

    /*
     * Busca o usuário pelo e-mail.
     */
    const [users] = await db.promise().query(
      `
        SELECT
          id,
          name,
          email,
          password_hash,
          gender,
          role,
          status
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email]
    );

    /*
     * Não revela se foi o e-mail ou a senha que estava incorreto.
     */
    if (users.length === 0) {
      return res.status(401).json({
        message: "Email ou senha inválidos.",
      });
    }

    const user = users[0];

    /*
     * Compara a senha informada com o hash armazenado.
     */
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Email ou senha inválidos.",
      });
    }

    /*
     * Impede o acesso de usuários inativos.
     */
    if (user.status !== "active") {
      return res.status(403).json({
        message: "Usuário inativo.",
      });
    }

    /*
     * Remove o hash da senha antes de devolver os dados ao frontend.
     */
    delete user.password_hash;

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      user,
    });
  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      message: "Erro interno no servidor.",
      error: error.message,
    });
  }
});

/*==========================================================
LISTAR E ALTERAR DADOS DOS USUÁRIOS 
 ========================================================== /*
 
 // ======================================================
// PROFILE
// ======================================================

/**
 * GET /api/profile/:userId
 *
 * Retorna todas as informações necessárias para a página
 * "Meu Perfil".
 *
 * Dependendo da role do usuário, busca os dados
 * específicos em students ou teachers.
 */
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Busca os dados principais na tabela users
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

    // 2. Verifica se o usuário existe
    if (userRows.length === 0) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const user = userRows[0];

    // 3. Estrutura base do perfil
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
    };

    // 4. Caso seja aluno, busca dados complementares
    if (user.role === "student") {
      const [studentRows] = await db.promise().query(
        `
        SELECT
          phone,
          address
        FROM students
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (studentRows.length > 0) {
        profile.phone = studentRows[0].phone || null;
        profile.address = studentRows[0].address || null;
      }
    }

    // 5. Caso seja professor, busca dados complementares
    if (user.role === "teacher") {
      const [teacherRows] = await db.promise().query(
        `
        SELECT
          phone,
          specialty
        FROM teachers
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (teacherRows.length > 0) {
        profile.phone = teacherRows[0].phone || null;
        profile.specialty = teacherRows[0].specialty || null;
      }
    }

    // 6. Responde ao frontend
    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);

    return res.status(500).json({
      message: "Erro ao carregar perfil.",
      error: error.message,
    });
  }
});






/**
 * PATCH /api/profile/:userId/password
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



app.patch("/api/profile/:userId/password", async (req, res) => {
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const { userId } = req.params;

    const {
      currentPassword,
      newPassword,
    } = req.body;

    // 1. Valida os campos obrigatórios
    if (!currentPassword || !newPassword) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "A senha atual e a nova senha são obrigatórias.",
      });
    }

    // 2. Valida o tamanho mínimo da nova senha
    if (newPassword.length < 6) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "A nova senha deve possuir pelo menos 6 caracteres.",
      });
    }

    // 3. Busca o usuário e o hash atual
    const [userRows] = await connection.query(
      `
      SELECT
        id,
        password_hash,
        status
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const user = userRows[0];

    // 4. Impede alteração para usuário inativo ou bloqueado
    if (user.status !== "active") {
      await connection.rollback();

      return res.status(403).json({
        message:
          "Não é possível alterar a senha deste usuário.",
      });
    }

    // 5. Compara a senha atual com o hash armazenado
    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

    if (!currentPasswordMatches) {
      await connection.rollback();

      return res.status(401).json({
        message: "A senha atual está incorreta.",
      });
    }

    // 6. Impede que a nova senha seja igual à atual
    const newPasswordMatchesCurrent =
      await bcrypt.compare(
        newPassword,
        user.password_hash
      );

    if (newPasswordMatchesCurrent) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "A nova senha deve ser diferente da senha atual.",
      });
    }

    // 7. Gera o novo hash
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      10
    );

    // 8. Atualiza somente a senha
    await connection.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        newPasswordHash,
        userId,
      ]
    );

    await connection.commit();

    return res.status(200).json({
      message: "Senha alterada com sucesso.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Erro ao executar rollback:",
          rollbackError
        );
      }
    }

    console.error(
      "Erro ao atualizar senha:",
      error
    );

    return res.status(500).json({
      message: "Erro ao atualizar senha.",
      error:
        error.message ||
        "Erro interno do servidor.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


/*TROCA DE SENHA - ROTA PARA VERIFICAÇÃO DO EMAIL  */

app.post(
  "/api/forgot-password/check-email",
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "O e-mail é obrigatório.",
        });
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase();

      const [userRows] = await db.promise().query(
        `
        SELECT
          id,
          email,
          status
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [normalizedEmail]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          message:
            "Não existe uma conta cadastrada com este e-mail.",
        });
      }

      const user = userRows[0];

      if (user.status !== "active") {
        return res.status(403).json({
          message:
            "Esta conta não está ativa. Entre em contato com a instituição.",
        });
      }

      return res.status(200).json({
        message: "E-mail encontrado.",
        email: user.email,
      });
    } catch (error) {
      console.error(
        "Erro ao verificar e-mail:",
        error
      );

      return res.status(500).json({
        message: "Erro ao verificar o e-mail.",
        error: error.message,
      });
    }
  }
);

/* ROTA PARA ATUALIZAÇÃO DA SENHA */
app.patch(
  "/api/forgot-password/reset",
  async (req, res) => {
    try {
      const {
        email,
        newPassword,
        confirmPassword,
      } = req.body;

      if (
        !email ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          message:
            "E-mail, nova senha e confirmação são obrigatórios.",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message:
            "A nova senha e a confirmação não coincidem.",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message:
            "A nova senha deve possuir pelo menos 6 caracteres.",
        });
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase();

      const [userRows] = await db.promise().query(
        `
        SELECT
          id,
          status
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [normalizedEmail]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          message: "Usuário não encontrado.",
        });
      }

      const user = userRows[0];

      if (user.status !== "active") {
        return res.status(403).json({
          message:
            "Esta conta não está ativa.",
        });
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        10
      );

      await db.promise().query(
        `
        UPDATE users
        SET
          password_hash = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [hashedPassword, user.id]
      );

      return res.status(200).json({
        message:
          "Senha redefinida com sucesso. Você será direcionado para o login.",
      });
    } catch (error) {
      console.error(
        "Erro ao redefinir senha:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao redefinir a senha.",
        error: error.message,
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
app.get("/courses", (req, res) => {
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
app.get("/courses/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT *
    FROM courses
    WHERE id = ?
      AND status = 'active'
    LIMIT 1
  `;

  db.query(sql, [id], (error, results) => {
    if (error) {
      console.error("Erro ao buscar curso:", error);

      return res.status(500).json({
        message: "Erro ao buscar curso.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Curso não encontrado.",
      });
    }

    return res.status(200).json(results[0]);
  });
});


/**
 * GET /courses/:id/contents
 * Lista a trilha de conteúdos e atividades de um curso.
 */
app.get("/courses/:id/contents", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id,
      course_id,
      title,
      description,
      type,
      content_url,
      content_text,
      order_index,
      is_required,
      status,
      due_date,
      'content' AS source
    FROM course_contents
    WHERE course_id = ?
      AND status = 'active'

    UNION ALL

    SELECT
      id,
      course_id,
      title,
      description,
      CASE
        WHEN type = 'quiz' THEN 'assessment'
        ELSE 'activity'
      END AS type,
      NULL AS content_url,
      NULL AS content_text,
      order_index,
      is_required,
      status,
      due_date,
      'activity' AS source
    FROM activities
    WHERE course_id = ?
      AND status = 'active'

    ORDER BY order_index ASC
  `;

  db.query(sql, [id, id], (error, results) => {
    if (error) {
      console.error(
        "Erro ao buscar conteúdos do curso:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar conteúdos do curso.",
        error: error.message,
      });
    }

    return res.status(200).json(results);
  });
});


/* ==========================================================
   USUÁRIOS — ROTAS GERAIS
   ========================================================== */

/**
 * GET /users
 * Lista os usuários sem retornar os hashes das senhas.
 */
app.get("/users", (req, res) => {
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
 * O cadastro administrativo permanece em POST /admin/students.
 */
app.post("/users", (req, res) => {
  const {
    name,
    email,
    password,
    password_hash,
    gender,
    birth_date,
    cpf,
    phone,
  } = req.body;

  const finalPassword = password_hash || password;
  const finalGender = gender || "Masculino";

  /*
   * Valida os campos obrigatórios.
   */
  if (!name || !email || !finalPassword) {
    return res.status(400).json({
      message: "Nome, email e senha são obrigatórios.",
    });
  }

  /*
   * Inicia a transação para que users e students
   * sejam cadastrados juntos.
   */
  db.beginTransaction((transactionError) => {
    if (transactionError) {
      console.error(
        "Erro ao iniciar transação:",
        transactionError
      );

      return res.status(500).json({
        message: "Erro ao iniciar transação.",
      });
    }

    const insertUserSql = `
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
    `;

    /*
     * Cria o registro principal do usuário.
     */
    db.query(
      insertUserSql,
      [
        name,
        email,
        finalPassword,
        finalGender,
      ],
      (userError, userResult) => {
        if (userError) {
          return db.rollback(() => {
            if (userError.code === "ER_DUP_ENTRY") {
              return res.status(409).json({
                message: "Este e-mail já está cadastrado.",
              });
            }

            console.error(
              "Erro ao cadastrar usuário:",
              userError
            );

            return res.status(500).json({
              message: "Erro ao cadastrar usuário.",
              error: userError,
            });
          });
        }

        const userId = userResult.insertId;

        /*
         * Usa valores temporários quando CPF ou matrícula
         * ainda não foram definidos.
         */
        const temporaryCpf =
          cpf || `PENDENTE-${userId}`;

        const temporaryRegistration =
          `TEMP-${userId}`;

        const insertStudentSql = `
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
        `;

        /*
         * Cria o perfil acadêmico do aluno.
         */
        db.query(
          insertStudentSql,
          [
            userId,
            name,
            email,
            finalGender,
            temporaryRegistration,
            birth_date || "2000-01-01",
            temporaryCpf,
            phone || "",
          ],
          (studentError, studentResult) => {
            if (studentError) {
              return db.rollback(() => {
                console.error(
                  "Erro ao cadastrar aluno:",
                  studentError
                );

                return res.status(500).json({
                  message: "Erro ao cadastrar aluno.",
                  error: studentError,
                });
              });
            }

            const studentId = studentResult.insertId;

            /*
             * Gera a matrícula definitiva com base no ID do aluno.
             */
            const registrationNumber =
              `STU2026${String(studentId).padStart(3, "0")}`;

            const updateRegistrationSql = `
              UPDATE students
              SET registration_number = ?
              WHERE id = ?
            `;

            /*
             * Substitui a matrícula temporária pela definitiva.
             */
            db.query(
              updateRegistrationSql,
              [registrationNumber, studentId],
              (registrationError) => {
                if (registrationError) {
                  return db.rollback(() => {
                    console.error(
                      "Erro ao gerar matrícula:",
                      registrationError
                    );

                    return res.status(500).json({
                      message:
                        "Erro ao gerar matrícula do aluno.",
                      error: registrationError,
                    });
                  });
                }

                /*
                 * Confirma definitivamente as inserções.
                 */
                db.commit((commitError) => {
                  if (commitError) {
                    return db.rollback(() => {
                      console.error(
                        "Erro ao finalizar cadastro:",
                        commitError
                      );

                      return res.status(500).json({
                        message:
                          "Erro ao finalizar cadastro.",
                      });
                    });
                  }

                  return res.status(201).json({
                    message:
                      "Aluno cadastrado com sucesso.",
                    userId,
                    studentId,
                    registrationNumber,
                  });
                });
              }
            );
          }
        );
      }
    );
  });
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
 * GET /students/by-user/:userId/courses
 * Lista os cursos em que o aluno possui matrícula ativa.
 */
app.get(
  "/students/by-user/:userId/courses",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID recebido pela URL.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
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
       * Busca apenas matrículas e cursos ativos.
       */
      const [courses] = await db.promise().query(
        `
          SELECT
            c.id,
            c.name,
            c.description,
            c.nivel,
            c.category,
            c.workload_hours,
            c.image_url,

            e.status AS enrollment_status,
            e.enrolled_at

          FROM enrollments e

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?
            AND e.status = 'active'
            AND c.status = 'active'

          ORDER BY e.enrolled_at DESC
        `,
        [studentId]
      );

      return res.status(200).json(courses);
    } catch (error) {
      console.error(
        "Erro ao buscar cursos do aluno:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar cursos do aluno.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   ALUNO — ATIVIDADES
   ========================================================== */

/*
 * ============================================================
 * ALUNO — LISTAR ATIVIDADES, AVALIAÇÕES E STATUS DAS ENTREGAS
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do aluno;
 * - converte users.id em students.id;
 * - busca atividades e avaliações dos cursos ativos
 *   em que o aluno possui matrícula ativa;
 * - carrega a submission do aluno quando ela existir;
 * - retorna o status da entrega, nota, feedback e prazo;
 * - permite ao frontend calcular pendentes, atrasadas,
 *   aguardando correção, corrigidas e média.
 */
app.get(
  "/students/by-user/:userId/activities",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
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
       * Busca atividades e avaliações pertencentes
       * aos cursos em que o aluno possui matrícula ativa.
       *
       * O LEFT JOIN com submissions é necessário porque:
       * - atividades enviadas possuem uma submission;
       * - atividades pendentes ainda não possuem submission.
       */
      const [activities] = await db.promise().query(
        `
          SELECT
            a.id,
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
            a.created_at,
            a.updated_at,

            c.name AS course_title,
            c.name AS course_name,

            sub.id AS submission_id,
            sub.status AS submission_status,
            sub.score,
            sub.score AS grade,
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

          FROM enrollments e

          INNER JOIN courses c
            ON c.id = e.course_id

          INNER JOIN activities a
            ON a.course_id = c.id

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id
            AND sub.student_id = e.student_id

          WHERE e.student_id = ?
            AND e.status = 'active'
            AND c.status = 'active'
            AND a.status = 'active'

          ORDER BY
            CASE
              WHEN a.due_date IS NULL THEN 1
              ELSE 0
            END ASC,
            a.due_date ASC,
            a.created_at DESC
        `,
        [studentId]
      );

      /*
       * Normaliza os valores numéricos e booleanos
       * retornados pelo MySQL.
       */
      const normalizedActivities = activities.map(
        (activity) => ({
          ...activity,

          max_score:
            activity.max_score !== null &&
            activity.max_score !== undefined
              ? Number(activity.max_score)
              : 10,

          score:
            activity.score !== null &&
            activity.score !== undefined
              ? Number(activity.score)
              : null,

          grade:
            activity.grade !== null &&
            activity.grade !== undefined
              ? Number(activity.grade)
              : null,

          is_required: Boolean(
            activity.is_required
          ),

          is_overdue: Boolean(
            activity.is_overdue
          ),
        })
      );

      return res.status(200).json(
        normalizedActivities
      );
    } catch (error) {
      console.error(
        "Erro ao buscar atividades do aluno:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar atividades do aluno.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/**
 * GET /students/by-user/:userId/activities/:activityId/full
 * Carrega uma atividade com suas questões e alternativas.
 */
app.get(
  "/students/by-user/:userId/activities/:activityId/full",
  async (req, res) => {
    try {
      const { userId, activityId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedActivityId = Number(activityId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Impede consultas com IDs inválidos, como:
       *
       * /activities/undefined/full
       * /activities/abc/full
       * /activities/0/full
       */
      if (
        !Number.isInteger(normalizedActivityId) ||
        normalizedActivityId <= 0
      ) {
        return res.status(400).json({
          message: "ID da atividade inválido.",
        });
      }

      /*
       * Converte:
       *
       * users.id -> students.user_id -> students.id
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
       * Busca a atividade e confirma:
       *
       * 1. Que a atividade existe.
       * 2. Que está ativa.
       * 3. Que o aluno está matriculado no curso.
       * 4. Que a matrícula está ativa.
       * 5. Se o aluno já realizou um envio.
       */
      const [activityRows] = await db.promise().query(
        `
          SELECT
            a.id,
            a.course_id,
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

            c.name AS course_title,

            CASE
              WHEN a.due_date IS NOT NULL
                AND a.due_date < NOW()
              THEN 1
              ELSE 0
            END AS is_overdue,

            sub.id AS submission_id,
            sub.status AS submission_status,
            sub.score AS submission_score,
            sub.feedback AS submission_feedback,
            sub.submitted_at,
            sub.graded_at

          FROM activities a

          INNER JOIN courses c
            ON c.id = a.course_id

          INNER JOIN enrollments e
            ON e.course_id = a.course_id
            AND e.student_id = ?
            AND e.status = 'active'

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id
            AND sub.student_id = e.student_id

          WHERE a.id = ?
            AND a.status = 'active'
            AND c.status = 'active'

          LIMIT 1
        `,
        [studentId, normalizedActivityId]
      );

      if (activityRows.length === 0) {
        return res.status(404).json({
          message:
            "Atividade não encontrada ou indisponível para este aluno.",
        });
      }

      const activity = activityRows[0];

      /*
       * Busca todas as questões da atividade.
       */
      const [questions] = await db.promise().query(
        `
          SELECT
            id,
            activity_id,
            question_text,
            question_type,
            points,
            order_index
          FROM activity_questions
          WHERE activity_id = ?
          ORDER BY order_index ASC, id ASC
        `,
        [normalizedActivityId]
      );

      /*
       * Armazena as alternativas encontradas.
       *
       * Questões discursivas e de upload não possuem
       * alternativas.
       */
      let options = [];

      /*
       * Busca as alternativas de todas as questões
       * objetivas em uma única consulta.
       *
       * Isso evita executar uma query dentro de um loop.
       */
      if (questions.length > 0) {
        const questionIds = questions.map(
          (question) => question.id
        );

        const placeholders = questionIds
          .map(() => "?")
          .join(", ");

        const [optionRows] = await db.promise().query(
          `
            SELECT
              id,
              question_id,
              option_text
            FROM activity_options
            WHERE question_id IN (${placeholders})
            ORDER BY question_id ASC, id ASC
          `,
          questionIds
        );

        options = optionRows;
      }

      /*
       * Agrupa as alternativas pelo ID da questão.
       *
       * Estrutura resultante:
       *
       * {
       *   10: [alternativa1, alternativa2],
       *   11: [alternativa1, alternativa2]
       * }
       */
      const optionsByQuestionId = options.reduce(
        (accumulator, option) => {
          if (!accumulator[option.question_id]) {
            accumulator[option.question_id] = [];
          }

          accumulator[option.question_id].push(option);

          return accumulator;
        },
        {}
      );

      /*
       * Adiciona o array options em cada questão.
       *
       * Questões discursivas e de upload recebem
       * um array vazio.
       */
      const questionsWithOptions = questions.map(
        (question) => ({
          ...question,

          options:
            question.question_type === "multiple_choice"
              ? optionsByQuestionId[question.id] || []
              : [],
        })
      );

      return res.status(200).json({
        ...activity,
        is_overdue: Boolean(activity.is_overdue),
        questions: questionsWithOptions,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar atividade do aluno:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar atividade.",
        error: error.message,
      });
    }
  }
);



/* ==========================================================
   ALUNO — ENVIOS
   ========================================================== */

/**
 * POST /students/by-user/:userId/activities/:activityId/submissions
 * Registra a entrega completa de uma atividade pelo aluno.
 */
app.post(
  "/students/by-user/:userId/activities/:activityId/submissions",
  async (req, res) => {
    let connection;

    try {
      const { userId, activityId } = req.params;
      const { answers } = req.body;

      const normalizedUserId = Number(userId);
      const normalizedActivityId = Number(activityId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID da atividade.
       */
      if (
        !Number.isInteger(normalizedActivityId) ||
        normalizedActivityId <= 0
      ) {
        return res.status(400).json({
          message: "ID da atividade inválido.",
        });
      }

      /*
       * Confirma que o corpo da requisição contém respostas.
       */
      if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
          message: "Envie pelo menos uma resposta.",
        });
      }

      /*
       * Abre uma conexão exclusiva e inicia a transação.
       *
       * A submission e todas as respostas precisam ser
       * salvas juntas.
       */
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      /*
       * Descobre o students.id a partir do users.id.
       */
      const [studentRows] = await connection.query(
        `
          SELECT id
          FROM students
          WHERE user_id = ?
          LIMIT 1
        `,
        [normalizedUserId]
      );

      if (studentRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      const studentId = studentRows[0].id;

      /*
       * Busca a atividade que será respondida.
       *
       * due_date precisa ser carregado porque será usado
       * para verificar se o prazo terminou.
       */
      const [activityRows] = await connection.query(
        `
          SELECT
            id,
            course_id,
            activity_kind,
            title,
            due_date,
            status
          FROM activities
          WHERE id = ?
          LIMIT 1
        `,
        [normalizedActivityId]
      );

      if (activityRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Atividade não encontrada.",
        });
      }

      const activity = activityRows[0];

      /*
       * Impede entregas de atividades inativas,
       * arquivadas ou em rascunho.
       */
      if (activity.status !== "active") {
        await connection.rollback();

        return res.status(409).json({
          message:
            activity.activity_kind === "exam"
              ? "Esta avaliação não está disponível para envio."
              : "Esta atividade não está disponível para envio.",
        });
      }

      /*
       * Impede entregas após o prazo.
       */
      if (
        activity.due_date &&
        new Date(activity.due_date) < new Date()
      ) {
        await connection.rollback();

        return res.status(409).json({
          message:
            activity.activity_kind === "exam"
              ? "O prazo desta avaliação já foi encerrado."
              : "O prazo desta atividade já foi encerrado.",
        });
      }

      /*
       * Confirma que o aluno possui matrícula ativa
       * no curso da atividade.
       */
      const [enrollmentRows] = await connection.query(
        `
          SELECT id
          FROM enrollments
          WHERE student_id = ?
            AND course_id = ?
            AND status = 'active'
          LIMIT 1
        `,
        [studentId, activity.course_id]
      );

      if (enrollmentRows.length === 0) {
        await connection.rollback();

        return res.status(403).json({
          message: "Você não está matriculado neste curso.",
        });
      }

      /*
       * Impede que o aluno envie a mesma atividade
       * mais de uma vez.
       */
      const [existingSubmissionRows] =
        await connection.query(
          `
            SELECT id
            FROM submissions
            WHERE activity_id = ?
              AND student_id = ?
            LIMIT 1
          `,
          [normalizedActivityId, studentId]
        );

      if (existingSubmissionRows.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message:
            activity.activity_kind === "exam"
              ? "Você já enviou esta avaliação."
              : "Você já enviou esta atividade.",
        });
      }

      /*
       * Busca todas as questões que pertencem à atividade.
       */
      const [questions] = await connection.query(
        `
          SELECT
            id,
            question_type,
            points
          FROM activity_questions
          WHERE activity_id = ?
          ORDER BY order_index ASC, id ASC
        `,
        [normalizedActivityId]
      );

      if (questions.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          message: "Esta atividade não possui questões.",
        });
      }

      /*
       * Cria um mapa para localizar cada questão
       * rapidamente durante as validações.
       */
      const questionMap = new Map();

      questions.forEach((question) => {
        questionMap.set(
          Number(question.id),
          question
        );
      });

      /*
       * Normaliza os IDs das questões recebidas.
       */
      const receivedQuestionIds = answers.map(
        (answer) => Number(answer.question_id)
      );

      const uniqueQuestionIds = new Set(
        receivedQuestionIds
      );

      /*
       * Impede duas respostas para a mesma questão.
       */
      if (uniqueQuestionIds.size !== answers.length) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Existem respostas duplicadas para a mesma questão.",
        });
      }

      /*
       * Valida individualmente cada resposta enviada.
       */
      for (const answer of answers) {
        const questionId = Number(answer.question_id);
        const question = questionMap.get(questionId);

        /*
         * Confirma que a questão pertence à atividade.
         */
        if (!question) {
          await connection.rollback();

          return res.status(400).json({
            message:
              "Uma resposta pertence a uma questão inválida.",
          });
        }

        /*
         * Aplica a validação correspondente ao tipo
         * da questão.
         */
        switch (question.question_type) {
          case "multiple_choice": {
            const normalizedOptionId = Number(
              answer.option_id
            );

            if (
              !Number.isInteger(normalizedOptionId) ||
              normalizedOptionId <= 0
            ) {
              await connection.rollback();

              return res.status(400).json({
                message:
                  "Todas as questões objetivas devem possuir uma alternativa.",
              });
            }

            /*
             * Confirma que a alternativa selecionada
             * pertence à questão respondida.
             */
            const [optionRows] = await connection.query(
              `
                SELECT id
                FROM activity_options
                WHERE id = ?
                  AND question_id = ?
                LIMIT 1
              `,
              [normalizedOptionId, questionId]
            );

            if (optionRows.length === 0) {
              await connection.rollback();

              return res.status(400).json({
                message:
                  "A alternativa selecionada é inválida.",
              });
            }

            break;
          }

          case "text": {
            if (!answer.answer_text?.trim()) {
              await connection.rollback();

              return res.status(400).json({
                message:
                  "Todas as questões discursivas devem ser respondidas.",
              });
            }

            break;
          }

          case "upload": {
            if (!answer.file_url?.trim()) {
              await connection.rollback();

              return res.status(400).json({
                message:
                  "O envio de arquivos ainda não está disponível.",
              });
            }

            break;
          }

          default: {
            await connection.rollback();

            return res.status(400).json({
              message: "Tipo de questão inválido.",
            });
          }
        }
      }

      /*
       * Confirma que todas as questões da atividade
       * receberam uma resposta.
       */
      const hasMissingQuestion = questions.some(
        (question) =>
          !uniqueQuestionIds.has(Number(question.id))
      );

      if (hasMissingQuestion) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Responda todas as questões antes de enviar.",
        });
      }

      /*
       * Cria o registro principal da entrega.
       *
       * A submission representa a entrega completa,
       * não uma resposta individual.
       */
      const [submissionResult] =
        await connection.query(
          `
            INSERT INTO submissions
            (
              activity_id,
              student_id,
              status,
              submitted_at
            )
            VALUES (?, ?, 'pending_review', NOW())
          `,
          [normalizedActivityId, studentId]
        );

      const submissionId = submissionResult.insertId;

      /*
       * Salva cada resposta individualmente
       * em submission_answers.
       */
      for (const answer of answers) {
        const normalizedQuestionId = Number(
          answer.question_id
        );

        const normalizedOptionId =
          answer.option_id !== null &&
          answer.option_id !== undefined &&
          answer.option_id !== ""
            ? Number(answer.option_id)
            : null;

        const normalizedAnswerText =
          answer.answer_text?.trim() || null;

        const normalizedFileUrl =
          answer.file_url?.trim() || null;

        await connection.query(
          `
            INSERT INTO submission_answers
            (
              submission_id,
              question_id,
              option_id,
              answer_text,
              file_url
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            normalizedQuestionId,
            normalizedOptionId,
            normalizedAnswerText,
            normalizedFileUrl,
          ]
        );
      }

      /*
       * Confirma a submission e todas as respostas.
       */
      await connection.commit();

      return res.status(201).json({
        message:
          activity.activity_kind === "exam"
            ? "Avaliação enviada com sucesso."
            : "Atividade enviada com sucesso.",

        submission: {
          id: submissionId,
          activity_id: normalizedActivityId,
          student_id: studentId,
          status: "pending_review",
        },
      });
    } catch (error) {
      /*
       * Desfaz todas as operações caso qualquer
       * etapa da entrega falhe.
       */
      if (connection) {
        await connection.rollback();
      }

      console.error(
        "Erro ao enviar atividade:",
        error
      );

      return res.status(500).json({
        message: "Erro ao enviar atividade.",
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
  }
);



/*
 * ============================================================
 * ALUNO — BUSCAR PROGRESSO DOS CONTEÚDOS DE UM CURSO
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do aluno;
 * - recebe o ID do curso;
 * - converte users.id em students.id;
 * - verifica se o aluno possui matrícula ativa no curso;
 * - busca todos os conteúdos ativos do curso;
 * - busca o progresso do aluno quando existir;
 * - considera conteúdos sem registro como not_started;
 * - calcula o progresso geral do curso.
 */
app.get(
  "/students/by-user/:userId/courses/:courseId/progress",
  async (req, res) => {
    try {
      const { userId, courseId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedCourseId = Number(courseId);

      /*
       * Valida o users.id.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

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
       * - o aluno possui matrícula ativa nele.
       */
      const [enrollmentRows] = await db.promise().query(
        `
          SELECT
            e.id AS enrollment_id,
            e.student_id,
            e.course_id,
            e.status AS enrollment_status,
            c.name AS course_title
          FROM enrollments e

          INNER JOIN courses c
            ON c.id = e.course_id

          WHERE e.student_id = ?
            AND e.course_id = ?
            AND e.status = 'active'
            AND c.status = 'active'

          LIMIT 1
        `,
        [studentId, normalizedCourseId]
      );

      if (enrollmentRows.length === 0) {
        return res.status(403).json({
          message:
            "O aluno não possui matrícula ativa neste curso.",
        });
      }

      const enrollment = enrollmentRows[0];

      /*
       * Busca todos os conteúdos ativos do curso.
       *
       * O LEFT JOIN é necessário porque conteúdos nunca
       * acessados ainda não possuem registro na tabela
       * student_content_progress.
       */
      const [contentRows] = await db.promise().query(
        `
          SELECT
            cc.id AS content_id,
            cc.course_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.content_text,
            cc.order_index,
            cc.is_required,
            cc.status AS content_status,

            scp.id AS progress_id,
            scp.student_id,
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

          WHERE cc.course_id = ?
            AND cc.status = 'active'
            AND cc.type IN (
              'video',
              'pdf',
              'text',
              'live_class'
            )

          ORDER BY
            cc.order_index ASC,
            cc.id ASC
        `,
        [studentId, normalizedCourseId]
      );

      /*
       * Normaliza os conteúdos.
       *
       * Quando não existe registro em
       * student_content_progress:
       * - status = not_started;
       * - progress_percentage = 0;
       * - demais datas permanecem null.
       */
      const contents = contentRows.map((content) => ({
        content_id: content.content_id,
        course_id: content.course_id,
        title: content.title,
        description: content.description,
        type: content.type,
        content_url: content.content_url,
        content_text: content.content_text,
        order_index: content.order_index,
        is_required: Boolean(content.is_required),
        content_status: content.content_status,

        progress_id: content.progress_id,
        progress_status:
          content.progress_status || "not_started",

        progress_percentage:
          content.progress_percentage !== null &&
          content.progress_percentage !== undefined
            ? Number(content.progress_percentage)
            : 0,

        last_position_seconds:
          content.last_position_seconds !== null &&
          content.last_position_seconds !== undefined
            ? Number(content.last_position_seconds)
            : null,

        started_at: content.started_at,
        completed_at: content.completed_at,
        last_accessed_at: content.last_accessed_at,
        progress_created_at:
          content.progress_created_at,
        progress_updated_at:
          content.progress_updated_at,
      }));

      /*
       * Conta apenas conteúdos obrigatórios para o
       * percentual geral do curso.
       *
       * Caso você prefira considerar todos os conteúdos,
       * basta remover o filtro por is_required.
       */
      const requiredContents = contents.filter(
        (content) => content.is_required
      );

      const completedContents =
        requiredContents.filter(
          (content) =>
            content.progress_status === "completed"
        );

      const inProgressContents =
        requiredContents.filter(
          (content) =>
            content.progress_status === "in_progress"
        );

      const totalContents = requiredContents.length;
      const completedCount = completedContents.length;
      const inProgressCount =
        inProgressContents.length;

      const progressPercentage =
        totalContents > 0
          ? Number(
              (
                (completedCount / totalContents) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * Retorna o resumo e a lista completa de conteúdos.
       */
      return res.status(200).json({
        student_id: studentId,
        course_id: normalizedCourseId,
        course_title: enrollment.course_title,

        total_contents: totalContents,
        completed_contents: completedCount,
        in_progress_contents: inProgressCount,
        not_started_contents:
          totalContents -
          completedCount -
          inProgressCount,

        progress_percentage:
          progressPercentage,

        contents,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar progresso do curso:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar o progresso do curso.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);

/*
 * ============================================================
 * ALUNO — CRIAR OU ATUALIZAR PROGRESSO DE UM CONTEÚDO
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do aluno;
 * - recebe o ID de um conteúdo de course_contents;
 * - converte users.id em students.id;
 * - busca o conteúdo e descobre seu course_id;
 * - confirma que o conteúdo e o curso estão ativos;
 * - confirma que o aluno possui matrícula ativa no curso;
 * - cria o progresso caso ainda não exista;
 * - atualiza o progresso caso já exista;
 * - preserva a data original de início;
 * - controla conclusão, percentual, posição e último acesso;
 * - nunca confia em course_id enviado pelo frontend.
 *
 * Payloads esperados:
 *
 * Marcar como concluído:
 * {
 *   "status": "completed",
 *   "progress_percentage": 100
 * }
 *
 * Desmarcar conclusão:
 * {
 *   "status": "in_progress",
 *   "progress_percentage": 0
 * }
 *
 * Atualizar posição de vídeo:
 * {
 *   "status": "in_progress",
 *   "progress_percentage": 45.5,
 *   "last_position_seconds": 320
 * }
 */
app.put(
  "/students/by-user/:userId/contents/:contentId/progress",
  async (req, res) => {
    let connection;

    try {
      const { userId, contentId } = req.params;

      const {
        status,
        progress_percentage,
        last_position_seconds,
      } = req.body;

      const normalizedUserId = Number(userId);
      const normalizedContentId = Number(contentId);

      /*
       * Valida o users.id.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID do conteúdo.
       */
      if (
        !Number.isInteger(normalizedContentId) ||
        normalizedContentId <= 0
      ) {
        return res.status(400).json({
          message: "ID do conteúdo inválido.",
        });
      }

      /*
       * A ausência de registro representa not_started.
       *
       * Por isso, essa rota aceita apenas estados
       * que representam uma interação real do aluno.
       */
      const allowedStatuses = [
        "in_progress",
        "completed",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "O status deve ser in_progress ou completed.",
        });
      }

      /*
       * Valida o percentual recebido.
       */
      const normalizedProgressPercentage = Number(
        progress_percentage
      );

      if (
        !Number.isFinite(
          normalizedProgressPercentage
        ) ||
        normalizedProgressPercentage < 0 ||
        normalizedProgressPercentage > 100
      ) {
        return res.status(400).json({
          message:
            "O percentual de progresso deve estar entre 0 e 100.",
        });
      }

      /*
       * Normaliza e valida a posição do vídeo.
       *
       * O campo é opcional porque PDF, texto e aula
       * ao vivo não precisam de posição em segundos.
       */
      let normalizedLastPositionSeconds = null;

      if (
        last_position_seconds !== undefined &&
        last_position_seconds !== null &&
        last_position_seconds !== ""
      ) {
        normalizedLastPositionSeconds = Number(
          last_position_seconds
        );

        if (
          !Number.isInteger(
            normalizedLastPositionSeconds
          ) ||
          normalizedLastPositionSeconds < 0
        ) {
          return res.status(400).json({
            message:
              "A posição do conteúdo deve ser um número inteiro igual ou maior que zero.",
          });
        }
      }

      /*
       * Regras de consistência entre status
       * e percentual.
       *
       * Um conteúdo completed sempre possui 100%.
       */
      const finalProgressPercentage =
        status === "completed"
          ? 100
          : Math.min(
              normalizedProgressPercentage,
              99.99
            );

      /*
       * Abre uma conexão exclusiva porque a operação
       * envolve validação e escrita relacionadas.
       */
      connection =
        await db.promise().getConnection();

      await connection.beginTransaction();

      /*
       * Converte users.id em students.id.
       *
       * Usamos a própria conexão da transação para
       * manter toda a operação consistente.
       */
      const [studentRows] =
        await connection.query(
          `
            SELECT
              id
            FROM students
            WHERE user_id = ?
            LIMIT 1
          `,
          [normalizedUserId]
        );

      if (studentRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      const studentId = Number(
        studentRows[0].id
      );

      /*
       * Busca o conteúdo e descobre o curso real.
       *
       * O frontend não envia course_id porque ele
       * não deve controlar esse relacionamento.
       */
      const [contentRows] =
        await connection.query(
          `
            SELECT
              cc.id,
              cc.course_id,
              cc.title,
              cc.type,
              cc.status AS content_status,

              c.name AS course_title,
              c.status AS course_status

            FROM course_contents cc

            INNER JOIN courses c
              ON c.id = cc.course_id

            WHERE cc.id = ?

            LIMIT 1
          `,
          [normalizedContentId]
        );

      if (contentRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Conteúdo não encontrado.",
        });
      }

      const content = contentRows[0];
      const courseId = Number(content.course_id);

      /*
       * Impede progresso em conteúdos inativos,
       * arquivados ou em rascunho.
       */
      if (
        content.content_status !== "active"
      ) {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Não é possível atualizar o progresso de um conteúdo inativo.",
        });
      }

      /*
       * Impede progresso em cursos inativos.
       */
      if (content.course_status !== "active") {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Não é possível atualizar o progresso de um curso inativo.",
        });
      }

      /*
       * Somente os conteúdos educacionais da tabela
       * course_contents participam dessa progressão.
       *
       * Activities e assessments possuem fluxo próprio
       * por submissions e grades.
       */
      const allowedContentTypes = [
        "video",
        "pdf",
        "text",
        "live_class",
      ];

      if (
        !allowedContentTypes.includes(
          content.type
        )
      ) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Este tipo de conteúdo não utiliza progresso de consumo.",
        });
      }

      /*
       * Confirma que o aluno possui matrícula ativa
       * no curso ao qual o conteúdo pertence.
       */
      const [enrollmentRows] =
        await connection.query(
          `
            SELECT
              id
            FROM enrollments
            WHERE student_id = ?
              AND course_id = ?
              AND status = 'active'
            LIMIT 1
          `,
          [studentId, courseId]
        );

      if (enrollmentRows.length === 0) {
        await connection.rollback();

        return res.status(403).json({
          message:
            "O aluno não possui matrícula ativa neste curso.",
        });
      }

      /*
       * Busca e bloqueia o progresso existente.
       *
       * A chave única (student_id, content_id)
       * garante que exista no máximo um registro.
       */
      const [existingProgressRows] =
        await connection.query(
          `
            SELECT
              id,
              status,
              progress_percentage,
              last_position_seconds,
              started_at,
              completed_at,
              last_accessed_at
            FROM student_content_progress
            WHERE student_id = ?
              AND content_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [studentId, normalizedContentId]
        );

      let progressId;
      let operation;

      /*
       * Caso não exista progresso, cria o primeiro
       * registro de interação com o conteúdo.
       */
      if (existingProgressRows.length === 0) {
        const [insertResult] =
          await connection.query(
            `
              INSERT INTO student_content_progress
              (
                student_id,
                course_id,
                content_id,
                status,
                progress_percentage,
                last_position_seconds,
                started_at,
                completed_at,
                last_accessed_at,
                created_at,
                updated_at
              )
              VALUES
              (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                NOW(),
                CASE
                  WHEN ? = 'completed'
                  THEN NOW()
                  ELSE NULL
                END,
                NOW(),
                NOW(),
                NOW()
              )
            `,
            [
              studentId,
              courseId,
              normalizedContentId,
              status,
              finalProgressPercentage,
              normalizedLastPositionSeconds,
              status,
            ]
          );

        progressId = insertResult.insertId;
        operation = "created";
      } else {
        /*
         * Caso já exista, atualiza o mesmo registro.
         *
         * started_at não é alterado porque representa
         * o primeiro acesso do aluno ao conteúdo.
         */
        const existingProgress =
          existingProgressRows[0];

        progressId = existingProgress.id;
        operation = "updated";

        /*
         * Quando last_position_seconds não é enviado,
         * preservamos a posição anterior.
         */
        const finalLastPositionSeconds =
          normalizedLastPositionSeconds !== null
            ? normalizedLastPositionSeconds
            : existingProgress.last_position_seconds;

        await connection.query(
          `
            UPDATE student_content_progress
            SET
              status = ?,
              progress_percentage = ?,
              last_position_seconds = ?,

              completed_at =
                CASE
                  WHEN ? = 'completed'
                  THEN COALESCE(
                    completed_at,
                    NOW()
                  )
                  ELSE NULL
                END,

              last_accessed_at = NOW(),
              updated_at = NOW()

            WHERE id = ?
          `,
          [
            status,
            finalProgressPercentage,
            finalLastPositionSeconds,
            status,
            progressId,
          ]
        );
      }

      /*
       * Busca o registro final para devolver uma
       * resposta confiável ao frontend.
       */
      const [updatedProgressRows] =
        await connection.query(
          `
            SELECT
              scp.id,
              scp.student_id,
              scp.course_id,
              scp.content_id,
              scp.status,
              scp.progress_percentage,
              scp.last_position_seconds,
              scp.started_at,
              scp.completed_at,
              scp.last_accessed_at,
              scp.created_at,
              scp.updated_at,

              cc.title AS content_title,
              cc.type AS content_type,

              c.name AS course_title

            FROM student_content_progress scp

            INNER JOIN course_contents cc
              ON cc.id = scp.content_id

            INNER JOIN courses c
              ON c.id = scp.course_id

            WHERE scp.id = ?

            LIMIT 1
          `,
          [progressId]
        );

      const updatedProgress =
        updatedProgressRows[0];

      /*
       * Confirma todas as alterações.
       */
      await connection.commit();

      return res.status(200).json({
        message:
          status === "completed"
            ? "Conteúdo marcado como concluído."
            : "Progresso do conteúdo atualizado.",

        operation,

        progress: {
          ...updatedProgress,

          progress_percentage: Number(
            updatedProgress.progress_percentage
          ),

          last_position_seconds:
            updatedProgress.last_position_seconds !==
              null &&
            updatedProgress.last_position_seconds !==
              undefined
              ? Number(
                  updatedProgress.last_position_seconds
                )
              : null,
        },
      });
    } catch (error) {
      /*
       * Desfaz qualquer alteração caso uma etapa falhe.
       */
      if (connection) {
        await connection.rollback();
      }

      console.error(
        "Erro ao atualizar progresso do conteúdo:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao atualizar o progresso do conteúdo.",
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
  }
);

/*
 * ==========================================================
 * PROGRESSO DO ALUNO EM UM CURSO
 * ==========================================================
 *
 * Retorna o progresso completo do aluno em um curso específico.
 *
 * Funcionalidades:
 * - converte users.id em students.id;
 * - valida se o aluno possui matrícula ativa no curso;
 * - busca todos os conteúdos ativos do curso;
 * - recupera o progresso individual de cada conteúdo;
 * - considera conteúdos sem registro como "not_started";
 * - calcula automaticamente o resumo geral do curso;
 * - retorna dados prontos para alimentar:
 *   - CoursePlayer;
 *   - barra de progresso do curso;
 *   - gráfico de rosca de conteúdos;
 *   - StatCards;
 *   - futura página ProgressoAluno.
 *
 * Especificidades:
 * - utiliza LEFT JOIN para incluir conteúdos ainda não iniciados;
 * - não possui qualquer relação com atividades, avaliações ou notas;
 * - a porcentagem geral é calculada apenas sobre course_contents;
 * - a rota representa o progresso de um único curso.
 *
 * Próximas rotas relacionadas:
 * - GET /students/by-user/:userId/courses/:courseId/academic-progress
 *   → progresso acadêmico (atividades e avaliações).
 *
 * - GET /students/by-user/:userId/progress-overview
 *   → consolida conteúdos, progresso acadêmico e dashboards.
 */

app.get(
  "/students/by-user/:userId/courses/:courseId/progress",
  async (req, res) => {
    try {
      const { userId, courseId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedCourseId = Number(courseId);

      /*
       * ==========================================
       * Validação dos parâmetros.
       * ==========================================
       */

      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      if (
        !Number.isInteger(normalizedCourseId) ||
        normalizedCourseId <= 0
      ) {
        return res.status(400).json({
          message: "ID do curso inválido.",
        });
      }

      /*
       * ==========================================
       * Converte users.id -> students.id
       * ==========================================
       */

      const studentId =
        await getStudentIdByUserId(
          normalizedUserId
        );

      if (!studentId) {
        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      /*
       * ==========================================
       * Verifica matrícula ativa.
       * ==========================================
       */

      const [enrollment] =
        await db.promise().query(
          `
          SELECT id
          FROM enrollments
          WHERE student_id = ?
            AND course_id = ?
            AND status = 'active'
          LIMIT 1
          `,
          [
            studentId,
            normalizedCourseId,
          ]
        );

      if (enrollment.length === 0) {
        return res.status(403).json({
          message:
            "Aluno não possui matrícula ativa neste curso.",
        });
      }

      /*
       * ==========================================
       * Busca todos os conteúdos do curso.
       *
       * LEFT JOIN porque um conteúdo ainda pode
       * não possuir registro em
       * student_content_progress.
       * ==========================================
       */

      const [contents] =
        await db.promise().query(
          `
          SELECT

            cc.id,
            cc.course_id,
            cc.title,
            cc.type,
            cc.order_index,
            cc.is_required,

            scp.status AS progress_status,
            scp.progress_percentage,
            scp.last_position_seconds,
            scp.started_at,
            scp.completed_at,
            scp.last_accessed_at

          FROM course_contents cc

          LEFT JOIN student_content_progress scp
            ON scp.content_id = cc.id
           AND scp.student_id = ?

          WHERE cc.course_id = ?
            AND cc.status = 'active'

          ORDER BY
            cc.order_index ASC,
            cc.created_at ASC
          `,
          [
            studentId,
            normalizedCourseId,
          ]
        );

      /*
       * ==========================================
       * Calcula resumo.
       * ==========================================
       */

      const totalContents =
        contents.length;

      const completedContents =
        contents.filter(
          (content) =>
            content.progress_status ===
            "completed"
        ).length;

      const inProgressContents =
        contents.filter(
          (content) =>
            content.progress_status ===
            "in_progress"
        ).length;

      const notStartedContents =
        totalContents -
        completedContents -
        inProgressContents;

      const progressPercentage =
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
       * ==========================================
       * Normaliza conteúdos sem registro.
       * ==========================================
       */

      const normalizedContents =
        contents.map((content) => ({
          ...content,

          progress_status:
            content.progress_status ||
            "not_started",

          progress_percentage:
            Number(
              content.progress_percentage ??
                0
            ),
        }));

      /*
       * ==========================================
       * Resposta.
       * ==========================================
       */

      return res.status(200).json({
        summary: {
          total_contents:
            totalContents,

          completed_contents:
            completedContents,

          in_progress_contents:
            inProgressContents,

          not_started_contents:
            notStartedContents,

          progress_percentage:
            progressPercentage,
        },

        contents:
          normalizedContents,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar progresso do aluno:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar progresso do aluno.",

        error: error.message,
        code: error.code,
        sqlMessage:
          error.sqlMessage,
      });
    }
  }
);

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
  "/students/by-user/:userId/courses/:courseId/academic-progress",
  async (req, res) => {
    try {
      const { userId, courseId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedCourseId = Number(courseId);

      /*
       * Valida o users.id.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

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
  "/students/by-user/:userId/progress-overview",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o users.id.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
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
            e.enrolled_at

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




   /* ==========================================================
   ÁREA DO PROFESSOR
   Cursos, alunos, tarefas e conteúdos
   ========================================================== */


/* ==========================================================
   PROFESSOR — TAREFAS
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/tasks
 * Lista tarefas vinculadas aos cursos do professor.
 *
 * Observação:
 * Esta rota ainda utiliza atividades armazenadas em
 * course_contents com os tipos activity e assessment.
 *
 * Quando a migração para a tabela activities estiver
 * concluída, esta rota poderá ser substituída pela rota
 * GET /teacher/by-user/:userId/activities.
 */
app.get(
  "/teacher/by-user/:userId/tasks",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Busca atividades antigas registradas
       * em course_contents.
       */
      const [tasks] = await db.promise().query(
        `
          SELECT
            cc.id,
            cc.course_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.content_text,
            cc.order_index,
            cc.is_required,
            cc.status,
            cc.due_date,
            cc.created_at,
            cc.updated_at,

            c.name AS course_title,

            COUNT(DISTINCT sub.id) AS total_submissions,

            COALESCE(
              SUM(
                CASE
                  WHEN sub.status = 'pending_review'
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS pending_reviews,

            COALESCE(
              SUM(
                CASE
                  WHEN sub.status = 'graded'
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS graded_submissions

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          INNER JOIN course_contents cc
            ON cc.course_id = c.id

          LEFT JOIN submissions sub
            ON sub.content_id = cc.id

          WHERE t.user_id = ?
            AND cc.type IN ('activity', 'assessment')

          GROUP BY
            cc.id,
            cc.course_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.content_text,
            cc.order_index,
            cc.is_required,
            cc.status,
            cc.due_date,
            cc.created_at,
            cc.updated_at,
            c.name

          ORDER BY cc.created_at DESC
        `,
        [normalizedUserId]
      );

      return res.status(200).json(tasks);
    } catch (error) {
      console.error(
        "Erro ao buscar tarefas do professor:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar tarefas do professor.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — CURSOS
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/courses
 * Lista os cursos atribuídos ao professor.
 */
app.get(
  "/teacher/by-user/:userId/courses",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

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
 * GET /teacher/by-user/:userId/students
 * Lista os alunos matriculados nos cursos do professor.
 */
app.get(
  "/teacher/by-user/:userId/students",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

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
   PROFESSOR — LISTAGEM DE CONTEÚDOS
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/course-contents
 * Lista os conteúdos dos cursos do professor.
 *
 * Inclui apenas:
 * - vídeos;
 * - PDFs;
 * - textos;
 * - aulas ao vivo.
 *
 * Atividades e avaliações são carregadas separadamente
 * pela tabela activities.
 */
/*
 * ============================================================
 * PROFESSOR — BUSCAR CONTEÚDOS DOS CURSOS
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do professor;
 * - busca os cursos atribuídos a esse professor;
 * - retorna apenas conteúdos educacionais:
 *   - video;
 *   - pdf;
 *   - text;
 *   - live_class;
 * - não consulta submissions nem grades;
 * - não retorna atividades ou avaliações.
 */
app.get(
  "/teacher/by-user/:userId/course-contents",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Busca os conteúdos pertencentes aos cursos
       * atribuídos ao professor.
       *
       * course_contents não possui mais relação com:
       * - submissions;
       * - grades;
       * - atividades;
       * - avaliações.
       */
      const [contents] = await db.promise().query(
        `
          SELECT
            cc.id,
            cc.course_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.content_text,
            cc.order_index,
            cc.is_required,
            cc.status,
            cc.due_date,
            cc.created_at,
            cc.updated_at,

            c.name AS course_name,
            c.name AS course_title

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          INNER JOIN course_contents cc
            ON cc.course_id = c.id

          WHERE t.user_id = ?
            AND cc.type IN (
              'video',
              'pdf',
              'text',
              'live_class'
            )

          ORDER BY
            c.name ASC,
            cc.order_index ASC,
            cc.created_at DESC
        `,
        [normalizedUserId]
      );

      return res.status(200).json(contents);
    } catch (error) {
      console.error(
        "Erro ao buscar conteúdos do professor:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar conteúdos do professor.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — CRIAÇÃO DE CONTEÚDOS
   ========================================================== */

/**
 * POST /course-contents
 * Cria um conteúdo em um curso do professor.
 */
app.post("/course-contents", async (req, res) => {
  try {
    const {
      userId,
      course_id,
      title,
      description,
      type,
      content_text,
      content_url,
      order_index,
      is_required,
      status,
      due_date,
    } = req.body;

    const normalizedUserId = Number(userId);
    const normalizedCourseId = Number(course_id);

    /*
     * Valida o ID do professor.
     */
    if (
      !Number.isInteger(normalizedUserId) ||
      normalizedUserId <= 0
    ) {
      return res.status(400).json({
        message: "O usuário do professor é obrigatório.",
      });
    }

    /*
     * Valida os campos principais.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0 ||
      !title?.trim() ||
      !type
    ) {
      return res.status(400).json({
        message: "Curso, título e tipo são obrigatórios.",
      });
    }

    /*
     * Define os tipos permitidos para course_contents.
     */
    const allowedTypes = [
      "video",
      "pdf",
      "text",
      "live_class",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Tipo de conteúdo inválido.",
      });
    }

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "active";

    const allowedStatuses = [
      "active",
      "inactive",
      "draft",
      "archived",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status inválido.",
      });
    }

    /*
     * Garante que a ordem seja um número positivo.
     */
    const normalizedOrderIndex = Math.max(
      1,
      Number(order_index) || 1
    );

    /*
     * Converte diferentes representações em boolean.
     */
    const normalizedIsRequired =
      is_required === true ||
      is_required === 1 ||
      is_required === "1";

    /*
     * Descobre o teachers.id a partir do users.id.
     */
    const [teacherRows] = await db.promise().query(
      `
        SELECT id
        FROM teachers
        WHERE user_id = ?
        LIMIT 1
      `,
      [normalizedUserId]
    );

    if (teacherRows.length === 0) {
      return res.status(404).json({
        message: "Professor não encontrado.",
      });
    }

    const teacherId = teacherRows[0].id;

    /*
     * Confirma que o curso selecionado pertence
     * ao professor.
     */
    const [courseRows] = await db.promise().query(
      `
        SELECT id
        FROM courses
        WHERE id = ?
          AND teacher_id = ?
        LIMIT 1
      `,
      [normalizedCourseId, teacherId]
    );

    if (courseRows.length === 0) {
      return res.status(403).json({
        message:
          "O curso selecionado não pertence ao professor.",
      });
    }

    /*
     * Cria o conteúdo.
     */
    const [result] = await db.promise().query(
      `
        INSERT INTO course_contents
        (
          course_id,
          title,
          description,
          type,
          content_url,
          content_text,
          order_index,
          is_required,
          status,
          due_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedCourseId,
        title.trim(),
        description?.trim() || null,
        type,
        content_url?.trim() || null,
        content_text?.trim() || null,
        normalizedOrderIndex,
        normalizedIsRequired ? 1 : 0,
        normalizedStatus,
        due_date || null,
      ]
    );

    return res.status(201).json({
      message: "Conteúdo criado com sucesso.",

      content: {
        id: result.insertId,
        course_id: normalizedCourseId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        content_url: content_url?.trim() || null,
        content_text: content_text?.trim() || null,
        order_index: normalizedOrderIndex,
        is_required: normalizedIsRequired,
        status: normalizedStatus,
        due_date: due_date || null,
      },
    });
  } catch (error) {
    console.error("Erro ao criar conteúdo:", error);

    return res.status(500).json({
      message: "Erro ao criar conteúdo.",
      error: error.message,
    });
  }
});


/* ==========================================================
   PROFESSOR — ATUALIZAÇÃO DE CONTEÚDOS
   ========================================================== */

/**
 * PUT /course-contents/:id
 * Atualiza um conteúdo pertencente ao professor.
 */
app.put("/course-contents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      userId,
      course_id,
      title,
      description,
      type,
      content_text,
      content_url,
      order_index,
      is_required,
      status,
      due_date,
    } = req.body;

    const normalizedContentId = Number(id);
    const normalizedUserId = Number(userId);
    const normalizedCourseId = Number(course_id);

    /*
     * Valida o ID do conteúdo.
     */
    if (
      !Number.isInteger(normalizedContentId) ||
      normalizedContentId <= 0
    ) {
      return res.status(400).json({
        message: "ID do conteúdo inválido.",
      });
    }

    /*
     * Valida o ID do professor.
     */
    if (
      !Number.isInteger(normalizedUserId) ||
      normalizedUserId <= 0
    ) {
      return res.status(400).json({
        message: "O usuário do professor é obrigatório.",
      });
    }

    /*
     * Valida os campos principais.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0 ||
      !title?.trim() ||
      !type
    ) {
      return res.status(400).json({
        message: "Curso, título e tipo são obrigatórios.",
      });
    }

    const allowedTypes = [
      "video",
      "pdf",
      "text",
      "live_class",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Tipo de conteúdo inválido.",
      });
    }

    const normalizedStatus = status || "active";

    const allowedStatuses = [
      "active",
      "inactive",
      "draft",
      "archived",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status inválido.",
      });
    }

    const normalizedOrderIndex = Math.max(
      1,
      Number(order_index) || 1
    );

    const normalizedIsRequired =
      is_required === true ||
      is_required === 1 ||
      is_required === "1";

    /*
     * Descobre o professor.
     */
    const [teacherRows] = await db.promise().query(
      `
        SELECT id
        FROM teachers
        WHERE user_id = ?
        LIMIT 1
      `,
      [normalizedUserId]
    );

    if (teacherRows.length === 0) {
      return res.status(404).json({
        message: "Professor não encontrado.",
      });
    }

    const teacherId = teacherRows[0].id;

    /*
     * Confirma que o conteúdo pertence ao professor.
     */
    const [contentRows] = await db.promise().query(
      `
        SELECT cc.id
        FROM course_contents cc

        INNER JOIN courses c
          ON c.id = cc.course_id

        WHERE cc.id = ?
          AND c.teacher_id = ?

        LIMIT 1
      `,
      [normalizedContentId, teacherId]
    );

    if (contentRows.length === 0) {
      return res.status(404).json({
        message:
          "Conteúdo não encontrado ou não pertence ao professor.",
      });
    }

    /*
     * Confirma que o novo curso selecionado também
     * pertence ao mesmo professor.
     */
    const [courseRows] = await db.promise().query(
      `
        SELECT id
        FROM courses
        WHERE id = ?
          AND teacher_id = ?
        LIMIT 1
      `,
      [normalizedCourseId, teacherId]
    );

    if (courseRows.length === 0) {
      return res.status(403).json({
        message:
          "O curso selecionado não pertence ao professor.",
      });
    }

    /*
     * Atualiza o conteúdo.
     */
    const [result] = await db.promise().query(
      `
        UPDATE course_contents
        SET
          course_id = ?,
          title = ?,
          description = ?,
          type = ?,
          content_url = ?,
          content_text = ?,
          order_index = ?,
          is_required = ?,
          status = ?,
          due_date = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [
        normalizedCourseId,
        title.trim(),
        description?.trim() || null,
        type,
        content_url?.trim() || null,
        content_text?.trim() || null,
        normalizedOrderIndex,
        normalizedIsRequired ? 1 : 0,
        normalizedStatus,
        due_date || null,
        normalizedContentId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Conteúdo não encontrado.",
      });
    }

    return res.status(200).json({
      message: "Conteúdo atualizado com sucesso.",

      content: {
        id: normalizedContentId,
        course_id: normalizedCourseId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        content_url: content_url?.trim() || null,
        content_text: content_text?.trim() || null,
        order_index: normalizedOrderIndex,
        is_required: normalizedIsRequired,
        status: normalizedStatus,
        due_date: due_date || null,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar conteúdo:",
      error
    );

    return res.status(500).json({
      message: "Erro ao atualizar conteúdo.",
      error: error.message,
    });
  }
});


/* ==========================================================
   PROFESSOR — ARQUIVAMENTO DE CONTEÚDOS
   ========================================================== */

/**
 * DELETE /course-contents/:id
 * Arquiva um conteúdo sem removê-lo do banco de dados.
 */
app.delete(
  "/course-contents/:id",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const normalizedContentId = Number(id);
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do conteúdo.
       */
      if (
        !Number.isInteger(normalizedContentId) ||
        normalizedContentId <= 0
      ) {
        return res.status(400).json({
          message: "ID do conteúdo inválido.",
        });
      }

      /*
       * Valida o ID do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "O usuário do professor é obrigatório.",
        });
      }

      /*
       * Descobre o professor.
       */
      const [teacherRows] = await db.promise().query(
        `
          SELECT id
          FROM teachers
          WHERE user_id = ?
          LIMIT 1
        `,
        [normalizedUserId]
      );

      if (teacherRows.length === 0) {
        return res.status(404).json({
          message: "Professor não encontrado.",
        });
      }

      const teacherId = teacherRows[0].id;

      /*
       * Confirma que o conteúdo pertence ao professor
       * e consulta seu status atual.
       */
      const [contentRows] = await db.promise().query(
        `
          SELECT
            cc.id,
            cc.status
          FROM course_contents cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          WHERE cc.id = ?
            AND c.teacher_id = ?

          LIMIT 1
        `,
        [normalizedContentId, teacherId]
      );

      if (contentRows.length === 0) {
        return res.status(404).json({
          message:
            "Conteúdo não encontrado ou não pertence ao professor.",
        });
      }

      /*
       * Evita arquivar novamente um conteúdo
       * que já está arquivado.
       */
      if (contentRows[0].status === "archived") {
        return res.status(409).json({
          message: "Este conteúdo já está arquivado.",
        });
      }

      /*
       * Realiza o soft delete.
       */
      const [result] = await db.promise().query(
        `
          UPDATE course_contents
          SET
            status = 'archived',
            updated_at = NOW()
          WHERE id = ?
        `,
        [normalizedContentId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Não foi possível localizar o conteúdo para arquivamento.",
        });
      }

      return res.status(200).json({
        message: "Conteúdo arquivado com sucesso.",
        id: normalizedContentId,
        status: "archived",
      });
    } catch (error) {
      console.error(
        "Erro ao arquivar conteúdo:",
        error
      );

      return res.status(500).json({
        message: "Erro ao arquivar conteúdo.",
        error: error.message,
      });
    }
  }
);


/* ==========================================================
   FIM DA PARTE 3
   A próxima seção contém atividades, avaliações,
   submissões e correção do professor.
   ========================================================== */

   /* ==========================================================
   PROFESSOR — ATIVIDADES E AVALIAÇÕES
   Criação, listagem e desativação
   ========================================================== */


/* ==========================================================
   PROFESSOR — CRIAÇÃO DE ATIVIDADES
   ========================================================== */

/**
 * POST /activities
 * Cria uma atividade ou avaliação com suas questões.
 *
 * A operação utiliza uma transação para garantir que:
 * - a atividade;
 * - as questões;
 * - e as alternativas
 *
 * sejam salvas juntas.
 */
app.post("/activities", async (req, res) => {
  let connection;

  try {
    const {
      userId,
      course_id,
      activity_kind,
      title,
      description,
      type,
      due_date,
      max_score,
      status,
      questions,
    } = req.body;

    const normalizedUserId = Number(userId);
    const normalizedCourseId = Number(course_id);

    /*
     * Valida o ID do usuário do professor.
     */
    if (
      !Number.isInteger(normalizedUserId) ||
      normalizedUserId <= 0
    ) {
      return res.status(400).json({
        message: "O usuário do professor é obrigatório.",
      });
    }

    /*
     * Valida o ID do curso.
     */
    if (
      !Number.isInteger(normalizedCourseId) ||
      normalizedCourseId <= 0
    ) {
      return res.status(400).json({
        message: "Selecione um curso válido.",
      });
    }

    /*
     * Valida o título da atividade.
     */
    if (!title?.trim()) {
      return res.status(400).json({
        message: "O título é obrigatório.",
      });
    }

    /*
     * Define se o registro representa:
     * - uma atividade;
     * - ou uma prova.
     */
    const allowedActivityKinds = [
      "activity",
      "exam",
    ];

    if (!allowedActivityKinds.includes(activity_kind)) {
      return res.status(400).json({
        message: "Escolha se é uma atividade ou uma prova.",
      });
    }

    /*
     * Define o formato geral da atividade.
     */
    const allowedActivityTypes = [
      "mixed",
      "quiz",
      "text",
      "upload",
    ];

    if (!allowedActivityTypes.includes(type)) {
      return res.status(400).json({
        message: "Formato da atividade inválido.",
      });
    }

    /*
     * Exige pelo menos uma questão.
     */
    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message: "Adicione pelo menos uma questão.",
      });
    }

    /*
     * Normaliza a nota máxima.
     */
    const normalizedMaxScore =
      Number(max_score) > 0
        ? Number(max_score)
        : 10;

    /*
     * Normaliza e valida o status.
     */
    const normalizedStatus = status || "active";

    const allowedStatuses = [
      "active",
      "inactive",
      "draft",
      "archived",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status da atividade inválido.",
      });
    }

    /*
     * Abre uma conexão exclusiva e inicia a transação.
     */
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    /*
     * Descobre o teachers.id a partir do users.id.
     *
     * Também confirma que o professor está ativo.
     */
    const [teacherRows] = await connection.query(
      `
        SELECT id
        FROM teachers
        WHERE user_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [normalizedUserId]
    );

    if (teacherRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Professor não encontrado ou inativo.",
      });
    }

    const teacherId = teacherRows[0].id;

    /*
     * Confirma que o curso:
     * - existe;
     * - está ativo;
     * - pertence ao professor.
     */
    const [courseRows] = await connection.query(
      `
        SELECT
          id,
          name
        FROM courses
        WHERE id = ?
          AND teacher_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [normalizedCourseId, teacherId]
    );

    if (courseRows.length === 0) {
      await connection.rollback();

      return res.status(403).json({
        message:
          "Você não possui permissão para cadastrar atividades neste curso.",
      });
    }

    /*
     * Valida todas as questões antes de realizar
     * qualquer inserção no banco de dados.
     */
    for (
      let questionIndex = 0;
      questionIndex < questions.length;
      questionIndex++
    ) {
      const question = questions[questionIndex];
      const displayedQuestionNumber = questionIndex + 1;

      /*
       * Valida o enunciado.
       */
      if (!question.question_text?.trim()) {
        await connection.rollback();

        return res.status(400).json({
          message:
            `O enunciado da questão ${displayedQuestionNumber} é obrigatório.`,
        });
      }

      /*
       * Valida o tipo da questão.
       */
      const allowedQuestionTypes = [
        "multiple_choice",
        "text",
        "upload",
      ];

      if (
        !allowedQuestionTypes.includes(
          question.question_type
        )
      ) {
        await connection.rollback();

        return res.status(400).json({
          message:
            `O tipo da questão ${displayedQuestionNumber} é inválido.`,
        });
      }

      /*
       * Valida a pontuação da questão.
       */
      if (
        question.points !== undefined &&
        question.points !== null &&
        Number(question.points) <= 0
      ) {
        await connection.rollback();

        return res.status(400).json({
          message:
            `A pontuação da questão ${displayedQuestionNumber} deve ser maior que zero.`,
        });
      }

      /*
       * Aplica validações específicas às questões
       * de múltipla escolha.
       */
      if (
        question.question_type === "multiple_choice"
      ) {
        /*
         * Exige pelo menos duas alternativas.
         */
        if (
          !Array.isArray(question.options) ||
          question.options.length < 2
        ) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `A questão ${displayedQuestionNumber} precisa ter pelo menos duas alternativas.`,
          });
        }

        /*
         * Confirma que nenhuma alternativa está vazia.
         */
        const hasEmptyOption = question.options.some(
          (option) =>
            !option.option_text?.trim()
        );

        if (hasEmptyOption) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `Preencha todas as alternativas da questão ${displayedQuestionNumber}.`,
          });
        }

        /*
         * Exige pelo menos uma alternativa correta.
         */
        const hasCorrectOption = question.options.some(
          (option) =>
            option.is_correct === true ||
            option.is_correct === 1 ||
            option.is_correct === "1"
        );

        if (!hasCorrectOption) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `Marque pelo menos uma alternativa correta na questão ${displayedQuestionNumber}.`,
          });
        }
      }
    }

    /*
     * Cria o registro principal da atividade.
     */
    const [activityResult] = await connection.query(
      `
        INSERT INTO activities
        (
          course_id,
          activity_kind,
          title,
          description,
          type,
          due_date,
          max_score,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        normalizedCourseId,
        activity_kind,
        title.trim(),
        description?.trim() || null,
        type,
        due_date || null,
        normalizedMaxScore,
        normalizedStatus,
      ]
    );

    const activityId = activityResult.insertId;

    /*
     * Cria cada questão da atividade.
     */
    for (
      let questionIndex = 0;
      questionIndex < questions.length;
      questionIndex++
    ) {
      const question = questions[questionIndex];

      const normalizedQuestionPoints =
        Number(question.points) > 0
          ? Number(question.points)
          : 1;

      const [questionResult] =
        await connection.query(
          `
            INSERT INTO activity_questions
            (
              activity_id,
              question_text,
              question_type,
              points,
              order_index
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            activityId,
            question.question_text.trim(),
            question.question_type,
            normalizedQuestionPoints,
            questionIndex + 1,
          ]
        );

      const questionId = questionResult.insertId;

      /*
       * Cria as alternativas das questões
       * de múltipla escolha.
       */
      if (
        question.question_type === "multiple_choice"
      ) {
        for (const option of question.options) {
          const normalizedIsCorrect =
            option.is_correct === true ||
            option.is_correct === 1 ||
            option.is_correct === "1";

          await connection.query(
            `
              INSERT INTO activity_options
              (
                question_id,
                option_text,
                is_correct
              )
              VALUES (?, ?, ?)
            `,
            [
              questionId,
              option.option_text.trim(),
              normalizedIsCorrect ? 1 : 0,
            ]
          );
        }
      }
    }

    /*
     * Confirma a criação da atividade,
     * das questões e das alternativas.
     */
    await connection.commit();

    return res.status(201).json({
      message:
        activity_kind === "exam"
          ? "Avaliação criada com sucesso."
          : "Atividade criada com sucesso.",

      activity: {
        id: activityId,
        course_id: normalizedCourseId,
        course_title: courseRows[0].name,
        activity_kind,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        due_date: due_date || null,
        max_score: normalizedMaxScore,
        status: normalizedStatus,
        total_submissions: 0,
        pending_reviews: 0,
        graded_submissions: 0,
      },
    });
  } catch (error) {
    /*
     * Desfaz todas as inserções caso qualquer
     * etapa da criação falhe.
     */
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Erro completo ao criar atividade:",
      error
    );

    return res.status(500).json({
      message: "Erro ao criar atividade.",
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
   PROFESSOR — LISTAGEM DE ATIVIDADES
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/activities
 * Lista as atividades e avaliações dos cursos do professor.
 *
 * Também retorna:
 * - total de envios;
 * - envios pendentes;
 * - envios corrigidos.
 */
app.get(
  "/teacher/by-user/:userId/activities",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Busca as atividades pertencentes aos cursos
       * do professor.
       */
      const [activities] = await db.promise().query(
        `
          SELECT
            a.id,
            a.course_id,
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

            c.name AS course_title,

            COUNT(DISTINCT sub.id) AS total_submissions,

            COUNT(
              DISTINCT CASE
                WHEN sub.status = 'pending_review'
                THEN sub.id
              END
            ) AS pending_reviews,

            COUNT(
              DISTINCT CASE
                WHEN sub.status = 'graded'
                THEN sub.id
              END
            ) AS graded_submissions

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          INNER JOIN activities a
            ON a.course_id = c.id

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id

          WHERE t.user_id = ?

          GROUP BY
            a.id,
            a.course_id,
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
            c.name

          ORDER BY a.created_at DESC
        `,
        [normalizedUserId]
      );

      return res.status(200).json(activities);
    } catch (error) {
      console.error(
        "Erro ao buscar atividades do professor:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar atividades do professor.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — EDIÇÃO DE ATIVIDADES E AVALIAÇÕES
   ========================================================== */

/*
 * ============================================================
 * PROFESSOR — BUSCAR ATIVIDADE COMPLETA PARA EDIÇÃO
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do professor;
 * - recebe o ID da atividade ou avaliação;
 * - confirma que o professor existe;
 * - confirma que a atividade pertence a um curso do professor;
 * - busca os dados gerais da atividade;
 * - busca todas as questões;
 * - busca as alternativas das questões objetivas;
 * - devolve um objeto completo para preencher o ActivityModal.
 *
 * Essa rota atende tanto:
 * - activity_kind = "activity";
 * - activity_kind = "exam".
 */
app.get(
  "/teacher/by-user/:userId/activities/:activityId/full",
  async (req, res) => {
    try {
      const { userId, activityId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedActivityId = Number(activityId);

      /*
       * Valida o users.id do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID da atividade.
       */
      if (
        !Number.isInteger(normalizedActivityId) ||
        normalizedActivityId <= 0
      ) {
        return res.status(400).json({
          message: "ID da atividade inválido.",
        });
      }

      /*
       * Descobre o teachers.id a partir do users.id.
       */
      const [teacherRows] = await db.promise().query(
        `
          SELECT
            id,
            user_id
          FROM teachers
          WHERE user_id = ?
          LIMIT 1
        `,
        [normalizedUserId]
      );

      if (teacherRows.length === 0) {
        return res.status(404).json({
          message: "Professor não encontrado.",
        });
      }

      const teacherId = teacherRows[0].id;

      /*
       * Busca a atividade e confirma que ela pertence
       * a um curso do professor.
       *
       * Também conta quantas entregas já existem.
       */
      const [activityRows] = await db.promise().query(
        `
          SELECT
            a.id,
            a.course_id,
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

            c.name AS course_title,

            COUNT(DISTINCT sub.id) AS total_submissions

          FROM activities a

          INNER JOIN courses c
            ON c.id = a.course_id

          LEFT JOIN submissions sub
            ON sub.activity_id = a.id

          WHERE a.id = ?
            AND c.teacher_id = ?

          GROUP BY
            a.id,
            a.course_id,
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
            c.name

          LIMIT 1
        `,
        [normalizedActivityId, teacherId]
      );

      if (activityRows.length === 0) {
        return res.status(404).json({
          message:
            "Atividade não encontrada ou não pertence ao professor.",
        });
      }

      const activity = activityRows[0];

      /*
       * Busca todas as questões da atividade,
       * respeitando a ordem definida no cadastro.
       */
      const [questionRows] = await db.promise().query(
        `
          SELECT
            id,
            activity_id,
            question_text,
            question_type,
            points,
            order_index,
            created_at,
            updated_at
          FROM activity_questions
          WHERE activity_id = ?
          ORDER BY order_index ASC, id ASC
        `,
        [normalizedActivityId]
      );

      /*
       * Busca todas as alternativas de todas as questões
       * pertencentes à atividade.
       *
       * A condição aq.activity_id também reforça que
       * somente alternativas dessa atividade serão lidas.
       */
      const [optionRows] = await db.promise().query(
        `
          SELECT
            ao.id,
            ao.question_id,
            ao.option_text,
            ao.is_correct,
            ao.created_at
          FROM activity_options ao

          INNER JOIN activity_questions aq
            ON aq.id = ao.question_id

          WHERE aq.activity_id = ?

          ORDER BY
            aq.order_index ASC,
            aq.id ASC,
            ao.id ASC
        `,
        [normalizedActivityId]
      );

      /*
       * Agrupa as alternativas pelo question_id.
       */
      const optionsByQuestionId = new Map();

      for (const option of optionRows) {
        const questionId = Number(option.question_id);

        if (!optionsByQuestionId.has(questionId)) {
          optionsByQuestionId.set(questionId, []);
        }

        optionsByQuestionId.get(questionId).push({
          id: option.id,
          question_id: option.question_id,
          option_text: option.option_text,
          is_correct: Boolean(option.is_correct),
          created_at: option.created_at,
        });
      }

      /*
       * Monta as questões no formato esperado
       * pelo ActivityModal.
       */
      const questions = questionRows.map((question) => ({
        id: question.id,
        activity_id: question.activity_id,
        question_text: question.question_text,
        question_type: question.question_type,
        points: Number(question.points),
        order_index: question.order_index,
        created_at: question.created_at,
        updated_at: question.updated_at,

        options:
          optionsByQuestionId.get(Number(question.id)) || [],
      }));

      /*
       * Devolve a atividade completa.
       */
      return res.status(200).json({
        id: activity.id,
        course_id: activity.course_id,
        course_title: activity.course_title,
        activity_kind: activity.activity_kind,
        title: activity.title,
        description: activity.description,
        type: activity.type,
        due_date: activity.due_date,
        max_score: Number(activity.max_score),
        order_index: activity.order_index,
        is_required: Boolean(activity.is_required),
        status: activity.status,
        created_at: activity.created_at,
        updated_at: activity.updated_at,
        total_submissions: Number(
          activity.total_submissions
        ),
        questions,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar atividade completa:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao buscar os dados completos da atividade.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/*
 * ============================================================
 * PROFESSOR — ATUALIZAR ATIVIDADE, QUESTÕES E ALTERNATIVAS
 * ============================================================
 *
 * Funcionalidade:
 * - recebe o users.id do professor;
 * - recebe o ID da atividade ou avaliação;
 * - confirma que a atividade pertence ao professor;
 * - confirma que o curso selecionado pertence ao professor;
 * - valida os dados gerais;
 * - valida questões e alternativas;
 * - atualiza os dados gerais da atividade;
 * - quando não existem entregas:
 *     - remove as questões antigas;
 *     - recria as questões;
 *     - recria as alternativas;
 * - quando já existem entregas:
 *     - permite alterar apenas dados gerais;
 *     - bloqueia modificações nas questões e alternativas.
 *
 * Essa rota atende tanto:
 * - activity_kind = "activity";
 * - activity_kind = "exam".
 */
app.put(
  "/teacher/by-user/:userId/activities/:activityId",
  async (req, res) => {
    let connection;

    try {
      const { userId, activityId } = req.params;

      const {
        course_id,
        activity_kind,
        title,
        description,
        type,
        due_date,
        max_score,
        order_index,
        is_required,
        status,
        questions,
      } = req.body;

      const normalizedUserId = Number(userId);
      const normalizedActivityId = Number(activityId);
      const normalizedCourseId = Number(course_id);

      /*
       * Valida o users.id do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID da atividade.
       */
      if (
        !Number.isInteger(normalizedActivityId) ||
        normalizedActivityId <= 0
      ) {
        return res.status(400).json({
          message: "ID da atividade inválido.",
        });
      }

      /*
       * Valida o ID do curso.
       */
      if (
        !Number.isInteger(normalizedCourseId) ||
        normalizedCourseId <= 0
      ) {
        return res.status(400).json({
          message: "Selecione um curso válido.",
        });
      }

      /*
       * Valida o título.
       */
      if (!title?.trim()) {
        return res.status(400).json({
          message: "O título é obrigatório.",
        });
      }

      /*
       * Valida o activity_kind.
       */
      const allowedActivityKinds = [
        "activity",
        "exam",
      ];

      if (
        !allowedActivityKinds.includes(
          activity_kind
        )
      ) {
        return res.status(400).json({
          message:
            "Escolha se o registro é uma atividade ou uma avaliação.",
        });
      }

      /*
       * Valida o formato geral da atividade.
       */
      const allowedActivityTypes = [
        "mixed",
        "quiz",
        "text",
        "upload",
      ];

      if (!allowedActivityTypes.includes(type)) {
        return res.status(400).json({
          message: "Formato da atividade inválido.",
        });
      }

      /*
       * Valida o status.
       */
      const normalizedStatus =
        status || "active";

      const allowedStatuses = [
        "active",
        "inactive",
        "draft",
        "archived",
      ];

      if (
        !allowedStatuses.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          message: "Status da atividade inválido.",
        });
      }

      /*
       * Valida a nota máxima.
       */
      const normalizedMaxScore =
        Number(max_score);

      if (
        !Number.isFinite(normalizedMaxScore) ||
        normalizedMaxScore <= 0
      ) {
        return res.status(400).json({
          message:
            "A nota máxima deve ser maior que zero.",
        });
      }

      /*
       * Normaliza a ordem da atividade.
       *
       * Caso o frontend não envie order_index,
       * a rota mantém o valor atual posteriormente.
       */
      const normalizedOrderIndex =
        order_index !== undefined &&
        order_index !== null &&
        order_index !== ""
          ? Number(order_index)
          : null;

      if (
        normalizedOrderIndex !== null &&
        (
          !Number.isInteger(normalizedOrderIndex) ||
          normalizedOrderIndex <= 0
        )
      ) {
        return res.status(400).json({
          message:
            "A ordem da atividade deve ser um número inteiro maior que zero.",
        });
      }

      /*
       * Normaliza o campo obrigatório.
       *
       * Se não for enviado, o valor atual será mantido.
       */
      let normalizedIsRequired = null;

      if (
        is_required !== undefined &&
        is_required !== null
      ) {
        normalizedIsRequired =
          is_required === true ||
          is_required === 1 ||
          is_required === "1" ||
          is_required === "true"
            ? 1
            : 0;
      }

      /*
       * O modal sempre envia as questões completas.
       */
      if (
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        return res.status(400).json({
          message:
            "A atividade precisa possuir pelo menos uma questão.",
        });
      }

      /*
       * Valida todas as questões antes de abrir
       * a transação.
       */
      for (
        let questionIndex = 0;
        questionIndex < questions.length;
        questionIndex++
      ) {
        const question =
          questions[questionIndex];

        const displayedQuestionNumber =
          questionIndex + 1;

        /*
         * Valida o enunciado.
         */
        if (!question.question_text?.trim()) {
          return res.status(400).json({
            message:
              `O enunciado da questão ${displayedQuestionNumber} é obrigatório.`,
          });
        }

        /*
         * Valida o tipo da questão.
         */
        const allowedQuestionTypes = [
          "multiple_choice",
          "text",
          "upload",
        ];

        if (
          !allowedQuestionTypes.includes(
            question.question_type
          )
        ) {
          return res.status(400).json({
            message:
              `O tipo da questão ${displayedQuestionNumber} é inválido.`,
          });
        }

        /*
         * Valida a pontuação.
         */
        const normalizedQuestionPoints =
          Number(question.points);

        if (
          !Number.isFinite(
            normalizedQuestionPoints
          ) ||
          normalizedQuestionPoints <= 0
        ) {
          return res.status(400).json({
            message:
              `A pontuação da questão ${displayedQuestionNumber} deve ser maior que zero.`,
          });
        }

        /*
         * Valida questões de múltipla escolha.
         */
        if (
          question.question_type ===
          "multiple_choice"
        ) {
          if (
            !Array.isArray(question.options) ||
            question.options.length < 2
          ) {
            return res.status(400).json({
              message:
                `A questão ${displayedQuestionNumber} precisa ter pelo menos duas alternativas.`,
            });
          }

          const hasEmptyOption =
            question.options.some(
              (option) =>
                !option.option_text?.trim()
            );

          if (hasEmptyOption) {
            return res.status(400).json({
              message:
                `Preencha todas as alternativas da questão ${displayedQuestionNumber}.`,
            });
          }

          const hasCorrectOption =
            question.options.some(
              (option) =>
                option.is_correct === true ||
                option.is_correct === 1 ||
                option.is_correct === "1" ||
                option.is_correct === "true"
            );

          if (!hasCorrectOption) {
            return res.status(400).json({
              message:
                `Marque pelo menos uma alternativa correta na questão ${displayedQuestionNumber}.`,
            });
          }
        }
      }

      /*
       * Abre uma conexão exclusiva e inicia
       * a transação.
       */
      connection =
        await db.promise().getConnection();

      await connection.beginTransaction();

      /*
       * Descobre o teachers.id a partir
       * do users.id.
       */
      const [teacherRows] =
        await connection.query(
          `
            SELECT
              id
            FROM teachers
            WHERE user_id = ?
            LIMIT 1
          `,
          [normalizedUserId]
        );

      if (teacherRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Professor não encontrado.",
        });
      }

      const teacherId = teacherRows[0].id;

      /*
       * Busca a atividade e bloqueia seu registro
       * durante a transação.
       *
       * Também confirma que ela pertence ao professor.
       */
      const [activityRows] =
        await connection.query(
          `
            SELECT
              a.id,
              a.course_id,
              a.activity_kind,
              a.title,
              a.description,
              a.type,
              a.due_date,
              a.max_score,
              a.order_index,
              a.is_required,
              a.status,

              c.name AS course_title

            FROM activities a

            INNER JOIN courses c
              ON c.id = a.course_id

            WHERE a.id = ?
              AND c.teacher_id = ?

            LIMIT 1

            FOR UPDATE
          `,
          [
            normalizedActivityId,
            teacherId,
          ]
        );

      if (activityRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Atividade não encontrada ou não pertence ao professor.",
        });
      }

      const currentActivity =
        activityRows[0];

      /*
       * Impede a transformação de uma atividade
       * em avaliação, ou vice-versa.
       *
       * O frontend já bloqueia essa troca, mas
       * a proteção também precisa existir no backend.
       */
      if (
        currentActivity.activity_kind !==
        activity_kind
      ) {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Não é permitido transformar uma atividade em avaliação, ou uma avaliação em atividade.",
        });
      }

      /*
       * Confirma que o curso selecionado:
       * - existe;
       * - pertence ao professor.
       *
       * Não exige curso ativo porque uma atividade
       * antiga pode estar vinculada a um curso que
       * posteriormente foi inativado.
       */
      const [courseRows] =
        await connection.query(
          `
            SELECT
              id,
              name,
              status
            FROM courses
            WHERE id = ?
              AND teacher_id = ?
            LIMIT 1
          `,
          [
            normalizedCourseId,
            teacherId,
          ]
        );

      if (courseRows.length === 0) {
        await connection.rollback();

        return res.status(403).json({
          message:
            "Você não possui permissão para utilizar este curso.",
        });
      }

      /*
       * Verifica se a atividade já possui entregas.
       */
      const [submissionCountRows] =
        await connection.query(
          `
            SELECT
              COUNT(*) AS total
            FROM submissions
            WHERE activity_id = ?
          `,
          [normalizedActivityId]
        );

      const totalSubmissions = Number(
        submissionCountRows[0].total
      );

      /*
       * Busca a estrutura atual da atividade.
       *
       * Ela será usada para detectar modificações
       * nas questões quando já existirem envios.
       */
      const [currentQuestionRows] =
        await connection.query(
          `
            SELECT
              id,
              question_text,
              question_type,
              points,
              order_index
            FROM activity_questions
            WHERE activity_id = ?
            ORDER BY order_index ASC, id ASC
          `,
          [normalizedActivityId]
        );

      const [currentOptionRows] =
        await connection.query(
          `
            SELECT
              ao.id,
              ao.question_id,
              ao.option_text,
              ao.is_correct
            FROM activity_options ao

            INNER JOIN activity_questions aq
              ON aq.id = ao.question_id

            WHERE aq.activity_id = ?

            ORDER BY
              aq.order_index ASC,
              aq.id ASC,
              ao.id ASC
          `,
          [normalizedActivityId]
        );

      /*
       * Monta um mapa com as alternativas atuais.
       */
      const currentOptionsByQuestionId =
        new Map();

      for (const option of currentOptionRows) {
        const questionId = Number(
          option.question_id
        );

        if (
          !currentOptionsByQuestionId.has(
            questionId
          )
        ) {
          currentOptionsByQuestionId.set(
            questionId,
            []
          );
        }

        currentOptionsByQuestionId
          .get(questionId)
          .push({
            id: Number(option.id),
            option_text:
              option.option_text.trim(),
            is_correct: Boolean(
              option.is_correct
            ),
          });
      }

      /*
       * Normaliza a estrutura atual do banco.
       */
      const currentQuestionStructure =
        currentQuestionRows.map(
          (question, index) => ({
            id: Number(question.id),

            question_text:
              question.question_text.trim(),

            question_type:
              question.question_type,

            points: Number(question.points),

            order_index: index + 1,

            options:
              question.question_type ===
              "multiple_choice"
                ? currentOptionsByQuestionId.get(
                    Number(question.id)
                  ) || []
                : [],
          })
        );

      /*
       * Normaliza a estrutura recebida pelo frontend.
       */
      const receivedQuestionStructure =
        questions.map(
          (question, index) => ({
            id:
              question.id !== undefined &&
              question.id !== null &&
              question.id !== ""
                ? Number(question.id)
                : null,

            question_text:
              question.question_text.trim(),

            question_type:
              question.question_type,

            points: Number(question.points),

            order_index: index + 1,

            options:
              question.question_type ===
              "multiple_choice"
                ? question.options.map(
                    (option) => ({
                      id:
                        option.id !==
                          undefined &&
                        option.id !== null &&
                        option.id !== ""
                          ? Number(option.id)
                          : null,

                      option_text:
                        option.option_text.trim(),

                      is_correct:
                        option.is_correct ===
                          true ||
                        option.is_correct === 1 ||
                        option.is_correct ===
                          "1" ||
                        option.is_correct ===
                          "true",
                    })
                  )
                : [],
          })
        );

      /*
       * Compara a estrutura atual com a estrutura
       * recebida.
       *
       * Como o GET /full devolve os IDs, o modal
       * consegue reenviá-los durante a edição.
       */
      const questionsWereChanged =
        JSON.stringify(
          currentQuestionStructure
        ) !==
        JSON.stringify(
          receivedQuestionStructure
        );

      /*
       * Caso existam envios, impede alterações
       * em questões e alternativas.
       *
       * Isso protege os relacionamentos:
       * - submission_answers.question_id;
       * - submission_answers.option_id.
       */
      if (
        totalSubmissions > 0 &&
        questionsWereChanged
      ) {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Esta atividade já possui envios. Você pode alterar os dados gerais, mas não pode modificar questões ou alternativas.",
          total_submissions:
            totalSubmissions,
        });
      }

      /*
       * Mantém os valores atuais quando os campos
       * opcionais não forem enviados.
       */
      const finalOrderIndex =
        normalizedOrderIndex ??
        currentActivity.order_index;

      const finalIsRequired =
        normalizedIsRequired ??
        currentActivity.is_required;

      /*
       * Atualiza os dados gerais da atividade.
       */
      const [activityUpdateResult] =
        await connection.query(
          `
            UPDATE activities
            SET
              course_id = ?,
              title = ?,
              description = ?,
              type = ?,
              due_date = ?,
              max_score = ?,
              order_index = ?,
              is_required = ?,
              status = ?,
              updated_at = NOW()
            WHERE id = ?
          `,
          [
            normalizedCourseId,
            title.trim(),
            description?.trim() || null,
            type,
            due_date || null,
            normalizedMaxScore,
            finalOrderIndex,
            finalIsRequired,
            normalizedStatus,
            normalizedActivityId,
          ]
        );

      if (
        activityUpdateResult.affectedRows === 0
      ) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Não foi possível atualizar a atividade.",
        });
      }

      /*
       * Se não existem entregas, a estrutura pode
       * ser recriada com segurança.
       *
       * Como activity_options possui ON DELETE CASCADE
       * em relação a activity_questions, apagar as
       * questões também apaga as alternativas.
       */
      if (totalSubmissions === 0) {
        await connection.query(
          `
            DELETE FROM activity_questions
            WHERE activity_id = ?
          `,
          [normalizedActivityId]
        );

        /*
         * Recria cada questão.
         */
        for (
          let questionIndex = 0;
          questionIndex < questions.length;
          questionIndex++
        ) {
          const question =
            questions[questionIndex];

          const [questionResult] =
            await connection.query(
              `
                INSERT INTO activity_questions
                (
                  activity_id,
                  question_text,
                  question_type,
                  points,
                  order_index,
                  created_at,
                  updated_at
                )
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
              `,
              [
                normalizedActivityId,
                question.question_text.trim(),
                question.question_type,
                Number(question.points),
                questionIndex + 1,
              ]
            );

          const newQuestionId =
            questionResult.insertId;

          /*
           * Recria as alternativas das questões
           * de múltipla escolha.
           */
          if (
            question.question_type ===
            "multiple_choice"
          ) {
            for (const option of question.options) {
              const normalizedIsCorrect =
                option.is_correct === true ||
                option.is_correct === 1 ||
                option.is_correct === "1" ||
                option.is_correct === "true";

              await connection.query(
                `
                  INSERT INTO activity_options
                  (
                    question_id,
                    option_text,
                    is_correct,
                    created_at
                  )
                  VALUES (?, ?, ?, NOW())
                `,
                [
                  newQuestionId,
                  option.option_text.trim(),
                  normalizedIsCorrect ? 1 : 0,
                ]
              );
            }
          }
        }
      }

      /*
       * Confirma todas as alterações.
       */
      await connection.commit();

      return res.status(200).json({
        message:
          activity_kind === "exam"
            ? "Avaliação atualizada com sucesso."
            : "Atividade atualizada com sucesso.",

        activity: {
          id: normalizedActivityId,
          course_id: normalizedCourseId,
          course_title: courseRows[0].name,
          activity_kind,
          title: title.trim(),
          description:
            description?.trim() || null,
          type,
          due_date: due_date || null,
          max_score: normalizedMaxScore,
          order_index: finalOrderIndex,
          is_required: Boolean(
            finalIsRequired
          ),
          status: normalizedStatus,
          total_submissions:
            totalSubmissions,
          questions_updated:
            totalSubmissions === 0,
        },
      });
    } catch (error) {
      /*
       * Desfaz todas as alterações caso qualquer
       * etapa da atualização falhe.
       */
      if (connection) {
        await connection.rollback();
      }

      console.error(
        "Erro ao atualizar atividade:",
        error
      );

      return res.status(500).json({
        message: "Erro ao atualizar atividade.",
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
  }
);

/* ==========================================================
   PROFESSOR — DESATIVAÇÃO DE ATIVIDADES
   ========================================================== */

/**
 * DELETE /activities/:id
 * Desativa uma atividade ou avaliação.
 *
 * Esta rota realiza soft delete:
 * o registro permanece no banco com status inactive.
 */
app.delete("/activities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const normalizedActivityId = Number(id);
    const normalizedUserId = Number(userId);

    /*
     * Valida o ID da atividade.
     */
    if (
      !Number.isInteger(normalizedActivityId) ||
      normalizedActivityId <= 0
    ) {
      return res.status(400).json({
        message: "ID da atividade inválido.",
      });
    }

    /*
     * Valida o ID do professor.
     */
    if (
      !Number.isInteger(normalizedUserId) ||
      normalizedUserId <= 0
    ) {
      return res.status(400).json({
        message: "O usuário do professor é obrigatório.",
      });
    }

    /*
     * Descobre o teachers.id a partir do users.id.
     */
    const [teacherRows] = await db.promise().query(
      `
        SELECT id
        FROM teachers
        WHERE user_id = ?
        LIMIT 1
      `,
      [normalizedUserId]
    );

    if (teacherRows.length === 0) {
      return res.status(404).json({
        message: "Professor não encontrado.",
      });
    }

    const teacherId = teacherRows[0].id;

    /*
     * Confirma que a atividade:
     * - existe;
     * - pertence a um curso do professor.
     */
    const [activityRows] = await db.promise().query(
      `
        SELECT
          a.id,
          a.status,
          a.activity_kind
        FROM activities a

        INNER JOIN courses c
          ON c.id = a.course_id

        WHERE a.id = ?
          AND c.teacher_id = ?

        LIMIT 1
      `,
      [normalizedActivityId, teacherId]
    );

    if (activityRows.length === 0) {
      return res.status(404).json({
        message:
          "Atividade não encontrada ou não pertence ao professor.",
      });
    }

    const activity = activityRows[0];

    /*
     * Evita repetir a desativação.
     */
    if (activity.status === "inactive") {
      return res.status(409).json({
        message:
          activity.activity_kind === "exam"
            ? "Esta avaliação já está inativa."
            : "Esta atividade já está inativa.",
      });
    }

    /*
     * Realiza o soft delete.
     */
    const [result] = await db.promise().query(
      `
        UPDATE activities
        SET
          status = 'inactive',
          updated_at = NOW()
        WHERE id = ?
      `,
      [normalizedActivityId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message:
          activity.activity_kind === "exam"
            ? "Não foi possível desativar a avaliação."
            : "Não foi possível desativar a atividade.",
      });
    }

    return res.status(200).json({
      message:
        activity.activity_kind === "exam"
          ? "Avaliação desativada com sucesso."
          : "Atividade desativada com sucesso.",

      activity: {
        id: normalizedActivityId,
        status: "inactive",
      },
    });
  } catch (error) {
    console.error(
      "Erro ao desativar atividade:",
      error
    );

    return res.status(500).json({
      message: "Erro ao desativar atividade.",
      error: error.message,
    });
  }
});

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
  const userId = Number(req.params.userId);
  const classId = Number(req.params.classId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      message: "ID do usuário inválido.",
    });

    return null;
  }

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
 * GET /teacher/by-user/:userId/classes
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
  "/teacher/by-user/:userId/classes",
  async (req, res) => {
    try {
      const userId = Number(
        req.params.userId
      );

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim()
          : "";

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(400).json({
          message:
            "ID do usuário inválido.",
        });
      }

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

              COALESCE(
                content_stats.content_count,
                0
              ) AS content_count,

              COALESCE(
                activity_stats.activity_count,
                0
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

            LEFT JOIN (
              SELECT
                cc.course_id,

                COUNT(*) AS content_count

              FROM course_contents cc

              WHERE cc.status = 'active'
                AND cc.type IN (
                  'video',
                  'pdf',
                  'text',
                  'live_class'
                )

              GROUP BY cc.course_id
            ) content_stats
              ON content_stats.course_id =
                cl.course_id

            LEFT JOIN (
              SELECT
                a.course_id,

                COUNT(*) AS activity_count

              FROM activities a

              WHERE a.status = 'active'

              GROUP BY a.course_id
            ) activity_stats
              ON activity_stats.course_id =
                cl.course_id

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
 * GET /teacher/by-user/:userId/classes/:classId
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
  "/teacher/by-user/:userId/classes/:classId",
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
              AND cc.status = 'active'
              AND cc.type IN (
                'video',
                'pdf',
                'text',
                'live_class'
              )
          `,
          [classData.course_id]
        ),

        db.promise().query(
          `
            SELECT
              COUNT(*) AS activity_count

            FROM activities a

            WHERE a.course_id = ?
              AND a.status = 'active'
          `,
          [classData.course_id]
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
 * GET /teacher/by-user/:userId/classes/:classId/students
 * ============================================================
 *
 * Lista apenas matrículas relacionadas à turma selecionada.
 */
app.get(
  "/teacher/by-user/:userId/classes/:classId/students",
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
 * ============================================================
 * PROFESSOR — LISTAR CONTEÚDOS DO CURSO DA TURMA
 * GET /teacher/by-user/:userId/classes/:classId/contents
 * ============================================================
 *
 * A URL usa a turma como contexto.
 * Os materiais continuam relacionados ao curso da turma.
 */
app.get(
  "/teacher/by-user/:userId/classes/:classId/contents",
  async (req, res) => {
    try {
      const params = validateTeacherClassParams(req, res);

      if (!params) return;

      const { userId, classId } = params;
      const status = req.query.status?.trim() || "";

      const allowedStatuses = new Set([
        "",
        "active",
        "inactive",
        "draft",
        "archived",
      ]);

      if (!allowedStatuses.has(status)) {
        return res.status(400).json({
          message: "Status de conteúdo inválido.",
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

      const queryParams = [classData.course_id];
      let statusCondition = "";

      if (status) {
        statusCondition = "AND cc.status = ?";
        queryParams.push(status);
      }

      const [rows] = await db.promise().query(
        `
          SELECT
            cc.id,
            cc.course_id,
            cc.title,
            cc.description,
            cc.type,
            cc.content_url,
            cc.content_text,
            cc.order_index,
            cc.is_required,
            cc.status,
            cc.due_date,
            cc.created_at,
            cc.updated_at

          FROM course_contents cc

          WHERE cc.course_id = ?
            AND cc.type IN (
              'video',
              'pdf',
              'text',
              'live_class'
            )
            ${statusCondition}

          ORDER BY
            cc.order_index ASC,
            cc.created_at ASC
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

        contents: rows.map((content) => ({
          id: content.id,
          courseId: content.course_id,

          title: content.title,
          description: content.description,
          type: content.type,

          contentUrl: content.content_url,
          contentText: content.content_text,

          orderIndex: content.order_index,
          isRequired: Boolean(
            content.is_required
          ),

          status: content.status,
          dueDate: content.due_date,

          createdAt: content.created_at,
          updatedAt: content.updated_at,
        })),
      });
    } catch (error) {
      console.error(
        "Erro ao listar conteúdos da turma:",
        error
      );

      return res.status(500).json({
        message:
          "Erro interno ao buscar os conteúdos da turma.",
        error: error.message,
        sqlMessage: error.sqlMessage,
        code: error.code,
      });
    }
  }
);

/*
 * ============================================================
 * PROFESSOR — LISTAR ATIVIDADES DO CURSO DA TURMA
 * GET /teacher/by-user/:userId/classes/:classId/activities
 * ============================================================
 *
 * Enquanto activities possuir course_id, as atividades são
 * compartilhadas entre as turmas do mesmo curso.
 *
 * As submissões não são contadas nesta rota para evitar
 * misturar alunos de turmas diferentes.
 */
app.get(
  "/teacher/by-user/:userId/classes/:classId/activities",
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

      const queryParams = [classData.course_id];

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
            ${activityKindCondition}
            ${statusCondition}

          GROUP BY
            a.id,
            a.course_id,
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

        activities: rows.map((activity) => ({
          id: activity.id,
          courseId: activity.course_id,

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
        })),
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
  const userId = Number(req.params.userId);
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      message: "ID do usuário inválido.",
    });

    return null;
  }

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
 * /teacher/by-user/:userId/classes/:classId/sessions
 *
 * Filtros opcionais:
 * ?status=scheduled
 * ?sessionType=class
 */
app.get(
  "/teacher/by-user/:userId/classes/:classId/sessions",
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
 * /teacher/by-user/:userId/class-sessions/:sessionId
 */
app.get(
  "/teacher/by-user/:userId/class-sessions/:sessionId",
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
 * /teacher/by-user/:userId/classes/:classId/sessions
 */
app.post(
  "/teacher/by-user/:userId/classes/:classId/sessions",
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
 * /teacher/by-user/:userId/class-sessions/:sessionId
 */
app.put(
  "/teacher/by-user/:userId/class-sessions/:sessionId",
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
 * /teacher/by-user/:userId/class-sessions/:sessionId
 *
 * Não remove a sessão fisicamente.
 * Apenas altera o status para cancelled.
 */
app.delete(
  "/teacher/by-user/:userId/class-sessions/:sessionId",
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
  "/teacher/by-user/:userId/classes/:classId/attendance",
  async (req, res) => {
    const promiseDb = db.promise();

    try {
      const userId = Number(req.params.userId);
      const classId = Number(req.params.classId);

      const attendanceDate =
        typeof req.query.date === "string"
          ? req.query.date.trim()
          : "";

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

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
// PROFESSOR - LISTAR ENCONTROS DA TURMA
//
// Retorna todos os encontros ativos vinculados à turma,
// após validar que ela pertence ao professor informado.
// Também retorna os dados básicos da turma utilizados
// pela tela de frequência.
// ======================================================

app.get(
  "/teacher/by-user/:userId/classes/:classId/sessions",
  async (req, res) => {
    const userId = Number(req.params.userId);
    const classId = Number(req.params.classId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(classId) ||
      classId <= 0
    ) {
      return res.status(400).json({
        message:
          "Professor ou turma inválidos.",
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

      const [sessions] =
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
              cs.status,
              cs.created_at AS createdAt,
              cs.updated_at AS updatedAt
            FROM class_sessions cs
            WHERE cs.class_id = ?
              AND cs.status <> 'archived'
            ORDER BY
              cs.session_number ASC,
              cs.session_date ASC,
              cs.start_time ASC
          `,
          [classId]
        );

      return res.json({
        class: classData,
        sessions,
      });
    } catch (error) {
      console.error(
        "Erro ao listar encontros:",
        error
      );

      return res.status(500).json({
        message:
          "Não foi possível carregar os encontros da turma.",
      });
    }
  }
);

// ======================================================
// PROFESSOR - CADASTRAR ENCONTRO DA TURMA
//
// Cria um novo encontro para a turma informada,
// validando se ela pertence ao professor responsável.
// O encontro passa a ficar disponível para registro
// de frequência e consultas posteriores.
// ======================================================

app.post(
  "/teacher/by-user/:userId/classes/:classId/sessions",
  async (req, res) => {
    const userId = Number(req.params.userId);
    const classId = Number(req.params.classId);

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
      classId <= 0
    ) {
      return res.status(400).json({
        message:
          "Professor ou turma inválidos.",
      });
    }

    if (
      !Number.isInteger(
        normalizedSessionNumber
      ) ||
      normalizedSessionNumber <= 0
    ) {
      return res.status(400).json({
        message:
          "O número do encontro é obrigatório.",
      });
    }

    if (
      !title ||
      !String(title).trim()
    ) {
      return res.status(400).json({
        message:
          "O título do encontro é obrigatório.",
      });
    }

    if (!sessionDate) {
      return res.status(400).json({
        message:
          "A data do encontro é obrigatória.",
      });
    }

    if (
      !validSessionTypes.has(sessionType)
    ) {
      return res.status(400).json({
        message:
          "Tipo de encontro inválido.",
      });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({
        message:
          "Status do encontro inválido.",
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

      const [duplicateRows] =
        await connection.execute(
          `
            SELECT id
            FROM class_sessions
            WHERE class_id = ?
              AND session_number = ?
              AND status <> 'archived'
            LIMIT 1
          `,
          [
            classId,
            normalizedSessionNumber,
          ]
        );

      if (duplicateRows.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message:
            "Já existe um encontro com esse número nesta turma.",
        });
      }

      const [result] =
        await connection.execute(
          `
            INSERT INTO class_sessions (
              class_id,
              session_number,
              title,
              description,
              session_date,
              start_time,
              end_time,
              session_type,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            classId,
            normalizedSessionNumber,
            String(title).trim(),
            String(description || "").trim(),
            sessionDate,
            startTime || null,
            endTime || null,
            sessionType,
            status,
          ]
        );

      const [createdRows] =
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
          [result.insertId]
        );

      await connection.commit();

      return res.status(201).json({
        message:
          "Encontro cadastrado com sucesso.",
        session: createdRows[0],
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        "Erro ao cadastrar encontro:",
        error
      );

      return res.status(500).json({
        message:
          "Não foi possível cadastrar o encontro.",
      });
    } finally {
      connection.release();
    }
  }
);

// ======================================================
// PROFESSOR - EDITAR ENCONTRO DA TURMA
//
// Atualiza os dados de um encontro existente,
// permitindo alterar informações como título,
// data, horário, tipo, descrição e status,
// após validar a permissão do professor.
// ======================================================

app.put(
  "/teacher/by-user/:userId/classes/:classId/sessions/:sessionId",
  async (req, res) => {
    const userId = Number(req.params.userId);
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
  "/teacher/by-user/:userId/classes/:classId/sessions/:sessionId",
  async (req, res) => {
    const userId = Number(req.params.userId);
    const classId = Number(req.params.classId);
    const sessionId = Number(
      req.params.sessionId
    );

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
  "/teacher/by-user/:userId/classes/:classId/sessions/:sessionId/attendance",
  async (req, res) => {
    const userId = Number(req.params.userId);
    const classId = Number(req.params.classId);
    const sessionId = Number(
      req.params.sessionId
    );

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
  "/teacher/by-user/:userId/classes/:classId/sessions/:sessionId/attendance",
  async (req, res) => {
   
    const userId = Number(
      req.params.userId
    );

    const classId = Number(
      req.params.classId
    );

    const sessionId = Number(
      req.params.sessionId
    );

    const { records } = req.body;

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        message:
          "ID do usuário inválido.",
      });
    }

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
   Envios dos alunos e fluxo de avaliação
   ========================================================== */


/* ==========================================================
   PROFESSOR — ENVIOS DE UMA ATIVIDADE
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/activities/:activityId/submissions
 * Lista todas as entregas realizadas em uma atividade.
 *
 * Antes de retornar os envios, confirma que a atividade
 * pertence a um curso do professor.
 */
app.get(
  "/teacher/by-user/:userId/activities/:activityId/submissions",
  async (req, res) => {
    try {
      const { userId, activityId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedActivityId = Number(activityId);

      /*
       * Valida o ID do usuário do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID da atividade.
       */
      if (
        !Number.isInteger(normalizedActivityId) ||
        normalizedActivityId <= 0
      ) {
        return res.status(400).json({
          message: "ID da atividade inválido.",
        });
      }

      /*
       * Confirma que:
       *
       * users.id -> teachers.user_id
       * teachers.id -> courses.teacher_id
       * courses.id -> activities.course_id
       *
       * Assim, o professor só consegue visualizar
       * entregas de atividades dos próprios cursos.
       */
      const [activityRows] = await db.promise().query(
        `
          SELECT
            a.id,
            a.course_id,
            a.activity_kind,
            a.title,
            a.description,
            a.type,
            a.due_date,
            a.max_score,
            a.status,

            c.name AS course_name

          FROM teachers t

          INNER JOIN courses c
            ON c.teacher_id = t.id

          INNER JOIN activities a
            ON a.course_id = c.id

          WHERE t.user_id = ?
            AND a.id = ?

          LIMIT 1
        `,
        [normalizedUserId, normalizedActivityId]
      );

      if (activityRows.length === 0) {
        return res.status(404).json({
          message:
            "Atividade não encontrada ou não pertence ao professor.",
        });
      }

      const activity = activityRows[0];

      /*
       * Busca todas as submissions da atividade.
       *
       * Também retorna os dados básicos do aluno
       * e a quantidade de respostas da entrega.
       */
      const [submissions] = await db.promise().query(
        `
          SELECT
            s.id,
            s.activity_id,
            s.student_id,
            s.status,
            s.score,
            s.feedback,
            s.graded_by_teacher_id,
            s.submitted_at,
            s.graded_at,
            s.created_at,
            s.updated_at,

            st.name AS student_name,
            st.email AS student_email,
            st.registration_number,

            COUNT(sa.id) AS total_answers

          FROM submissions s

          INNER JOIN students st
            ON st.id = s.student_id

          LEFT JOIN submission_answers sa
            ON sa.submission_id = s.id

          WHERE s.activity_id = ?

          GROUP BY
            s.id,
            s.activity_id,
            s.student_id,
            s.status,
            s.score,
            s.feedback,
            s.graded_by_teacher_id,
            s.submitted_at,
            s.graded_at,
            s.created_at,
            s.updated_at,
            st.name,
            st.email,
            st.registration_number

          ORDER BY
            CASE
              WHEN s.status = 'pending_review' THEN 1
              WHEN s.status = 'submitted' THEN 2
              WHEN s.status = 'returned' THEN 3
              WHEN s.status = 'graded' THEN 4
              WHEN s.status = 'draft' THEN 5
              ELSE 6
            END ASC,
            s.submitted_at ASC
        `,
        [normalizedActivityId]
      );

      return res.status(200).json({
        activity,
        submissions,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar submissions da atividade:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar envios da atividade.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — ENTREGA COMPLETA
   ========================================================== */

/**
 * GET /teacher/by-user/:userId/submissions/:submissionId/full
 * Carrega uma entrega completa para correção.
 *
 * Retorna:
 * - dados da entrega;
 * - aluno;
 * - atividade;
 * - curso;
 * - respostas;
 * - alternativas selecionadas;
 * - correções já realizadas.
 */
app.get(
  "/teacher/by-user/:userId/submissions/:submissionId/full",
  async (req, res) => {
    try {
      const { userId, submissionId } = req.params;

      const normalizedUserId = Number(userId);
      const normalizedSubmissionId =
        Number(submissionId);

      /*
       * Valida o ID do usuário do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Valida o ID da entrega.
       */
      if (
        !Number.isInteger(normalizedSubmissionId) ||
        normalizedSubmissionId <= 0
      ) {
        return res.status(400).json({
          message: "ID da entrega inválido.",
        });
      }

      /*
       * Busca a submission e confirma que ela pertence
       * a uma atividade de um curso do professor.
       */
      const [submissionRows] =
        await db.promise().query(
          `
            SELECT
              s.id,
              s.activity_id,
              s.student_id,
              s.status,
              s.score,
              s.feedback,
              s.graded_by_teacher_id,
              s.submitted_at,
              s.graded_at,
              s.created_at,
              s.updated_at,

              st.name AS student_name,
              st.email AS student_email,
              st.registration_number,

              a.title AS activity_title,
              a.description AS activity_description,
              a.activity_kind,
              a.type AS activity_type,
              a.max_score,
              a.due_date,

              c.id AS course_id,
              c.name AS course_name,

              t.id AS teacher_id

            FROM submissions s

            INNER JOIN students st
              ON st.id = s.student_id

            INNER JOIN activities a
              ON a.id = s.activity_id

            INNER JOIN courses c
              ON c.id = a.course_id

            INNER JOIN teachers t
              ON t.id = c.teacher_id

            WHERE s.id = ?
              AND t.user_id = ?

            LIMIT 1
          `,
          [
            normalizedSubmissionId,
            normalizedUserId,
          ]
        );

      if (submissionRows.length === 0) {
        return res.status(404).json({
          message:
            "Entrega não encontrada ou não pertence ao professor.",
        });
      }

      const submission = submissionRows[0];

      /*
       * Busca todas as respostas da submission.
       *
       * Para questões objetivas, também retorna:
       * - alternativa escolhida;
       * - se a alternativa escolhida é correta.
       */
      const [answers] = await db.promise().query(
        `
          SELECT
            sa.id AS answer_id,
            sa.submission_id,
            sa.question_id,
            sa.option_id,
            sa.answer_text,
            sa.file_url,
            sa.is_correct,
            sa.score_awarded,
            sa.feedback AS answer_feedback,
            sa.created_at,
            sa.updated_at,

            aq.question_text,
            aq.question_type,
            aq.points AS max_points,
            aq.order_index,

            selected_option.option_text
              AS selected_option_text,

            selected_option.is_correct
              AS selected_option_is_correct

          FROM submission_answers sa

          INNER JOIN activity_questions aq
            ON aq.id = sa.question_id

          LEFT JOIN activity_options selected_option
            ON selected_option.id = sa.option_id

          WHERE sa.submission_id = ?

          ORDER BY
            aq.order_index ASC,
            aq.id ASC
        `,
        [normalizedSubmissionId]
      );

      return res.status(200).json({
        submission,
        answers,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar submission completa:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar entrega completa.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


/* ==========================================================
   PROFESSOR — CORREÇÃO DA ENTREGA
   ========================================================== */

/**
 * PUT /teacher/by-user/:userId/submissions/:submissionId/grade
 * Corrige uma entrega e registra sua nota oficial.
 *
 * O corpo esperado possui:
 *
 * {
 *   answers: [
 *     {
 *       answer_id: 1,
 *       score_awarded: 2,
 *       feedback: "Boa resposta."
 *     }
 *   ],
 *   feedback: "Feedback geral."
 * }
 */
app.put(
  "/teacher/by-user/:userId/submissions/:submissionId/grade",
  async (req, res) => {
    let connection;

    try {
      const { userId, submissionId } = req.params;
      const { answers, feedback } = req.body;

      const normalizedUserId = Number(userId);
      const normalizedSubmissionId =
        Number(submissionId);

      /*
       * Valida o ID do professor.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message:
            "ID do usuário do professor inválido.",
        });
      }

      /*
       * Valida o ID da entrega.
       */
      if (
        !Number.isInteger(normalizedSubmissionId) ||
        normalizedSubmissionId <= 0
      ) {
        return res.status(400).json({
          message: "ID da entrega inválido.",
        });
      }

      /*
       * Exige a correção de pelo menos uma resposta.
       */
      if (
        !Array.isArray(answers) ||
        answers.length === 0
      ) {
        return res.status(400).json({
          message:
            "Envie a correção de pelo menos uma resposta.",
        });
      }

      /*
       * Normaliza o feedback geral.
       */
      const normalizedGeneralFeedback =
        typeof feedback === "string"
          ? feedback.trim() || null
          : null;

      /*
       * Inicia a transação.
       *
       * Respostas, submission e grade oficial precisam
       * ser atualizadas juntas.
       */
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      /*
       * Busca a entrega e confirma que:
       *
       * users.id -> teachers.user_id
       * teachers.id -> courses.teacher_id
       * courses.id -> activities.course_id
       * activities.id -> submissions.activity_id
       */
      const [submissionRows] = await connection.query(
        `
          SELECT
            s.id AS submission_id,
            s.student_id,
            s.activity_id,
            s.status AS submission_status,

            a.course_id,
            a.title AS activity_title,
            a.activity_kind,
            a.max_score,

            t.id AS teacher_id

          FROM submissions s

          INNER JOIN activities a
            ON a.id = s.activity_id

          INNER JOIN courses c
            ON c.id = a.course_id

          INNER JOIN teachers t
            ON t.id = c.teacher_id

          WHERE s.id = ?
            AND t.user_id = ?

          LIMIT 1
        `,
        [
          normalizedSubmissionId,
          normalizedUserId,
        ]
      );

      if (submissionRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Entrega não encontrada ou não pertence ao professor.",
        });
      }

      const submission = submissionRows[0];

      /*
       * Busca todas as respostas armazenadas no banco.
       *
       * Para múltipla escolha, também carrega se a
       * alternativa selecionada é correta.
       */
      const [databaseAnswers] = await connection.query(
        `
          SELECT
            sa.id AS answer_id,
            sa.question_id,

            aq.question_type,
            aq.points AS max_points,

            selected_option.is_correct
              AS selected_option_is_correct

          FROM submission_answers sa

          INNER JOIN activity_questions aq
            ON aq.id = sa.question_id

          LEFT JOIN activity_options selected_option
            ON selected_option.id = sa.option_id

          WHERE sa.submission_id = ?

          ORDER BY
            aq.order_index ASC,
            aq.id ASC
        `,
        [normalizedSubmissionId]
      );

      if (databaseAnswers.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Esta entrega não possui respostas para corrigir.",
        });
      }

      /*
       * Cria um mapa das respostas reais do banco.
       */
      const databaseAnswerMap = new Map();

      databaseAnswers.forEach((answer) => {
        databaseAnswerMap.set(
          Number(answer.answer_id),
          answer
        );
      });

      /*
       * Normaliza os IDs recebidos.
       */
      const receivedAnswerIds = answers.map(
        (answer) => Number(answer.answer_id)
      );

      const uniqueAnswerIds = new Set(
        receivedAnswerIds
      );

      /*
       * Impede o envio da mesma resposta duas vezes.
       */
      if (uniqueAnswerIds.size !== answers.length) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Existem correções duplicadas para a mesma resposta.",
        });
      }

      const validatedAnswers = [];
      let totalScore = 0;

      /*
       * Valida cada correção recebida.
       */
      for (
        let index = 0;
        index < answers.length;
        index++
      ) {
        const receivedAnswer = answers[index];
        const answerId = Number(
          receivedAnswer.answer_id
        );

        const databaseAnswer =
          databaseAnswerMap.get(answerId);

        /*
         * Confirma que a resposta pertence à submission.
         */
        if (!databaseAnswer) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `A resposta informada na questão ${
                index + 1
              } é inválida.`,
          });
        }

        /*
         * Exige uma pontuação para cada resposta.
         *
         * Zero é permitido.
         */
        if (
          receivedAnswer.score_awarded === undefined ||
          receivedAnswer.score_awarded === null ||
          receivedAnswer.score_awarded === ""
        ) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `Informe a pontuação da questão ${
                index + 1
              }.`,
          });
        }

        const scoreAwarded = Number(
          receivedAnswer.score_awarded
        );

        const maxPoints = Number(
          databaseAnswer.max_points
        );

        /*
         * Impede pontuações não numéricas.
         */
        if (Number.isNaN(scoreAwarded)) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `A pontuação da questão ${
                index + 1
              } é inválida.`,
          });
        }

        /*
         * Impede pontuação negativa.
         */
        if (scoreAwarded < 0) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `A questão ${
                index + 1
              } não pode receber pontuação negativa.`,
          });
        }

        /*
         * Impede que a pontuação ultrapasse o valor
         * máximo da questão.
         */
        if (
          !Number.isNaN(maxPoints) &&
          scoreAwarded > maxPoints
        ) {
          await connection.rollback();

          return res.status(400).json({
            message:
              `A questão ${
                index + 1
              } vale no máximo ${maxPoints} ponto(s).`,
          });
        }

        /*
         * Para questões objetivas, registra se a
         * alternativa selecionada estava correta.
         *
         * Para texto e upload, mantém NULL porque
         * a avaliação é subjetiva.
         */
        let isCorrect = null;

        if (
          databaseAnswer.question_type ===
          "multiple_choice"
        ) {
          isCorrect =
            databaseAnswer
              .selected_option_is_correct === 1 ||
            databaseAnswer
              .selected_option_is_correct === true ||
            databaseAnswer
              .selected_option_is_correct === "1"
              ? 1
              : 0;
        }

        const answerFeedback =
          typeof receivedAnswer.feedback === "string"
            ? receivedAnswer.feedback.trim() || null
            : null;

        validatedAnswers.push({
          answerId,
          scoreAwarded,
          feedback: answerFeedback,
          isCorrect,
        });

        totalScore += scoreAwarded;
      }

      /*
       * Confirma que todas as respostas reais da submission
       * receberam uma correção.
       */
      const hasMissingAnswer = databaseAnswers.some(
        (answer) =>
          !uniqueAnswerIds.has(
            Number(answer.answer_id)
          )
      );

      if (hasMissingAnswer) {
        await connection.rollback();

        return res.status(400).json({
          message:
            "Todas as respostas devem receber uma pontuação.",
        });
      }

      const activityMaxScore = Number(
        submission.max_score
      );

      /*
       * Arredonda a nota total para duas casas decimais.
       */
      totalScore =
        Math.round(
          (totalScore + Number.EPSILON) * 100
        ) / 100;

      /*
       * Impede que a soma ultrapasse a nota máxima
       * definida para a atividade.
       */
      if (
        !Number.isNaN(activityMaxScore) &&
        totalScore > activityMaxScore
      ) {
        await connection.rollback();

        return res.status(400).json({
          message:
            `A nota total não pode ultrapassar ` +
            `${activityMaxScore}.`,
        });
      }

      /*
       * Atualiza a correção individual de cada resposta.
       */
      for (const answer of validatedAnswers) {
        const [answerUpdateResult] =
          await connection.query(
            `
              UPDATE submission_answers
              SET
                score_awarded = ?,
                feedback = ?,
                is_correct = ?,
                updated_at = NOW()
              WHERE id = ?
                AND submission_id = ?
            `,
            [
              answer.scoreAwarded,
              answer.feedback,
              answer.isCorrect,
              answer.answerId,
              normalizedSubmissionId,
            ]
          );

        if (answerUpdateResult.affectedRows === 0) {
          await connection.rollback();

          return res.status(404).json({
            message:
              "Não foi possível atualizar uma das respostas.",
          });
        }
      }

      /*
       * Atualiza o resultado geral da submission.
       */
      const [submissionUpdateResult] =
        await connection.query(
          `
            UPDATE submissions
            SET
              status = 'graded',
              score = ?,
              feedback = ?,
              graded_by_teacher_id = ?,
              graded_at = NOW(),
              updated_at = NOW()
            WHERE id = ?
          `,
          [
            totalScore,
            normalizedGeneralFeedback,
            submission.teacher_id,
            normalizedSubmissionId,
          ]
        );

      if (submissionUpdateResult.affectedRows === 0) {
        await connection.rollback();

        return res.status(404).json({
          message:
            "Não foi possível atualizar a entrega.",
        });
      }

      /*
       * Cria ou atualiza a nota oficial.
       *
       * Esta operação depende de submission_id possuir
       * uma restrição UNIQUE na tabela grades.
       */
      await connection.query(
        `
          INSERT INTO grades
          (
            submission_id,
            student_id,
            course_id,
            activity_id,
            teacher_id,
            title,
            score,
            max_score,
            feedback,
            graded_at,
            created_at,
            updated_at
          )
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            NOW(), NOW(), NOW()
          )

          ON DUPLICATE KEY UPDATE
            student_id = VALUES(student_id),
            course_id = VALUES(course_id),
            activity_id = VALUES(activity_id),
            teacher_id = VALUES(teacher_id),
            title = VALUES(title),
            score = VALUES(score),
            max_score = VALUES(max_score),
            feedback = VALUES(feedback),
            graded_at = NOW(),
            updated_at = NOW()
        `,
        [
          normalizedSubmissionId,
          submission.student_id,
          submission.course_id,
          submission.activity_id,
          submission.teacher_id,
          submission.activity_title,
          totalScore,
          activityMaxScore,
          normalizedGeneralFeedback,
        ]
      );

      /*
       * Confirma todas as alterações.
       */
      await connection.commit();

      return res.status(200).json({
        message:
          submission.activity_kind === "exam"
            ? "Avaliação corrigida com sucesso."
            : "Atividade corrigida com sucesso.",

        submission: {
          id: normalizedSubmissionId,
          activity_id: submission.activity_id,
          student_id: submission.student_id,
          status: "graded",
          score: totalScore,
          max_score: activityMaxScore,
          feedback: normalizedGeneralFeedback,
          graded_by_teacher_id:
            submission.teacher_id,
        },

        answers: validatedAnswers.map((answer) => ({
          answer_id: answer.answerId,
          score_awarded: answer.scoreAwarded,
          feedback: answer.feedback,
          is_correct: answer.isCorrect,
        })),
      });
    } catch (error) {
      /*
       * Desfaz toda a correção se qualquer etapa falhar.
       */
      if (connection) {
        await connection.rollback();
      }

      console.error(
        "Erro ao corrigir submission:",
        error
      );

      return res.status(500).json({
        message: "Erro ao salvar a correção.",
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
  }
);


/* ==========================================================
   ALUNO — NOTAS
   ========================================================== */

/**
 * GET /students/by-user/:userId/grades
 * Lista todas as notas oficiais do aluno.
 */
app.get(
  "/students/by-user/:userId/grades",
  async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = Number(userId);

      /*
       * Valida o ID do usuário.
       */
      if (
        !Number.isInteger(normalizedUserId) ||
        normalizedUserId <= 0
      ) {
        return res.status(400).json({
          message: "ID do usuário inválido.",
        });
      }

      /*
       * Encontra students.id usando users.id.
       */
      const [studentRows] = await db.promise().query(
        `
          SELECT
            id,
            name,
            email,
            registration_number
          FROM students
          WHERE user_id = ?
          LIMIT 1
        `,
        [normalizedUserId]
      );

      if (studentRows.length === 0) {
        return res.status(404).json({
          message: "Aluno não encontrado.",
        });
      }

      const studentId = studentRows[0].id;

      /*
       * Busca todas as notas oficiais do aluno.
       *
       * grades guarda a nota consolidada após a
       * correção da submission.
       */
      const [grades] = await db.promise().query(
        `
          SELECT
            g.id,
            g.submission_id,
            g.student_id,
            g.course_id,
            g.activity_id,
            g.teacher_id,
            g.title,
            g.score,
            g.max_score,
            g.feedback,
            g.graded_at,
            g.created_at,
            g.updated_at,

            c.name AS course_name,

            a.activity_kind,
            a.type AS activity_type,
            a.due_date,

            s.status AS submission_status,
            s.submitted_at,

            t.name AS teacher_name

          FROM grades g

          INNER JOIN courses c
            ON c.id = g.course_id

          INNER JOIN activities a
            ON a.id = g.activity_id

          INNER JOIN submissions s
            ON s.id = g.submission_id

          LEFT JOIN teachers t
            ON t.id = g.teacher_id

          WHERE g.student_id = ?

          ORDER BY
            g.graded_at DESC,
            g.id DESC
        `,
        [studentId]
      );

      return res.status(200).json(grades);
    } catch (error) {
      console.error(
        "Erro ao buscar notas do aluno:",
        error
      );

      return res.status(500).json({
        message: "Erro ao buscar notas do aluno.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  }
);


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
 * GET /admin/students
 * Lista todos os alunos cadastrados.
 *
 * Também retorna:
 * - quantidade de matrículas;
 * - nomes dos cursos associados ao aluno.
 */
app.get("/admin/students", async (req, res) => {
  try {
    /*
     * Busca os alunos e agrega suas matrículas.
     *
     * LEFT JOIN mantém na resposta alunos que ainda
     * não possuem nenhuma matrícula.
     */
    const [students] = await db.promise().query(
      `
        SELECT
          s.id,
          s.user_id,
          s.name,
          s.email,
          s.gender,
          s.registration_number,
          s.status,

          COUNT(DISTINCT e.id) AS total_enrollments,

          GROUP_CONCAT(
            DISTINCT c.name
            ORDER BY c.name ASC
            SEPARATOR ', '
          ) AS courses

        FROM students s

        LEFT JOIN enrollments e
          ON e.student_id = s.id

        LEFT JOIN courses c
          ON c.id = e.course_id

        GROUP BY
          s.id,
          s.user_id,
          s.name,
          s.email,
          s.gender,
          s.registration_number,
          s.status

        ORDER BY s.name ASC
      `
    );

    return res.status(200).json(students);
  } catch (error) {
    console.error(
      "Erro ao buscar alunos administrativos:",
      error
    );

    return res.status(500).json({
      message: "Erro ao buscar alunos.",
      error: error.message,
    });
  }
});


/**
 * GET /admin/students/:id
 * Busca os dados completos de um aluno pelo ID.
 *
 * Os dados acadêmicos vêm de students e os dados
 * de autenticação vêm de users.
 */
app.get("/admin/students/:id", async (req, res) => {
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
 * GET /admin/teachers
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
app.get("/admin/teachers", async (req, res) => {
  try {
    /*
     * Mantém todos os professores na resposta,
     * incluindo os inativos.
     *
     * O frontend pode filtrar pelo campo status quando
     * precisar exibir apenas professores ativos.
     */
    const [teachers] = await db.promise().query(
      `
        SELECT
          t.id,
          t.user_id,
          t.name,
          t.email,
          t.gender,
          t.registration_number,
          t.cpf,
          t.phone,
          t.status,
          t.specialty,

          GROUP_CONCAT(
            DISTINCT c.name
            ORDER BY c.name ASC
            SEPARATOR ', '
          ) AS course_names,

          COUNT(DISTINCT c.id) AS total_courses

        FROM teachers t

        LEFT JOIN courses c
          ON c.teacher_id = t.id

        GROUP BY
          t.id,
          t.user_id,
          t.name,
          t.email,
          t.gender,
          t.registration_number,
          t.cpf,
          t.phone,
          t.status,
          t.specialty

        ORDER BY t.name ASC
      `
    );

    return res.status(200).json(teachers);
  } catch (error) {
    console.error(
      "Erro ao buscar professores administrativos:",
      error
    );

    return res.status(500).json({
      message: "Erro ao buscar professores.",
      error: error.message,
    });
  }
});


/* ==========================================================
   ADMINISTRAÇÃO — CONSULTA DE CURSOS
   ========================================================== */

/**
 * GET /admin/courses
 * Lista todos os cursos cadastrados.
 *
 * Também retorna:
 * - professor responsável;
 * - quantidade de alunos;
 * - quantidade de conteúdos.
 */
app.get("/admin/courses", async (req, res) => {
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
 * GET /admin/courses/:id
 * Busca os dados completos de um curso pelo ID.
 */
app.get("/admin/courses/:id", async (req, res) => {
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
 * POST /admin/students
 * Cadastra um novo aluno.
 *
 * A operação cria:
 * - um usuário para autenticação;
 * - um perfil acadêmico na tabela students.
 */
app.post("/admin/students", async (req, res) => {
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
 * POST /admin/teachers
 * Cadastra um novo professor.
 *
 * A operação cria:
 * - um usuário para autenticação;
 * - um perfil profissional na tabela teachers.
 */
app.post("/admin/teachers", async (req, res) => {
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
 * POST /admin/courses
 * Cadastra um novo curso.
 */
app.post("/admin/courses", async (req, res) => {
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
 * PUT /admin/students/:id
 * Atualiza os dados acadêmicos e de autenticação de um aluno.
 *
 * Quando uma nova senha é informada, ela também é atualizada
 * na tabela users utilizando bcrypt.
 */
app.put("/admin/students/:id", async (req, res) => {
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
 * PUT /admin/teachers/:id
 * Atualiza os dados profissionais e de autenticação
 * de um professor.
 *
 * A senha só é atualizada quando uma nova senha
 * é informada.
 */
app.put("/admin/teachers/:id", async (req, res) => {
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
 * PUT /admin/courses/:id
 * Atualiza os dados de um curso.
 */
app.put("/admin/courses/:id", async (req, res) => {
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
 * DELETE /admin/students/:id
 * Desativa um aluno sem removê-lo fisicamente do banco.
 *
 * A operação:
 * - altera students.status para cancelled;
 * - altera users.status para inactive.
 */
app.delete("/admin/students/:id", async (req, res) => {
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
 * DELETE /admin/teachers/:id
 * Desativa um professor sem removê-lo fisicamente do banco.
 *
 * A operação:
 * - altera teachers.status para inactive;
 * - altera users.status para inactive.
 */
app.delete("/admin/teachers/:id", async (req, res) => {
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
 * DELETE /admin/courses/:id
 * Arquiva um curso sem removê-lo fisicamente do banco.
 *
 * Esta operação altera courses.status para archived.
 */
app.delete("/admin/courses/:id", async (req, res) => {
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