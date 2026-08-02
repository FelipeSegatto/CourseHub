const express = require("express");
const db = require("../db");

const {
  listUsers,
  registerStudent,
} = require("../services/public/publicUserService");

const router = express.Router();

/**
 * GET /api/users
 * Lista os usuários sem retornar os hashes das senhas.
 */
router.get("/users", async (req, res) => {
  try {
    const users = await listUsers(db);

    return res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);

    return res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

/**
 * POST /api/users
 * Cadastra um usuário aluno e cria seu perfil na tabela students.
 * Rota pública de cadastro — o cadastro administrativo permanece
 * em POST /api/admin/students.
 */
router.post("/users", async (req, res) => {
  try {
    const result = await registerStudent(db, req.body);

    return res.status(201).json({
      message: "Aluno cadastrado com sucesso.",
      ...result,
    });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Erro ao cadastrar usuário.",
    });
  }
});

module.exports = router;
