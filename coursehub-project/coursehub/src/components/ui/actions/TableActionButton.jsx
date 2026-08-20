import { Link } from "react-router-dom";

/**
 * Botão/link de ação de linha com hierarquia visual coerente --
 * criado pra parar de repetir "cada ação com uma cor de fundo
 * diferente" em cada página. As variantes representam INTENÇÃO, não
 * cor solta:
 *
 * - primary: CTA sólido da página (raro dentro de uma linha de
 *   tabela -- normalmente só o botão "Novo X" do cabeçalho usa isso).
 * - accent: ação principal DAQUELA linha (Ver detalhes, Abrir turma,
 *   Corrigir, Gerenciar...) -- compacta, azul suave, nunca compete
 *   com o CTA sólido da página.
 * - neutral: ação secundária (Editar, Duplicar, Alterar turma...) --
 *   outline neutro, mesmo peso visual em toda a tela.
 * - warning: mudança de estado (Ativar/Inativar/Bloquear...) --
 *   discreta, contextual, nunca um bloco grande colorido.
 * - danger: ação destrutiva/encerramento (Cancelar, Remover,
 *   Excluir...) -- vermelho contido, sempre a última opção visual.
 *
 * Renderiza <Link> quando `to` é passado, <button> caso contrário --
 * nunca muda o handler/comportamento de quem já usa onClick.
 */
const VARIANT_CLASSES = {
  primary:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500",
  accent:
    "bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-500",
  neutral:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-blue-500",
  warning:
    "text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500",
  danger:
    "text-red-600 hover:bg-red-50 focus-visible:ring-red-500",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
};

export default function TableActionButton({
  children,
  variant = "neutral",
  size = "md",
  to,
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  "aria-label": ariaLabel,
  title,
  className = "",
  type = "button",
}) {
  const baseClasses = [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral,
    className,
  ].join(" ");

  const content = (
    <>
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        Icon && <Icon size={14} aria-hidden="true" />
      )}
      {children && <span>{children}</span>}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={baseClasses} aria-label={ariaLabel} title={title}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
      aria-label={ariaLabel}
      title={title}
    >
      {content}
    </button>
  );
}
