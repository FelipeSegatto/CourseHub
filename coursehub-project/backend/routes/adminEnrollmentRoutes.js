const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");

const {
  listEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  updateEnrollmentStatus,
  getClassChangeImpactPreview,
  changeEnrollmentClass,
} = require("../services/admin/adminEnrollmentService");

const router = express.Router();

function handleServiceError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({
    message: fallbackMessage,
    error: error.message,
    code: error.code,
    sqlMessage: error.sqlMessage,
  });
}

/**
 * GET /api/admin/enrollments
 */
router.get(
  "/admin/enrollments",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await listEnrollments(db, req.query);

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao buscar matrículas.");
    }
  }
);

/**
 * GET /api/admin/enrollments/:enrollmentId
 */
router.get(
  "/admin/enrollments/:enrollmentId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const enrollment = await getEnrollmentById(db, req.params.enrollmentId);

      return res.status(200).json(enrollment);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao buscar matrícula.");
    }
  }
);

/**
 * POST /api/admin/enrollments
 * Cria a matrícula e o contrato financeiro correspondente juntos.
 */
router.post(
  "/admin/enrollments",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const enrollment = await createEnrollment(db, req.body);

      return res.status(201).json({
        message: "Matrícula cadastrada com sucesso.",
        enrollment,
      });
    } catch (error) {
      return handleServiceError(res, error, "Erro ao cadastrar matrícula.");
    }
  }
);

/**
 * PUT /api/admin/enrollments/:enrollmentId
 * Só corrige a data de matrícula — status e turma têm endpoints
 * próprios.
 */
router.put(
  "/admin/enrollments/:enrollmentId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const enrollment = await updateEnrollment(db, req.params.enrollmentId, req.body);

      return res.status(200).json({
        message: "Matrícula atualizada com sucesso.",
        enrollment,
      });
    } catch (error) {
      return handleServiceError(res, error, "Erro ao atualizar matrícula.");
    }
  }
);

/**
 * PATCH /api/admin/enrollments/:enrollmentId/status
 */
router.patch(
  "/admin/enrollments/:enrollmentId/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const enrollment = await updateEnrollmentStatus(
        db,
        req.params.enrollmentId,
        req.body.status
      );

      return res.status(200).json({
        message: "Status da matrícula atualizado com sucesso.",
        enrollment,
      });
    } catch (error) {
      return handleServiceError(res, error, "Erro ao atualizar status da matrícula.");
    }
  }
);

/**
 * GET /api/admin/enrollments/:enrollmentId/class-change-impact
 * Prévia de impacto da turma atual, antes de confirmar a troca.
 */
router.get(
  "/admin/enrollments/:enrollmentId/class-change-impact",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const impact = await getClassChangeImpactPreview(db, req.params.enrollmentId);

      return res.status(200).json(impact);
    } catch (error) {
      return handleServiceError(res, error, "Erro ao calcular impacto da troca de turma.");
    }
  }
);

/**
 * POST /api/admin/enrollments/:enrollmentId/change-class
 */
router.post(
  "/admin/enrollments/:enrollmentId/change-class",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await changeEnrollmentClass(
        db,
        req.params.enrollmentId,
        { newClassId: req.body.newClassId, reason: req.body.reason },
        req.auth.userId
      );

      return res.status(200).json({
        message: "Turma da matrícula alterada com sucesso.",
        ...result,
      });
    } catch (error) {
      return handleServiceError(res, error, "Erro ao trocar a turma da matrícula.");
    }
  }
);

module.exports = router;
