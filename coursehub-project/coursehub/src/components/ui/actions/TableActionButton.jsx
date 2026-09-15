import { useRef, useState } from "react";
import { Link } from "react-router-dom";

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
  xs: "px-2 py-1 text-[11px]",
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

  // hold-to-confirm
  holdToConfirm = false,
  holdDuration = 1200,
  holdLabel = "Segure para confirmar",
  confirmedLabel = "Confirmado",
}) {
  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const timerRef = useRef(null);

  const isHoldAction =
  holdToConfirm &&
  !to;

  const HOLD_FILL_CLASSES = {
  warning: "bg-amber-500",
  danger: "bg-red-600",
};

  const baseClasses = [
    "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "select-none",
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral,
    isHoldAction ? "overflow-hidden touch-none" : "",
    className,
  ].join(" ");

  function clearHoldTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleHoldStart(event) {
    if (!isHoldAction || disabled || loading || confirmed) return;

    // evita seleção de texto / comportamento indesejado
    event.preventDefault();

    clearHoldTimer();

    setHolding(true);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      setHolding(false);
      setConfirmed(true);

      onClick?.(event);

      window.setTimeout(() => {
        setConfirmed(false);
      }, 700);
    }, holdDuration);
  }

  function handleHoldCancel() {
    if (!isHoldAction) return;

    clearHoldTimer();

    if (!confirmed) {
      setHolding(false);
    }
  }

  function handleClick(event) {
    if (isHoldAction) {
      // impede click normal depois do pointerUp
      event.preventDefault();
      return;
    }

    onClick?.(event);
  }

  const content = (
    <>
      {loading ? (
        <span
          aria-hidden="true"
          className="relative z-10 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        Icon && (
          <Icon
            size={14}
            aria-hidden="true"
            className="relative z-10"
          />
        )
      )}

      {children}
    </>
  );

  /*
   * Link continua funcionando exatamente como antes.
   *
   * Hold-to-confirm não é aplicado em links porque a ação de navegação
   * aconteceria antes de termos uma confirmação semântica clara.
   */
  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={baseClasses}
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      onPointerDown={handleHoldStart}
      onPointerUp={handleHoldCancel}
      onPointerLeave={handleHoldCancel}
      onPointerCancel={handleHoldCancel}
      onContextMenu={
        isHoldAction
          ? (event) => event.preventDefault()
          : undefined
      }
      disabled={disabled || loading}
      className={baseClasses}
      aria-label={ariaLabel}
      title={title}
    >
      {/* preenchimento durante o hold */}
      {isHoldAction && (
        <span
          aria-hidden="true"
          className={`
            pointer-events-none
            absolute
            left-1/2
            top-1/2
            aspect-square
            w-[220%]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            transition-[transform,opacity]
            ease-linear

            ${HOLD_FILL_CLASSES[variant] || "bg-red-600"}

            ${
              holding || confirmed
                ? "scale-100 opacity-100"
                : "scale-0 opacity-0"
            }
          `}
          style={{
            transitionDuration: holding
              ? `${holdDuration}ms`
              : "180ms",
          }}
        />
      )}

      <span
        className={`
          relative
          z-10
          inline-flex
          items-center
          justify-center
          gap-1.5
          transition-colors
          duration-150

          ${
            isHoldAction && (holding || confirmed)
              ? "text-white"
              : ""
          }
        `}
      >
        {content}
      </span>
    </button>
  );
}