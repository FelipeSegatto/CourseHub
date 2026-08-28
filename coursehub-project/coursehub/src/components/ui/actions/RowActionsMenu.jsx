import { useRef, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontal } from "lucide-react";

const ITEM_VARIANT_CLASSES = {
  neutral: "text-gray-700 data-[highlighted]:bg-gray-50",
  warning: "text-amber-700 data-[highlighted]:bg-amber-50",
  danger: "text-red-600 data-[highlighted]:bg-red-50",
};

/**
 * Item destrutivo com hold-to-confirm.
 *
 * O DropdownMenu NÃO fecha enquanto o usuário estiver segurando.
 * A ação só é disparada quando o tempo de confirmação é concluído.
 */
function DestructiveMenuItem({
  item,
  onConfirmed,
  holdDuration = 1200,
}) {
  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  

  const timerRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startHolding(event) {
    if (item.disabled || confirmed) return;

    event.preventDefault();

    clearTimer();

    setHolding(true);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      setHolding(false);
      setConfirmed(true);

      /*
       * Executa a ação destrutiva somente depois
       * da confirmação completa.
       */
      item.onClick?.();

      window.setTimeout(() => {
        onConfirmed?.();
      }, 250);
    }, item.holdDuration || holdDuration);
  }

  function cancelHolding() {
    clearTimer();

    if (!confirmed) {
      setHolding(false);
    }
  }

  return (
    <DropdownMenu.Item
      disabled={item.disabled}
      title={item.title}

      /*
       * O Radix tentaria executar/fechar o item
       * com um clique comum.
       *
       * Impedimos isso porque a confirmação
       * depende do hold.
       */
      onSelect={(event) => {
        event.preventDefault();
      }}
      className={`
        relative
        flex
        cursor-pointer
        select-none
        items-center
        overflow-hidden
        rounded-lg
        px-3
        py-2
        text-sm
        font-medium
        outline-none
        transition

        data-[disabled]:cursor-not-allowed
        data-[disabled]:opacity-50

        ${
          holding || confirmed
            ? "text-white"
            : "text-red-600 data-[highlighted]:bg-red-50"
        }
      `}
      onPointerDown={startHolding}
      onPointerUp={cancelHolding}
      onPointerLeave={cancelHolding}
      onPointerCancel={cancelHolding}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* preenchimento circular */}
      <span
        aria-hidden="true"
        className={`
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          aspect-square
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-red-600
          ease-linear

          ${
            holding || confirmed
              ? "w-[250%] opacity-100"
              : "w-0 opacity-0"
          }
        `}
        style={{
          transitionProperty: "width, opacity",
          transitionDuration: holding
            ? `${item.holdDuration || holdDuration}ms`
            : "180ms",
        }}
      />

      <span className="relative z-10 flex items-center gap-2">
        {item.icon && (
          <item.icon
            size={15}
            aria-hidden="true"
          />
        )}

        <span>
          {confirmed
            ? item.confirmedLabel || "Confirmado"
            : holding
              ? item.holdLabel || "Continue segurando..."
              : item.label}
        </span>
      </span>
    </DropdownMenu.Item>
  );
}

export default function RowActionsMenu({
  items,
  label = "Mais ações",
}) {
  const [open, setOpen] = useState(false);

  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="
            inline-flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            border
            border-gray-300
            bg-white
            text-gray-500
            transition
            hover:bg-gray-50
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-500
            focus-visible:ring-offset-1
          "
        >
          <MoreHorizontal
            size={16}
            aria-hidden="true"
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="
            z-50
            min-w-[190px]
            rounded-xl
            border
            border-gray-200
            bg-white
            p-1.5
            shadow-lg
            focus:outline-none
          "
        >
          {visibleItems.map((item) => {
            const isHoldAction = item.holdToConfirm === true;

            return (
              <div key={item.key}>
                {item.separator && (
                  <DropdownMenu.Separator
                    className="my-1.5 h-px bg-gray-100"
                  />
                )}

                {isHoldAction ?  (
                  <DestructiveMenuItem
                    item={item}
                    onConfirmed={() => setOpen(false)}
                  />
                ) : (
                  <DropdownMenu.Item
                    disabled={item.disabled}
                    onSelect={item.onClick}
                    title={item.title}
                    className={`
                      flex
                      cursor-pointer
                      items-center
                      gap-2
                      rounded-lg
                      px-3
                      py-2
                      text-sm
                      font-medium
                      outline-none
                      transition

                      data-[disabled]:cursor-not-allowed
                      data-[disabled]:opacity-50

                      ${
                        ITEM_VARIANT_CLASSES[item.variant] ||
                        ITEM_VARIANT_CLASSES.neutral
                      }
                    `}
                  >
                    {item.icon && (
                      <item.icon
                        size={15}
                        aria-hidden="true"
                      />
                    )}

                    {item.label}
                  </DropdownMenu.Item>
                )}
              </div>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}