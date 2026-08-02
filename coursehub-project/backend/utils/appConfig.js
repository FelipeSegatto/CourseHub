/**
 * Única fonte de configuração de fuso horário da aplicação. Todo
 * módulo que formata data/hora para exibição (hoje, principalmente
 * o academic-calendar) deve importar TIMEZONE daqui em vez de
 * hardcodar a string em vários lugares.
 *
 * "America/Sao_Paulo" é o identificador IANA correto para o horário
 * de Brasília — não existe "America/Brasilia" na tzdata.
 */
const TIMEZONE = "America/Sao_Paulo";

/**
 * Formata uma coluna DATE/DATETIME do MySQL como "YYYY-MM-DD".
 *
 * mysql2 devolve essas colunas como um objeto Date construído no
 * fuso LOCAL do processo Node (não em UTC) — por isso lemos com
 * getFullYear/getMonth/getDate (getters locais), nunca
 * toISOString(), que corta pelo horário UTC e pode devolver o dia
 * anterior dependendo do fuso do servidor.
 */
function formatDateOnly(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Formata uma coluna TIME do MySQL ("09:00:00", já string) como
 * "HH:mm". Colunas TIME não sofrem o problema de fuso do DATE —
 * mysql2 já devolve como string simples.
 */
function formatTimeOnly(value) {
  if (!value) return null;

  return String(value).slice(0, 5);
}

module.exports = { TIMEZONE, formatDateOnly, formatTimeOnly };
