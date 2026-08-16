import PaymentMethodSelector from "../../../../components/payment/PaymentMethodSelector";
import CreditCardPaymentPanel from "../../../../components/payment/CreditCardPaymentPanel";

/**
 * Etapa 5 -- escolha do método e submissão final. Pix/boleto disparam
 * a submissão direto; cartão só submete depois que o Brick tokeniza
 * (onCardToken).
 */
export default function Step5Payment({
  plan,
  acceptedMethods,
  selectedMethod,
  onSelectMethod,
  onCardToken,
  submitting,
  error,
  onBack,
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Etapa 5 de 5</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Pagamento</h2>
      </div>

      <PaymentMethodSelector
        acceptedMethods={acceptedMethods}
        selected={selectedMethod}
        onSelect={onSelectMethod}
        disabled={submitting}
      />

      {selectedMethod === "credit_card" && (
        <CreditCardPaymentPanel amount={plan.totalAmount} onToken={onCardToken} submitting={submitting} />
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="h-12 w-full rounded-xl border border-gray-300 px-5 text-[15px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed"
      >
        Voltar
      </button>
    </div>
  );
}
