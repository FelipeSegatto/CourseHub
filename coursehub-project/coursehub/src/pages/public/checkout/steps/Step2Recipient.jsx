import { User, Users } from "lucide-react";

/** Etapa 2 -- para quem é o curso? */
export default function Step2Recipient({ recipientMode, onSelect, onNext, onBack }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Etapa 2 de 5</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Para quem é o curso?</h2>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect("self")}
          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition ${
            recipientMode === "self" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <User size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">O curso é para mim</p>
            <p className="text-sm text-gray-500">Você será o aluno e o contratante da cobrança.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("other")}
          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition ${
            recipientMode === "other" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <Users size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">O curso é para outra pessoa</p>
            <p className="text-sm text-gray-500">
              Você contrata como responsável/empresa; outra pessoa será o aluno.
            </p>
          </div>
        </button>
      </div>

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
          disabled={!recipientMode}
          className="h-12 flex-[2] rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
