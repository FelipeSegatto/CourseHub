import { Link } from "react-router-dom";

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Etapa 4 -- revisão dos dados + aceite explícito de Termos/Privacidade. */
export default function Step4ReviewAcceptance({
  course,
  plan,
  studentCandidate,
  recipientMode,
  contractingPartyData,
  accepted,
  onToggleAccepted,
  onNext,
  onBack,
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Etapa 4 de 5</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Revisão</h2>
      </div>

      <dl className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Curso</dt>
          <dd className="font-medium text-gray-900">{course.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Plano</dt>
          <dd className="font-medium text-gray-900">{plan.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Valor</dt>
          <dd className="font-semibold text-gray-900">{formatCurrency(plan.totalAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Aluno</dt>
          <dd className="font-medium text-gray-900">{studentCandidate.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Contratante</dt>
          <dd className="font-medium text-gray-900">
            {recipientMode === "self" ? studentCandidate.name : contractingPartyData?.name}
          </dd>
        </div>
      </dl>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={accepted} onChange={onToggleAccepted} className="mt-0.5" />
        <span>
          Li e aceito os{" "}
          <Link to="/termos-de-uso" target="_blank" className="text-blue-600 underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link to="/politica-de-privacidade" target="_blank" className="text-blue-600 underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl border border-gray-300 px-5 text-[15px] font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!accepted}
          className="h-12 flex-[2] rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Continuar para pagamento
        </button>
      </div>
    </div>
  );
}
