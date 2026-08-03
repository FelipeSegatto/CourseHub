const {
  getFinancialDashboardSummary,
} = require("../financial/adminFinancialReadService");

const {
  aggregateCalendarEvents,
} = require("../calendar/calendarAggregationService");

const { formatDateOnly } = require("../../utils/appConfig");

const UPCOMING_WINDOW_DAYS = 7;
const UPCOMING_EVENTS_LIMIT = 8;

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

async function getAcademicSummary(db) {
  const [rows] = await db.promise().query(
    `
      SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
        (SELECT COUNT(*) FROM students WHERE status = 'active') AS active_students,
        (SELECT COUNT(*) FROM teachers WHERE status = 'active') AS active_teachers,
        (SELECT COUNT(*) FROM courses WHERE status = 'active') AS active_courses,
        (SELECT COUNT(*) FROM classes WHERE status = 'active') AS active_classes,
        (SELECT COUNT(*) FROM enrollments WHERE status = 'active') AS active_enrollments,
        (SELECT COUNT(*) FROM activities WHERE status = 'active') AS open_activities,
        (SELECT COUNT(*) FROM submissions WHERE status IN ('submitted', 'pending_review'))
          AS pending_submissions
    `
  );

  const row = rows[0] || {};

  return {
    activeUsers: Number(row.active_users || 0),
    activeStudents: Number(row.active_students || 0),
    activeTeachers: Number(row.active_teachers || 0),
    activeCourses: Number(row.active_courses || 0),
    activeClasses: Number(row.active_classes || 0),
    activeEnrollments: Number(row.active_enrollments || 0),
    openActivities: Number(row.open_activities || 0),
    pendingSubmissions: Number(row.pending_submissions || 0),
  };
}

/**
 * Pendências administrativas reais — só itens com regra objetiva
 * confirmada no schema. `courses.teacher_id IS NULL` é estado
 * esperado (curso pode existir sem professor), não um erro; listado
 * aqui como informativo, não como falha.
 */
async function listAdministrativePendingItems(db) {
  const [rows] = await db.promise().query(
    `
      SELECT
        (SELECT COUNT(*) FROM courses WHERE teacher_id IS NULL AND status = 'active')
          AS courses_without_teacher,
        (SELECT COUNT(*) FROM class_sessions
          WHERE status = 'scheduled' AND session_date < CURDATE())
          AS sessions_past_without_attendance
    `
  );

  const row = rows[0] || {};
  const items = [];

  const coursesWithoutTeacher = Number(row.courses_without_teacher || 0);
  const sessionsPastWithoutAttendance = Number(row.sessions_past_without_attendance || 0);

  if (coursesWithoutTeacher > 0) {
    items.push({
      type: "courses_without_teacher",
      label: "Cursos ativos sem professor responsável",
      count: coursesWithoutTeacher,
      deepLink: "/admin/cursos",
    });
  }

  if (sessionsPastWithoutAttendance > 0) {
    items.push({
      type: "sessions_past_without_attendance",
      label: "Encontros passados ainda marcados como agendados",
      count: sessionsPastWithoutAttendance,
      deepLink: null,
    });
  }

  return items;
}

/**
 * Endpoint agregado do dashboard administrativo. Executa 3
 * consultas de contagem (todas agregação, uma única ida ao banco
 * cada) + reaproveita getFinancialDashboardSummary já existente
 * (2 queries internas, nada duplicado) + 1 chamada ao agregador de
 * calendário — todas em paralelo via Promise.all.
 */
async function getAdminDashboard(db, userId) {
  const today = formatDateOnly(new Date());
  const windowEnd = formatDateOnly(addDays(new Date(), UPCOMING_WINDOW_DAYS));

  const [academic, financial, administrativePendingItems, calendarResult] =
    await Promise.all([
      getAcademicSummary(db),
      getFinancialDashboardSummary(db),
      listAdministrativePendingItems(db),
      aggregateCalendarEvents(db, { role: "admin", userId, from: today, to: windowEnd }),
    ]);

  return {
    summary: {
      activeUsers: academic.activeUsers,
      activeEnrollments: academic.activeEnrollments,
      activeCourses: academic.activeCourses,
      activeClasses: academic.activeClasses,
    },
    financial: {
      paidAmount: financial.totalReceived,
      openAmount: financial.totalPending,
      overdueAmount: financial.totalOverdue,
      overdueInvoices: financial.overdueInvoices,
    },
    academic: {
      activeStudents: academic.activeStudents,
      activeTeachers: academic.activeTeachers,
      openActivities: academic.openActivities,
      pendingSubmissions: academic.pendingSubmissions,
    },
    administrativePendingItems,
    upcomingEvents: calendarResult.events.slice(0, UPCOMING_EVENTS_LIMIT),
  };
}

module.exports = {
  getAdminDashboard,
};
