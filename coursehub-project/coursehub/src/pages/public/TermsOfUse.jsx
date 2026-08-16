import { AlertTriangle } from "lucide-react";
import { CURRENT_TERMS_VERSION } from "../../constants/legalVersions";

/**
 * Texto placeholder claramente identificado como tal -- o conteúdo
 * jurídico real ainda não foi fornecido/revisado (mesmo tratamento já
 * dado aos dados institucionais em contractTermsTemplate.js). O
 * mecanismo de aceite que referencia esta página (checkbox + versão)
 * é real e funcional; só este texto é placeholder.
 */
export default function TermsOfUse() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
      <p className="mt-1 text-sm text-gray-400">Versão {CURRENT_TERMS_VERSION}</p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Este texto é um placeholder. O conteúdo jurídico definitivo dos Termos de Uso do CourseHub
          ainda precisa ser fornecido e revisado pela instituição antes de operação real.
        </p>
      </div>

      <div className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
        <p>
          [PREENCHER] Estes Termos de Uso regulam a relação entre o CourseHub e seus usuários,
          incluindo alunos, contratantes e responsáveis financeiros, no que diz respeito à
          contratação de cursos, condições de pagamento, cancelamento e demais regras de uso da
          plataforma.
        </p>
        <p>
          [PREENCHER] Ao aceitar estes termos durante o checkout, o contratante concorda com as
          condições comerciais do plano selecionado, incluindo valor, forma de pagamento e política
          de cobrança vigente no momento da contratação.
        </p>
      </div>
    </div>
  );
}
