import { AlertTriangle } from "lucide-react";
import { CURRENT_PRIVACY_VERSION } from "../../constants/legalVersions";

/**
 * Texto placeholder claramente identificado como tal -- ver
 * TermsOfUse.jsx para o mesmo tratamento e a justificativa.
 */
export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-gray-400">Versão {CURRENT_PRIVACY_VERSION}</p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Este texto é um placeholder. O conteúdo jurídico definitivo da Política de Privacidade do
          CourseHub ainda precisa ser fornecido e revisado pela instituição antes de operação real.
        </p>
      </div>

      <div className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
        <p>
          [PREENCHER] Esta Política de Privacidade descreve como o CourseHub coleta, usa e protege os
          dados pessoais de alunos, contratantes e demais usuários da plataforma, em conformidade com
          a legislação aplicável de proteção de dados.
        </p>
        <p>
          [PREENCHER] Dados de pagamento (como número de cartão) nunca são coletados ou armazenados
          pelo CourseHub -- são processados diretamente pelo provedor de pagamentos contratado.
        </p>
      </div>
    </div>
  );
}
