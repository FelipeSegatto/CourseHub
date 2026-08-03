import { useEffect, useMemo, useState } from "react";

import { registerManualPayment } from "../../services/FinancialService";

import FinancialModal from "./FinancialModal";

const PAYMENT_METHODS = {
  cash: "Dinheiro",
  pix: "Pix",
  bank_transfer: "Transferência bancária",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  other: "Outro",
};

function getInvoiceAmount(invoice) {
  return Number(
    invoice?.amount ??
      invoice?.totalAmount ??
      invoice?.total_amount ??
      0
  );
}

function getPaidAmount(invoice) {
  return Number(
    invoice?.paidAmount ??
      invoice?.paid_amount ??
      0
  );
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function RegisterManualPaymentModal({
  open,
  invoice,
  onClose,
  onSuccess,
}) {
  const remainingAmount = useMemo(() => {
    return Math.max(
      getInvoiceAmount(invoice) -
        getPaidAmount(invoice),
      0
    );
  }, [invoice]);

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] =
    useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("pix");
  const [reference, setReference] =
    useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setAmount(
      remainingAmount > 0
        ? String(remainingAmount)
        : ""
    );

    setPaymentDate(getToday());
    setPaymentMethod("pix");
    setReference("");
    setNotes("");
    setError("");
  }, [open, remainingAmount]);

  async function handleSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Informe um valor de pagamento válido."
      );
      return;
    }

    if (numericAmount > remainingAmount) {
      setError(
        "O pagamento não pode ser maior que o saldo da fatura."
      );
      return;
    }

    if (!paymentDate) {
      setError("Informe a data do pagamento.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await registerManualPayment(
        invoice.id,
        {
          amount: numericAmount,
          paymentDate,
          paymentMethod,
          reference:
            reference.trim() || null,
          notes: notes.trim() || null,
        }
      );

      await onSuccess?.();
      onClose();
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Não foi possível registrar o pagamento."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <FinancialModal
      open={open}
      title="Registrar pagamento manual"
      description={`Registre um pagamento recebido para a fatura #${invoice?.id ?? ""}.`}
      submitLabel="Registrar pagamento"
      loading={loading}
      submitDisabled={
        !amount ||
        !paymentDate ||
        !paymentMethod
      }
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Saldo disponível
        </p>

        <p className="mt-1 text-lg font-semibold text-blue-900">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(remainingAmount)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="manual-payment-amount"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Valor recebido
          </label>

          <input
            id="manual-payment-amount"
            type="number"
            min="0.01"
            max={remainingAmount}
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            disabled={loading}
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="manual-payment-date"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Data do pagamento
          </label>

          <input
            id="manual-payment-date"
            type="date"
            value={paymentDate}
            onChange={(event) =>
              setPaymentDate(event.target.value)
            }
            disabled={loading}
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="manual-payment-method"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Forma de pagamento
        </label>

        <select
          id="manual-payment-method"
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(event.target.value)
          }
          disabled={loading}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {Object.entries(PAYMENT_METHODS).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="manual-payment-reference"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Referência
        </label>

        <input
          id="manual-payment-reference"
          type="text"
          maxLength={255}
          value={reference}
          onChange={(event) =>
            setReference(event.target.value)
          }
          disabled={loading}
          placeholder="Identificador do comprovante ou transação"
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="manual-payment-notes"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Observações
        </label>

        <textarea
          id="manual-payment-notes"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          disabled={loading}
          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </FinancialModal>
  );
}