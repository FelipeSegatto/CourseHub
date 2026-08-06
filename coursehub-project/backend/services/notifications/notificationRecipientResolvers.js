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

/**
 * Single-recipient audience: the teacher responsible for a course
 * (used by submission-received). courses.teacher_id is nullable and
 * a teacher can be inactive, so this can legitimately return null --
 * callers must treat that as "nobody to notify", not an error.
 */
async function resolveTeacherForCourse(runner, { courseId }) {
  const [rows] = await runner.query(
    `
      SELECT u.id AS user_id, u.name, u.email
      FROM courses c
      INNER JOIN teachers t ON t.id = c.teacher_id
      INNER JOIN users u ON u.id = t.user_id
      WHERE c.id = ?
        AND t.status = 'active'
        AND u.status = 'active'
      LIMIT 1
    `,
    [courseId]
  );

  if (rows.length === 0) {
    return null;
  }

  return { userId: rows[0].user_id, role: "teacher", name: rows[0].name, email: rows[0].email };
}

/**
 * Single-recipient audience: the student who owns a grade/attendance
 * record (used by grade-published and attendance-marked). Returns
 * null if the student or their user account is inactive -- same
 * "nobody to notify" contract as resolveTeacherForCourse.
 */
async function resolveStudentOwner(runner, { studentId }) {
  const [rows] = await runner.query(
    `
      SELECT u.id AS user_id, u.name, u.email
      FROM students s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.status = 'active'
        AND u.status = 'active'
      LIMIT 1
    `,
    [studentId]
  );

  if (rows.length === 0) {
    return null;
  }

  return { userId: rows[0].user_id, role: "student", name: rows[0].name, email: rows[0].email };
}

/**
 * Multi-recipient audience for institutional calendar events, keyed
 * by academic_calendar_events.scope_type. "institutional" reaches
 * every active student AND every active teacher; all_students/
 * all_teachers narrow to one role; course/class reuse the same
 * active-enrollment rule as academic content.
 */
async function resolveAllActiveStudents(runner) {
  const [rows] = await runner.query(
    `
      SELECT u.id AS user_id, u.name, u.email
      FROM students s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.status = 'active' AND u.status = 'active'
    `
  );

  return rows.map((row) => ({
    userId: row.user_id,
    role: "student",
    name: row.name,
    email: row.email,
  }));
}

async function resolveAllActiveTeachers(runner) {
  const [rows] = await runner.query(
    `
      SELECT u.id AS user_id, u.name, u.email
      FROM teachers t
      INNER JOIN users u ON u.id = t.user_id
      WHERE t.status = 'active' AND u.status = 'active'
    `
  );

  return rows.map((row) => ({
    userId: row.user_id,
    role: "teacher",
    name: row.name,
    email: row.email,
  }));
}

async function resolveCalendarAudience(runner, { scopeType, courseId, classId }) {
  if (scopeType === "institutional") {
    const [students, teachers] = await Promise.all([
      resolveAllActiveStudents(runner),
      resolveAllActiveTeachers(runner),
    ]);

    return [...students, ...teachers];
  }

  if (scopeType === "all_students") {
    return resolveAllActiveStudents(runner);
  }

  if (scopeType === "all_teachers") {
    return resolveAllActiveTeachers(runner);
  }

  if (scopeType === "course" || scopeType === "class") {
    return resolveActiveStudentsForCourseOrClass(runner, { courseId, classId });
  }

  return [];
}

module.exports = {
  resolveActiveStudentsForCourseOrClass,
  resolveTeacherForCourse,
  resolveStudentOwner,
  resolveCalendarAudience,
};
