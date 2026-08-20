import { DropdownMenu } from "radix-ui";
import { MoreHorizontal } from "lucide-react";

/**
 * Menu "Mais ações" pra linhas com ações demais competindo por
 * espaço -- usa o Radix DropdownMenu (já é dependência do projeto,
 * ver CalendarPage.jsx/Dialog) em vez de reimplementar teclado/foco/
 * fechamento na mão. Escape fecha, clique fora fecha, navegação por
 * seta funciona, foco visível vem de graça do Radix.
 *
 * items: [{ key, label, icon, onClick, variant, disabled, separator, title }]
 * separator:true desenha uma linha ANTES do item (usado pra isolar a
 * ação destrutiva do resto, como pedido: "item destrutivo ao final").
 */
const ITEM_VARIANT_CLASSES = {
  neutral: "text-gray-700 data-[highlighted]:bg-gray-50",
  warning: "text-amber-700 data-[highlighted]:bg-amber-50",
  danger: "text-red-600 data-[highlighted]:bg-red-50",
};

export default function RowActionsMenu({ items, label = "Mais ações" }) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg focus:outline-none"
        >
          {visibleItems.map((item) => (
            <div key={item.key}>
              {item.separator && <DropdownMenu.Separator className="my-1.5 h-px bg-gray-100" />}

              <DropdownMenu.Item
                disabled={item.disabled}
                onSelect={item.onClick}
                title={item.title}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${
                  ITEM_VARIANT_CLASSES[item.variant] || ITEM_VARIANT_CLASSES.neutral
                }`}
              >
                {item.icon && <item.icon size={15} aria-hidden="true" />}
                {item.label}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
