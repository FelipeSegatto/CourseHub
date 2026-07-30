import InvoiceStatusBadge from "./InvoiceStatusBadge";

function formatCurrency(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const dateValue =
    typeof value === "string"
      ? value.split("T")[0]
      : value;

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getInstallmentLabel(invoice) {
  const installmentNumber = Number(
    invoice.installmentNumber
  );

  const totalInstallments = Number(
    invoice.totalInstallments
  );

  if (
    Number.isFinite(installmentNumber) &&
    Number.isFinite(totalInstallments)
  ) {
    return `${installmentNumber}/${totalInstallments}`;
  }

  if (Number.isFinite(installmentNumber)) {
    return String(installmentNumber);
  }

  return "—";
}

function EmptyInvoicesState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-500">
        $
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Nenhuma fatura encontrada
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        Este contrato ainda não possui faturas associadas.
      </p>
    </div>
  );
}

export default function ContractInvoicesTable({
  invoices = [],
  onOpenInvoice,
}) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return <EmptyInvoicesState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fatura
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Parcela
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vencimento
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Valor
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pago
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pagamento
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {invoices.map((invoice) => {
            const isOverdue =
              invoice.status === "overdue";

            return (
              <tr
                key={invoice.id}
                className={[
                  "transition-colors hover:bg-slate-50/80",
                  isOverdue
                    ? "border-l-4 border-l-red-400"
                    : "border-l-4 border-l-transparent",
                ].join(" ")}
              >
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenInvoice?.(invoice.id)
                    }
                    className="font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                  >
                    #{invoice.id}
                  </button>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {getInstallmentLabel(invoice)}
                </td>

                <td
                  className={[
                    "whitespace-nowrap px-5 py-4 text-sm",
                    isOverdue
                      ? "font-semibold text-red-700"
                      : "text-slate-600",
                  ].join(" ")}
                >
                  {formatDate(invoice.dueDate)}
                </td>

                <td className="px-5 py-4">
                  <InvoiceStatusBadge
                    status={invoice.status}
                  />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-800">
                  {formatCurrency(
                    invoice.amount ??
                      invoice.totalAmount
                  )}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700">
                  {formatCurrency(
                    invoice.paidAmount
                  )}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {formatDate(
                    invoice.paidAt ??
                      invoice.paymentDate
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenInvoice?.(invoice.id)
                    }
                    className={[
                      "inline-flex min-h-9 items-center justify-center",
                      "rounded-lg border border-slate-300 bg-white",
                      "px-3 text-xs font-semibold text-slate-700",
                      "transition hover:border-slate-400 hover:bg-slate-50",
                      "focus:outline-none focus:ring-2",
                      "focus:ring-blue-500 focus:ring-offset-2",
                    ].join(" ")}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}