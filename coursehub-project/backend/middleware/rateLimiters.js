const rateLimit = require("express-rate-limit");

/**
 * Limita tentativas de login: 10 tentativas a cada 15 minutos por IP.
 * Objetivo: dificultar força bruta de senha sem atrapalhar uso normal.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas de login. Tente novamente em alguns minutos.",
  },
});

/**
 * Limita pedidos de recuperação de senha: 5 a cada 15 minutos por IP.
 * Evita spam de e-mails e tentativas de enumeração de contas.
 */
const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas solicitações. Tente novamente em alguns minutos.",
  },
});

module.exports = { loginRateLimiter, forgotPasswordRateLimiter };
