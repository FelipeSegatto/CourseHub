import { useState } from "react";

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BILLING_TYPE_LABEL = {
  one_time: "Pagamento único",
  monthly_plan: "Plano mensal",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Etapa 1 -- curso e plano já vêm carregados pelo wizard; aqui se
 * escolhe o plano e se informa o e-mail que recebe a verificação
 * (ver spec: "seleciona curso/plano -> informa e-mail financeiro").
 * onNext(email) só é chamado com um e-mail válido.
 */
export default function Step1CoursePlan({ course, plans, selectedPlanId, onSelectPlan, onNext, submitting, error }) {
  const [email, setEmail] = useState("");
  const emailValid = EMAIL_PATTERN.test(email);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Etapa 1 de 5</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Curso e plano</h2>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="font-semibold text-gray-900">{course.name}</p>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            className={`w-full rounded-xl border px-4 py-4 text-left transition ${
              String(selectedPlanId) === String(plan.id)
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-blue-600">
              {BILLING_TYPE_LABEL[plan.billingType] || plan.billingType}
            </p>
            <p className="mt-1 font-bold text-gray-900">{plan.name}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(plan.totalAmount)}</p>
            {plan.billingType === "monthly_plan" && plan.monthlyPaymentCount && (
              <p className="text-sm text-gray-500">
                {plan.monthlyPaymentCount}x de {formatCurrency(plan.monthlyPaymentAmount)}
              </p>
            )}
          </button>
        ))}
      </div>

      {selectedPlanId && (
        <div>
          <label htmlFor="checkout-email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Seu e-mail
          </label>
          <input
            id="checkout-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-[15px] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Enviaremos um link de confirmação antes de continuar.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={() => onNext(email)}
        disabled={!selectedPlanId || !emailValid || submitting}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? "Enviando..." : "Continuar"}
      </button>
    </div>
  );
}
