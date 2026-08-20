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

/**
 * Limita abertura de novas conversas/protocolos de chat: 10 a cada
 * 10 minutos por usuário. Diferente do limite de mensagens (que
 * protege uma conversa já aberta), este protege as filas de
 * atendimento em si -- sem ele, uma conta comprometida ou um
 * script poderia inundar a fila administrativa/de professores com
 * protocolos vazios.
 */
const chatConversationOpenRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitas conversas abertas em pouco tempo. Aguarde um instante antes de abrir outra.",
  },
});

/**
 * Limita reports de mensagem: 20 a cada hora por usuário. Reportar é
 * intencionalmente mais barato que abrir uma conversa (é uma ação de
 * um clique, não uma abertura de protocolo), mas ainda precisa de um
 * teto -- sem isso, alguém poderia tentar inundar a fila de
 * moderação para escondar reports legítimos no meio do ruído.
 */
/**
 * Limita a criação de tentativas de pagamento: 10 a cada 10 minutos
 * por usuário. Um aluno legítimo cria no máximo umas poucas
 * tentativas de PIX por fatura (uma nova a cada vez que a anterior
 * expira, a cada 30 minutos); isso só precisa ser generoso o
 * suficiente para não atrapalhar esse uso, e ao mesmo tempo limitar
 * quantas tentativas de cobrança uma conta comprometida ou um script
 * conseguiriam empurrar pelo gateway.
 */
const paymentCreateRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitas tentativas de pagamento em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

const chatReportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitos reports em pouco tempo. Aguarde um instante antes de reportar outra mensagem.",
  },
});

/**
 * Limita as rotas públicas de ativação de conta (validar token,
 * ativar): 8 a cada 15 minutos por IP. Mesma motivação de
 * forgotPasswordRateLimiter -- evita força bruta contra o token
 * opaco e martelar o endpoint de validação.
 */
const accountActivationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita a ação administrativa de reenviar convite/gerar link de
 * ativação: 5 a cada 10 minutos por admin. Cada chamada invalida o
 * token anterior -- sem um limite aqui, um admin (ou uma sessão
 * comprometida) poderia invalidar repetidamente o link que acabou de
 * ser entregue ao aluno.
 */
const accountActivationInvitationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitos convites gerados em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * Limita a troca de token por sessão / consulta de status no link
 * privado de pagamento de invoice: 20 a cada 15 minutos por IP. Rota
 * pré-sessão (ainda não há req.auth nem cookie de sessão válido para
 * usar como chave), então só IP faz sentido -- generoso o bastante
 * para um contratante legítimo abrindo o link algumas vezes, mas
 * limita força bruta de token opaco.
 */
const invoicePaymentLinkAccessRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita a ação administrativa de gerar/enviar/copiar o link de
 * pagamento de uma fatura: 5 a cada 10 minutos por admin. Mesma
 * motivação de accountActivationInvitationRateLimiter -- cada chamada
 * invalida o link anterior, então sem limite um admin (ou uma sessão
 * comprometida) poderia invalidar repetidamente o link que acabou de
 * ser entregue ao contratante.
 */
const invoicePaymentLinkAdminRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitos links gerados em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * Limita a criação de tentativas de pagamento pelo link privado de
 * invoice: 10 a cada 10 minutos por sessão de pagamento (fallback por
 * IP se, por algum motivo, o middleware de sessão ainda não rodou).
 * Mesmo teto de paymentCreateRateLimiter, só que chaveado pela sessão
 * de pagamento em vez de req.auth.userId, já que este canal nunca tem
 * um usuário autenticado.
 */
const publicInvoicePaymentCreateRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.invoicePaymentSession?.sessionId
      ? `session:${req.invoicePaymentSession.sessionId}`
      : ipKeyGenerator(req.ip),
  message: {
    message: "Muitas tentativas de pagamento em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * Limita a criação de sessões de checkout público (curso + plano +
 * e-mail): 5 a cada 15 minutos por IP. Primeira barreira contra spam
 * de contratos falsos antes mesmo da verificação de e-mail entrar em
 * jogo.
 */
const publicCheckoutSessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita validação/confirmação de e-mail do checkout público: 8 a
 * cada 15 minutos por IP -- mesmo teto de accountActivationRateLimiter,
 * mesma motivação (evita força bruta contra o token opaco).
 */
const checkoutEmailVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita a submissão final do checkout público (etapa 5 -- cria
 * aluno/contratante/contrato/invoice e inicia o pagamento): 5 a cada
 * 15 minutos por IP. É a rota mais cara desse fluxo (grava no banco),
 * então o teto é mais apertado que os de leitura/verificação.
 */
const checkoutContractSubmitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita a solicitação de geração de documentos formais (contrato, 2ª
 * via de fatura, recibo): 15 a cada 10 minutos por usuário. Cada
 * chamada é idempotente (não gera trabalho novo se já existe um
 * documento pronto para a mesma chave), então o teto só precisa
 * impedir abuso deliberado do worker, não uso normal.
 */
const documentGenerationRequestRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitas solicitações de documento em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * Limita o download de documentos gerados: 30 a cada 10 minutos por
 * usuário. Mais generoso que a geração (é só leitura de um arquivo já
 * pronto), mas ainda com teto para dificultar automatizar o download
 * em massa de documentos de terceiros mesmo que uma sessão vaze.
 */
const documentDownloadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitos downloads em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * Limita a rota pública de verificação de documento por código: 20 a
 * cada 15 minutos por IP -- sem autenticação (qualquer pessoa pode
 * verificar um certificado/declaração), então só IP faz sentido.
 * Generoso o bastante para alguém verificando alguns documentos
 * legítimos, mas limita força bruta contra o código opaco.
 */
const documentVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas de verificação. Aguarde alguns minutos antes de tentar novamente.",
  },
});

/**
 * Limita a exportação de relatórios em PDF: 15 a cada 10 minutos por
 * usuário -- mesmo teto de documentGenerationRequestRateLimiter, já
 * que renderizar um relatório também sobe um Chromium e monta um PDF
 * completo, o mesmo tipo de operação cara.
 */
const reportExportRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.auth?.userId ? String(req.auth.userId) : ipKeyGenerator(req.ip)),
  message: {
    message: "Muitas exportações de relatório em pouco tempo. Aguarde um instante antes de tentar novamente.",
  },
});

/**
 * "Não encontrou seu link?" (Fale conosco -> recuperação de link de
 * fatura por e-mail): limitado tanto por IP quanto por e-mail
 * normalizado -- por IP sozinho não impediria alguém testar uma lista
 * de e-mails a partir do mesmo endereço espalhando as tentativas ao
 * longo do tempo, e por e-mail sozinho não impediria varrer muitos
 * e-mails rapidamente do mesmo IP. Os dois limiters são aplicados em
 * sequência na rota (ver publicInvoicePaymentRoutes.js).
 */
const invoicePaymentLinkRecoveryByIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});

const invoicePaymentLinkRecoveryByEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || "").trim().toLowerCase() || ipKeyGenerator(req.ip),
  message: {
    message: "Muitas tentativas para este e-mail. Aguarde alguns minutos antes de tentar novamente.",
  },
});

module.exports = {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  chatMessageRateLimiter,
  chatConversationOpenRateLimiter,
  chatReportRateLimiter,
  paymentCreateRateLimiter,
  accountActivationRateLimiter,
  accountActivationInvitationRateLimiter,
  invoicePaymentLinkAccessRateLimiter,
  invoicePaymentLinkAdminRateLimiter,
  publicInvoicePaymentCreateRateLimiter,
  publicCheckoutSessionRateLimiter,
  checkoutEmailVerificationRateLimiter,
  checkoutContractSubmitRateLimiter,
  documentGenerationRequestRateLimiter,
  documentDownloadRateLimiter,
  documentVerificationRateLimiter,
  reportExportRateLimiter,
  invoicePaymentLinkRecoveryByIpRateLimiter,
  invoicePaymentLinkRecoveryByEmailRateLimiter,
};
