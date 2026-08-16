/**
 * Espelho do frontend de backend/config/legalVersions.js -- mesmos
 * valores, arquivo separado por não haver pacote compartilhado entre
 * backend e frontend neste projeto. O backend sempre revalida que a
 * versão enviada bate com a atual antes de gravar um aceite; um
 * frontend em cache desatualizado nunca consegue registrar uma versão
 * antiga como se fosse a atual.
 *
 * IMPORTANTE: o texto jurídico real de Termos de Uso/Política de
 * Privacidade ainda não foi fornecido/revisado -- ver
 * src/pages/public/TermsOfUse.jsx e PrivacyPolicy.jsx, que exibem
 * texto placeholder claramente identificado como tal.
 */
export const CURRENT_TERMS_VERSION = "1.0.0-placeholder";
export const CURRENT_PRIVACY_VERSION = "1.0.0-placeholder";
