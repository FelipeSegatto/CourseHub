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
app.use("/api", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", publicCourseRoutes);
app.use("/api", publicUserRoutes);
app.use("/api", studentCourseRoutes);
app.use("/api", studentProgressRoutes);
app.use("/api", studentFinanceRoutes);
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