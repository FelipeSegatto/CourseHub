const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const authorizeRoles = require("../middlewares/authorizeRoles");

const {
  listClasses,
  getClassDetail,
  listClassStudents,
  listClassActivities,
} = require("../services/teacher/teacherClassService");

const router = express.Router();

function handleServiceError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : fallbackMessage,
    error: error.statusCode ? undefined : error.message,
    sqlMessage: error.statusCode ? undefined : error.sqlMessage,
    code: error.statusCode ? undefined : error.code,
  });
}

/**
 * GET /api/teacher/by-user/:userId/classes
 */
router.get(
  "/teacher/by-user/:userId/classes",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const result = await listClasses(db, {
        userId: req.auth.userId,
        status: req.query.status,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(
        res,
        error,
        "Erro interno ao buscar turmas do professor."
      );
    }
  }
);

/**
 * GET /api/teacher/by-user/:userId/classes/:classId
 */
router.get(
  "/teacher/by-user/:userId/classes/:classId",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const result = await getClassDetail(db, {
        userId: req.auth.userId,
        classId: Number(req.params.classId),
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(
        res,
        error,
        "Erro interno ao buscar os dados da turma."
      );
    }
  }
);

/**
 * GET /api/teacher/by-user/:userId/classes/:classId/students
 */
router.get(
  "/teacher/by-user/:userId/classes/:classId/students",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const result = await listClassStudents(db, {
        userId: req.auth.userId,
        classId: Number(req.params.classId),
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(
        res,
        error,
        "Erro interno ao buscar os alunos da turma."
      );
    }
  }
);

/**
 * GET /api/teacher/by-user/:userId/classes/:classId/activities
 */
router.get(
  "/teacher/by-user/:userId/classes/:classId/activities",
  authenticateToken,
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const result = await listClassActivities(db, {
        userId: req.auth.userId,
        classId: Number(req.params.classId),
        activityKind: req.query.activityKind,
        status: req.query.status,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleServiceError(
        res,
        error,
        "Erro interno ao buscar as atividades da turma."
      );
    }
  }
);

module.exports = router;
