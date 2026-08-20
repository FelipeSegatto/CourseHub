/*
 * Cores dos gráficos de rosca de progresso, extraídas em arquivo
 * próprio (não em ProgressDonutChart.jsx) porque um arquivo de
 * componente só pode exportar componentes sem quebrar o Fast Refresh
 * (react-refresh/only-export-components).
 *
 * Conteúdo: verde = concluído, azul = em andamento, cinza = não
 * iniciado. Acadêmico: verde = corrigidas, azul = aguardando
 * correção, amarelo = pendentes, vermelho = devolvidas.
 */
export const CONTENT_CHART_COLORS = ["#22c55e", "#3b82f6", "#d1d5db"];
export const ACADEMIC_CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
