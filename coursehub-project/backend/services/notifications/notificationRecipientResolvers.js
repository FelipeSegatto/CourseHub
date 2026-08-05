/**
 * "Who gets notified" logic per business domain. Kept separate from
 * notificationService.js (generic materialization) and from the
 * calling business service (activity/grade/attendance/etc.) so the
 * same resolver can be reused by every event that shares the same
 * audience rule.
 *
 * Every resolver takes a `runner` (pool.promise() or an open
 * transaction connection -- same convention as classAccessService.js)
 * so it can run inside the caller's own transaction.
 */

/**
 * Active-enrollment audience for course/class-scoped academic
 * content (activities, exams, contents, sessions): class_id NULL
 * reaches every actively-enrolled student in the course; a specific
 * class_id narrows it to that class only. Locked/inactive/completed/
 * cancelled enrollments and inactive students never receive new
 * academic publications.
 */
async function resolveActiveStudentsForCourseOrClass(runner, { courseId, classId }) {
  const conditions = ["e.course_id = ?", "e.status = 'active'", "s.status = 'active'"];
  const params = [courseId];

  if (classId !== null && classId !== undefined) {
    conditions.push("e.class_id = ?");
    params.push(classId);
  }

  const [rows] = await runner.query(
    `
      SELECT DISTINCT u.id AS user_id, u.name, u.email
      FROM enrollments e
      INNER JOIN students s ON s.id = e.student_id
      INNER JOIN users u ON u.id = s.user_id
      WHERE ${conditions.join(" AND ")}
    `,
    params
  );

  return rows.map((row) => ({
    userId: row.user_id,
    role: "student",
    name: row.name,
    email: row.email,
  }));
}

module.exports = {
  resolveActiveStudentsForCourseOrClass,
};
