const express = require("express");
const db = require("../db");

const {
  loginRateLimiter,
  forgotPasswordRateLimiter,
} = require("../middlewares/rateLimiters");

const {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} = require("../utils/cookies");

const {
  login,
  revokeSession,
  refreshSession,
  requestPasswordReset,
  resetPassword,
} = require("../services/auth/authService");

const router = express.Router();

/**
 * POST /api/auth/login
 */
router.post("/auth/login", loginRateLimiter, async (req, res) => {
  try {
    const { accessToken, refreshToken, profile } = await login(db, req.body);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      profile,
    });
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Erro ao realizar login.",
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * O logout nunca pode falhar do ponto de vista do cliente — mesmo
 * que a revogação do refresh token dê erro, os cookies são limpos
 * e a resposta é sempre 200.
 */
router.post("/auth/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (refreshToken) {
      await revokeSession(refreshToken);
    }
  } catch (error) {
    console.error("Erro ao revogar refresh token:", error);
  }

  clearAuthCookies(res);

  return res.status(200).json({
    message: "Logout realizado com sucesso.",
  });
});

/**
 * POST /api/auth/refresh
 * Renova o access token usando o refresh token do cookie,
 * rotacionando-o a cada uso.
 */
router.post("/auth/refresh", async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    const { accessToken, refreshToken } = await refreshSession(db, {
      refreshToken: currentRefreshToken,
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({ message: "Sessão renovada." });
  } catch (error) {
    console.error("Erro ao renovar sessão:", error);

    if (error.clearCookies) {
      clearAuthCookies(res);
    }

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Erro ao renovar sessão.",
    });
  }
});

/**
 * POST /api/forgot-password/check-email
 * Sempre responde com a mesma mensagem genérica, exista ou não a
 * conta — evita enumeration attack.
 */
router.post(
  "/forgot-password/check-email",
  forgotPasswordRateLimiter,
  async (req, res) => {
    const genericResponse = {
      message:
        "Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha.",
    };

    try {
      await requestPasswordReset(db, req.body);

      return res.status(200).json(genericResponse);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }

      // Qualquer outro erro ainda responde com a mensagem genérica.
      return res.status(200).json(genericResponse);
    }
  }
);

/**
 * PATCH /api/forgot-password/reset
 */
router.patch(
  "/forgot-password/reset",
  forgotPasswordRateLimiter,
  async (req, res) => {
    try {
      await resetPassword(db, req.body);

      return res.status(200).json({
        message:
          "Senha redefinida com sucesso. Você já pode entrar novamente.",
      });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);

      return res.status(error.statusCode || 500).json({
        message: error.statusCode
          ? error.message
          : "Erro interno ao redefinir a senha.",
      });
    }
  }
);

module.exports = router;
