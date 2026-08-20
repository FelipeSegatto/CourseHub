/**
 * Dados institucionais públicos (página "Fale conosco"). Não reaproveita
 * INSTITUTION de services/financial/contractTermsTemplate.js de
 * propósito -- aquele objeto tem legalName/cnpj/address hardcoded como
 * placeholders literais "[PREENCHER]", pensado para o miolo de um
 * documento formal ainda não finalizado, nunca para aparecer numa
 * página pública. Aqui só entra o que a instituição realmente
 * configurou; campos não preenchidos ficam de fora da resposta em vez
 * de mostrar texto de placeholder pro visitante.
 *
 * Sem tabela de configuração persistida no banco hoje (confirmado --
 * nenhuma migration cria algo do tipo institution_settings) -- só env
 * vars com fallback seguro, no mesmo idioma de config/checkoutConfig.js.
 * Se um dia existir configuração institucional persistida, este módulo
 * deve passar a lê-la de lá em vez de env vars.
 */

function stringFromEnv(envVarName, fallback = "") {
  const value = process.env[envVarName];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const NAME = stringFromEnv("INSTITUTION_NAME", "CourseHub");
const SUPPORT_EMAIL = stringFromEnv("INSTITUTION_SUPPORT_EMAIL", "contato@coursehub.com");
const PHONE = stringFromEnv("INSTITUTION_PHONE");
const WHATSAPP = stringFromEnv("INSTITUTION_WHATSAPP");
const BUSINESS_HOURS = stringFromEnv("INSTITUTION_BUSINESS_HOURS", "Segunda a sexta, 9h às 18h");
const ADDRESS = stringFromEnv("INSTITUTION_ADDRESS");
const CNPJ = stringFromEnv("INSTITUTION_CNPJ");
const WEBSITE_URL = stringFromEnv("INSTITUTION_WEBSITE_URL");

/**
 * Lista explícita do que é seguro devolver em GET /api/public/institution
 * -- nunca segredos, chaves de pagamento, URLs internas, e-mail pessoal
 * de administrador ou qualquer dado de aluno/operação.
 */
function getPublicInstitutionInfo() {
  const info = {
    name: NAME,
    supportEmail: SUPPORT_EMAIL,
    businessHours: BUSINESS_HOURS,
  };

  if (PHONE) info.phone = PHONE;
  if (WHATSAPP) info.whatsapp = WHATSAPP;
  if (ADDRESS) info.address = ADDRESS;
  if (CNPJ) info.cnpj = CNPJ;
  if (WEBSITE_URL) info.websiteUrl = WEBSITE_URL;

  return info;
}

module.exports = { getPublicInstitutionInfo };
