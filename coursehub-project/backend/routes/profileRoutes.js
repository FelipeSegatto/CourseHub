const express = require("express");
const db = require("../db");
const authenticateToken = require("../middlewares/authenticateToken");
const { clearAuthCookies } = require("../utils/cookies");

const {
  getFullProfile,
  updateProfile,
  updatePassword,
} = require("../services/profile/profileService");

const router = express.Router();

/**
 * GET /api/profile/me
 */
router.get("/profile/me", authenticateToken, async (req, res) => {
  try {
    const profile = await getFullProfile(db, req.auth.userId);

    if (!profile) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (profile.status !== "active") {
      return res.status(403).json({ message: "Conta inativa ou bloqueada." });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);

    return res.status(500).json({ message: "Erro ao carregar perfil." });
  }
});

/**
 * PATCH /api/profile/me
 */
router.patch("/profile/me", authenticateToken, async (req, res) => {
  try {
    const profile = await updateProfile(db, {
      userId: req.auth.userId,
      role: req.auth.role,
      payload: req.body,
    });

    return res.status(200).json({
      message: "Perfil atualizado com sucesso.",
      profile,
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Erro ao atualizar perfil.",
    });
  }
});

/**
 * PATCH /api/profile/me/password
 *
 * Ao trocar a senha, revoga todos os refresh tokens do usuário —
 * qualquer outra sessão aberta (outro navegador, outro dispositivo)
 * precisa fazer login de novo.
 */
router.patch(
  "/profile/me/password",
  authenticateToken,
  async (req, res) => {
    try {
      await updatePassword(db, {
        userId: req.auth.userId,
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
      });

      clearAuthCookies(res);

      return res.status(200).json({
        message: "Senha alterada com sucesso. Faça login novamente.",
      });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode
          ? error.message
          : "Erro ao atualizar senha.",
      });
    }
  }
);

module.exports = router;
