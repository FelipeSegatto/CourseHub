const { createServiceError } = require("../classes/classAccessService");

const ALLOWED_QUESTION_TYPES = ["multiple_choice", "text", "upload"];

function isOptionCorrect(option) {
  return (
    option.is_correct === true ||
    option.is_correct === 1 ||
    option.is_correct === "1" ||
    option.is_correct === "true"
  );
}

/**
 * Valida a lista de questões de uma atividade/avaliação. Lança
 * erro de negócio (400) na primeira inconsistência encontrada.
 * Compartilhada entre teacher e admin — a regra é idêntica nos
 * dois contextos, só a posse do recurso muda.
 */
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw createServiceError("Adicione pelo menos uma questão.", 400);
  }

  questions.forEach((question, questionIndex) => {
    const displayedQuestionNumber = questionIndex + 1;

    if (!question.question_text?.trim()) {
      throw createServiceError(
        `O enunciado da questão ${displayedQuestionNumber} é obrigatório.`,
        400
      );
    }

    if (!ALLOWED_QUESTION_TYPES.includes(question.question_type)) {
      throw createServiceError(
        `O tipo da questão ${displayedQuestionNumber} é inválido.`,
        400
      );
    }

    if (
      question.points !== undefined &&
      question.points !== null &&
      Number(question.points) <= 0
    ) {
      throw createServiceError(
        `A pontuação da questão ${displayedQuestionNumber} deve ser maior que zero.`,
        400
      );
    }

    if (question.question_type === "multiple_choice") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw createServiceError(
          `A questão ${displayedQuestionNumber} precisa ter pelo menos duas alternativas.`,
          400
        );
      }

      const hasEmptyOption = question.options.some(
        (option) => !option.option_text?.trim()
      );

      if (hasEmptyOption) {
        throw createServiceError(
          `Preencha todas as alternativas da questão ${displayedQuestionNumber}.`,
          400
        );
      }

      const hasCorrectOption = question.options.some(isOptionCorrect);

      if (!hasCorrectOption) {
        throw createServiceError(
          `Marque pelo menos uma alternativa correta na questão ${displayedQuestionNumber}.`,
          400
        );
      }
    }
  });
}

/**
 * Normaliza a estrutura de questões (do banco ou recebida do
 * cliente) para comparação por igualdade profunda — usada para
 * decidir se uma edição realmente mudou perguntas/alternativas.
 */
function buildQuestionStructureForDiff(questions) {
  return questions.map((question, index) => ({
    id:
      question.id !== undefined && question.id !== null && question.id !== ""
        ? Number(question.id)
        : null,
    question_text: question.question_text.trim(),
    question_type: question.question_type,
    points: Number(question.points),
    order_index: index + 1,
    options:
      question.question_type === "multiple_choice"
        ? (question.options || []).map((option) => ({
            id:
              option.id !== undefined && option.id !== null && option.id !== ""
                ? Number(option.id)
                : null,
            option_text: option.option_text.trim(),
            is_correct: isOptionCorrect(option),
          }))
        : [],
  }));
}

function haveQuestionsChanged(currentStructure, receivedStructure) {
  return JSON.stringify(currentStructure) !== JSON.stringify(receivedStructure);
}

module.exports = {
  ALLOWED_QUESTION_TYPES,
  isOptionCorrect,
  validateQuestions,
  buildQuestionStructureForDiff,
  haveQuestionsChanged,
};
