/**
 * Versões atuais dos Termos de Uso e da Política de Privacidade.
 * Todo checkout que registra aceite (contract_acceptances) precisa
 * enviar exatamente estas versões -- uma versão diferente (frontend
 * em cache desatualizado) é rejeitada em vez de silenciosamente
 * aceita como se fosse a atual. Ver
 * coursehub/src/constants/legalVersions.js para o espelho do lado do
 * frontend (mesmos valores, arquivos separados por não haver um
 * pacote compartilhado entre backend e frontend neste projeto).
 *
 * IMPORTANTE: o conteúdo jurídico real dos Termos de Uso e da
 * Política de Privacidade ainda não foi fornecido/revisado -- as
 * páginas públicas (coursehub/src/pages/public/TermsOfUse.jsx e
 * PrivacyPolicy.jsx) exibem texto placeholder claramente identificado
 * como tal, seguindo o mesmo tratamento já dado aos dados
 * institucionais em contractTermsTemplate.js (campos [PREENCHER]).
 * O mecanismo de aceite (checkbox, versão, timestamp, IP, user agent)
 * é real e funcional -- só o texto jurídico é placeholder.
 */
const CURRENT_TERMS_VERSION = "1.0.0-placeholder";
const CURRENT_PRIVACY_VERSION = "1.0.0-placeholder";

module.exports = { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION };
