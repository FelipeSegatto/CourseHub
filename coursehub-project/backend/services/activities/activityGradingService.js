const { createServiceError } = require("../classes/classAccessService");
const { validateStudentActivityScope } = require("./activityScopeService");

function normalizePositiveId(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0
    ? normalized
    : null;
}

/**
 * Corrige uma entrega e registra sua nota oficial. A submissão
 * precisa pertencer a um aluno elegível para o escopo da
 * atividade (geral ou mesma turma) — nunca corrige com base
 * apenas no course_id.
 */
async function gradeSubmission(
  db,
  { userId, submissionId, answers, feedback }
) {
  const normalizedSubmissionId = normalizePositiveId(submissionId);

  if (!normalizedSubmissionId) {
    throw createServiceError("ID da entrega inválido.", 400);
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw createServiceError(
      "Envie a correção de pelo menos uma resposta.",
      400
    );
  }

  const normalizedGeneralFeedback =
    typeof feedback === "string" ? feedback.trim() || null : null;

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [submissionRows] = await connection.query(
      `
        SELECT
          s.id AS submission_id,
          s.student_id,
          s.activity_id,
          s.status AS submission_status,

          a.course_id,
          a.class_id,
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
      [normalizedSubmissionId, userId]
    );

    if (submissionRows.length === 0) {
      throw createServiceError(
        "Entrega não encontrada ou não pertence ao professor.",
        404
      );
    }

    const submission = submissionRows[0];

    /*
     * Confirma que o aluno dono da entrega é elegível ao escopo da
     * atividade (geral ou mesma turma). Uma entrega que já existe
     * mas pertence a um aluno fora do escopo indica uma
     * inconsistência de dados (ex.: transferência de turma) — não
     * um "não encontrado" comum, por isso 409.
     */
    const [enrollmentRows] = await connection.query(
      `
        SELECT id, student_id, course_id, class_id, status
        FROM enrollments
        WHERE student_id = ?
          AND course_id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [submission.student_id, submission.course_id]
    );

    const enrollment = enrollmentRows[0] || null;

    if (
      !enrollment ||
      !validateStudentActivityScope(
        { course_id: submission.course_id, class_id: submission.class_id },
        enrollment
      )
    ) {
      throw createServiceError(
        "Esta entrega não pertence a um aluno elegível para esta atividade.",
        409
      );
    }

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
      throw createServiceError(
        "Esta entrega não possui respostas para corrigir.",
        400
      );
    }

    const databaseAnswerMap = new Map();

    databaseAnswers.forEach((answer) => {
      databaseAnswerMap.set(Number(answer.answer_id), answer);
    });

    const receivedAnswerIds = answers.map((answer) =>
      Number(answer.answer_id)
    );

    const uniqueAnswerIds = new Set(receivedAnswerIds);

    if (uniqueAnswerIds.size !== answers.length) {
      throw createServiceError(
        "Existem correções duplicadas para a mesma resposta.",
        400
      );
    }

    const validatedAnswers = [];
    let totalScore = 0;

    for (let index = 0; index < answers.length; index++) {
      const receivedAnswer = answers[index];
      const answerId = Number(receivedAnswer.answer_id);
      const databaseAnswer = databaseAnswerMap.get(answerId);

      if (!databaseAnswer) {
        throw createServiceError(
          `A resposta informada na questão ${index + 1} é inválida.`,
          400
        );
      }

      if (
        receivedAnswer.score_awarded === undefined ||
        receivedAnswer.score_awarded === null ||
        receivedAnswer.score_awarded === ""
      ) {
        throw createServiceError(
          `Informe a pontuação da questão ${index + 1}.`,
          400
        );
      }

      const scoreAwarded = Number(receivedAnswer.score_awarded);
      const maxPoints = Number(databaseAnswer.max_points);

      if (Number.isNaN(scoreAwarded)) {
        throw createServiceError(
          `A pontuação da questão ${index + 1} é inválida.`,
          400
        );
      }

      if (scoreAwarded < 0) {
        throw createServiceError(
          `A questão ${index + 1} não pode receber pontuação negativa.`,
          400
        );
      }

      if (!Number.isNaN(maxPoints) && scoreAwarded > maxPoints) {
        throw createServiceError(
          `A questão ${index + 1} vale no máximo ${maxPoints} ponto(s).`,
          400
        );
      }

      let isCorrect = null;

      if (databaseAnswer.question_type === "multiple_choice") {
        isCorrect =
          databaseAnswer.selected_option_is_correct === 1 ||
          databaseAnswer.selected_option_is_correct === true ||
          databaseAnswer.selected_option_is_correct === "1"
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

    const hasMissingAnswer = databaseAnswers.some(
      (answer) => !uniqueAnswerIds.has(Number(answer.answer_id))
    );

    if (hasMissingAnswer) {
      throw createServiceError(
        "Todas as respostas devem receber uma pontuação.",
        400
      );
    }

    const activityMaxScore = Number(submission.max_score);

    totalScore = Math.round((totalScore + Number.EPSILON) * 100) / 100;

    if (!Number.isNaN(activityMaxScore) && totalScore > activityMaxScore) {
      throw createServiceError(
        `A nota total não pode ultrapassar ${activityMaxScore}.`,
        400
      );
    }

    for (const answer of validatedAnswers) {
      const [answerUpdateResult] = await connection.query(
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
        throw createServiceError(
          "Não foi possível atualizar uma das respostas.",
          404
        );
      }
    }

    const [submissionUpdateResult] = await connection.query(
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
      throw createServiceError(
        "Não foi possível atualizar a entrega.",
        404
      );
    }

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

    await connection.commit();

    return {
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
        graded_by_teacher_id: submission.teacher_id,
      },

      answers: validatedAnswers.map((answer) => ({
        answer_id: answer.answerId,
        score_awarded: answer.scoreAwarded,
        feedback: answer.feedback,
        is_correct: answer.isCorrect,
      })),
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(
        "Erro ao desfazer a transação de correção:",
        rollbackError
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Lista as notas oficiais do aluno autenticado, considerando
 * apenas notas de atividades gerais do curso ou específicas da
 * turma da matrícula do aluno naquele curso.
 */
async function getStudentGrades(db, { userId }) {
  const runner = db.promise();

  const [studentRows] = await runner.execute(
    `
      SELECT id, name, email, registration_number
      FROM students
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  if (studentRows.length === 0) {
    throw createServiceError("Aluno não encontrado.", 404);
  }

  const studentId = studentRows[0].id;

  const [grades] = await runner.execute(
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
        a.class_id,

        cl.name AS class_name,

        s.status AS submission_status,
        s.submitted_at,

        t.name AS teacher_name

      FROM grades g

      INNER JOIN courses c
        ON c.id = g.course_id

      INNER JOIN activities a
        ON a.id = g.activity_id

      LEFT JOIN classes cl
        ON cl.id = a.class_id

      INNER JOIN submissions s
        ON s.id = g.submission_id

      LEFT JOIN teachers t
        ON t.id = g.teacher_id

      LEFT JOIN enrollments e
        ON e.student_id = g.student_id
        AND e.course_id = g.course_id

      WHERE g.student_id = ?
        AND (
          a.class_id IS NULL
          OR a.class_id = e.class_id
        )

      ORDER BY
        g.graded_at DESC,
        g.id DESC
    `,
    [studentId]
  );

  return grades.map((grade) => ({
    ...grade,
    classId: grade.class_id,
    className: grade.class_name,
  }));
}

module.exports = {
  gradeSubmission,
  getStudentGrades,
};
