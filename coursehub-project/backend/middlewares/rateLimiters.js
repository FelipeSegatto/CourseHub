const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

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

/**
 * Limita envio de mensagens de chat: 30 por minuto por usuário.
 * Objetivo: reduzir spam sem atrapalhar uma conversa normal. Ao
 * contrário dos limiters acima (pré-autenticação, só IP faz
 * sentido), esta rota já passou por authenticateToken quando o
 * limiter roda, então a chave é o userId -- várias contas atrás do
 * mesmo IP (rede da escola, NAT) não competem pelo mesmo limite.
 */
const chatMessageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitas mensagens em pouco tempo. Aguarde um instante antes de enviar outra.",
  },
});

module.exports = { loginRateLimiter, forgotPasswordRateLimiter, chatMessageRateLimiter };
