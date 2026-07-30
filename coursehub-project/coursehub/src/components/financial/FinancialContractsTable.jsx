import ContractStatusBadge from "./ContractStatusBadge";

const BILLING_TYPE_LABELS = {
  one_time: "Pagamento único",
  installments: "Parcelado",
  monthly_plan: "Plano mensal",
};

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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getBillingTypeLabel(billingType) {
  return (
    BILLING_TYPE_LABELS[billingType] ||
    billingType ||
    "Não informado"
  );
}

function getInvoiceLabel(invoiceCount) {
  const count = Number(invoiceCount) || 0;

  return `${count} ${count === 1 ? "fatura" : "faturas"}`;
}

export default function FinancialContractsTable({
  contracts,
  onOpenContract,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1280px] w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Contrato
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Matrícula
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Plano
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cobrança
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Valor total
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pago
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pendente
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Em atraso
            </th>

            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Próximo vencimento
            </th>

            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {contracts.map((contract) => {
            const hasOverdueAmount =
              Number(contract.overdueAmount) > 0;

            return (
              <tr
                key={contract.id}
                className={[
                  "transition-colors hover:bg-slate-50/80",
                  contract.status === "overdue"
                    ? "border-l-4 border-l-red-400"
                    : "border-l-4 border-l-transparent",
                ].join(" ")}
              >
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenContract(contract.id)
                    }
                    className="font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                  >
                    #{contract.id}
                  </button>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  #{contract.enrollmentId}
                </td>

                <td className="px-5 py-4">
                  <div className="flex min-w-[180px] flex-col gap-1">
                    <span className="font-medium text-slate-900">
                      {contract.planName ||
                        "Plano não informado"}
                    </span>

                    <span className="text-xs text-slate-500">
                      {getInvoiceLabel(
                        contract.invoiceCount
                      )}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {getBillingTypeLabel(
                    contract.billingType
                  )}
                </td>

                <td className="px-5 py-4">
                  <ContractStatusBadge
                    status={contract.status}
                  />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium tabular-nums text-slate-800">
                  {formatCurrency(contract.totalAmount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700">
                  {formatCurrency(contract.paidAmount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right text-sm tabular-nums text-slate-700">
                  {formatCurrency(contract.pendingAmount)}
                </td>

                <td
                  className={[
                    "whitespace-nowrap px-5 py-4 text-right",
                    "text-sm tabular-nums",
                    hasOverdueAmount
                      ? "font-semibold text-red-700"
                      : "text-slate-700",
                  ].join(" ")}
                >
                  {formatCurrency(contract.overdueAmount)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {formatDate(contract.nextDueDate)}
                </td>

                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenContract(contract.id)
                    }
                    className={[
                      "inline-flex min-h-9 items-center justify-center",
                      "rounded-lg border border-slate-300",
                      "bg-white px-3 py-1.5",
                      "text-xs font-semibold text-slate-700",
                      "transition",
                      "hover:border-slate-400 hover:bg-slate-50",
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