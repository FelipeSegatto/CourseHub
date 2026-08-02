/* ==========================================================
   COURSEHUB API
   Configuração inicial, autenticação e rotas gerais
   ========================================================== */

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const publicCourseRoutes = require("./routes/publicCourseRoutes");
const publicUserRoutes = require("./routes/publicUserRoutes");
const studentCourseRoutes = require("./routes/studentCourseRoutes");
const studentProgressRoutes = require("./routes/studentProgressRoutes");
const studentFinanceRoutes = require("./routes/studentFinanceRoutes");
const teacherCourseRoutes = require("./routes/teacherCourseRoutes");
const teacherClassRoutes = require("./routes/teacherClassRoutes");
const teacherSessionRoutes = require("./routes/teacherSessionRoutes");
const teacherAttendanceRoutes = require("./routes/teacherAttendanceRoutes");
const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
const studentContentRoutes = require("./routes/studentContentRoutes");
const teacherContentRoutes = require("./routes/teacherContentRoutes");
const studentActivityRoutes = require("./routes/studentActivityRoutes");
const teacherActivityRoutes = require("./routes/teacherActivityRoutes");
const studentCalendarRoutes = require("./routes/studentCalendarRoutes");
const teacherCalendarRoutes = require("./routes/teacherCalendarRoutes");
const adminCalendarRoutes = require("./routes/adminCalendarRoutes");

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

const db = require("./db");

const authenticateToken = require("./middlewares/authenticateToken");
const authorizeRoles = require("./middlewares/authorizeRoles");

const cookieParser = require("cookie-parser");

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

// getStudentIdByUserId foi consolidada em
// services/classes/classAccessService.js.

/* ==========================================================
   INFRAESTRUTURA
   ========================================================== */

// Autenticação, perfil e recuperação de senha foram migrados para
// routes/authRoutes.js + services/auth/authService.js e
// routes/profileRoutes.js + services/profile/profileService.js.

// Cursos e usuários públicos foram migrados para
// routes/publicCourseRoutes.js + services/public/publicCourseService.js e
// routes/publicUserRoutes.js + services/public/publicUserService.js.

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

// Cursos, progresso acadêmico e financeiro do aluno foram migrados para
// routes/studentCourseRoutes.js, routes/studentProgressRoutes.js e
// routes/studentFinanceRoutes.js (services/students/*).
// Toda a área do professor (cursos, alunos, turmas, sessões e
// frequência) foi migrada para routes/teacherCourseRoutes.js,
// teacherClassRoutes.js, teacherSessionRoutes.js,
// teacherAttendanceRoutes.js (services/teacher/*).

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
app.use("/api", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", publicCourseRoutes);
app.use("/api", publicUserRoutes);
app.use("/api", studentCourseRoutes);
app.use("/api", studentProgressRoutes);
app.use("/api", studentFinanceRoutes);
app.use("/api", teacherCourseRoutes);
app.use("/api", teacherClassRoutes);
app.use("/api", teacherSessionRoutes);
app.use("/api", teacherAttendanceRoutes);
app.use("/api/admin/financial", adminFinancialRoutes);
app.use("/api", studentContentRoutes);
app.use("/api", teacherContentRoutes);
app.use("/api", studentActivityRoutes);
app.use("/api", teacherActivityRoutes);
app.use("/api", studentCalendarRoutes);
app.use("/api", teacherCalendarRoutes);
app.use("/api/admin/calendar", adminCalendarRoutes);


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