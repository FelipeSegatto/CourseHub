import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Clock3 } from "lucide-react";

const RETRY_PATH_BY_CHANNEL = {
  student: "/aluno/financeiro",
  public: "/pagamento/fatura",
  invoice: "/pagamento/fatura",
};

/**
 * /checkout/resultado -- tela final, alcançada a partir de
 * CheckoutProcessing.jsx (status terminal) ou diretamente quando o
 * gateway falhou logo após a criação do contrato (paymentInitError,
 * ver publicCheckoutService.js -- o contrato/invoice existem de
 * verdade e nunca são descartados, só o pagamento precisa ser
 * retomado).
 */
export default function CheckoutResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const via = searchParams.get("via") || "public";
  const isRetry = searchParams.get("retry") === "1";
  const retryPath = RETRY_PATH_BY_CHANNEL[via] || "/pagamento/fatura";

  if (isRetry || status === "rejected" || status === "cancelled") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock3 size={26} aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-xl font-bold text-gray-900">
          {isRetry ? "Cobrança criada -- pagamento pendente" : "Pagamento não aprovado"}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {isRetry
            ? "Sua contratação foi registrada, mas não conseguimos iniciar o pagamento agora. Você pode tentar novamente a qualquer momento -- a cobrança continua disponível."
            : "O pagamento não foi aprovado. Você pode tentar novamente."}
        </p>

        <Link
          to={retryPath}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Tentar pagamento novamente
        </Link>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={26} aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-xl font-bold text-gray-900">Pagamento confirmado</h1>

        <p className="mt-2 text-sm text-gray-500">
          Recebemos a confirmação do seu pagamento. Você receberá um e-mail em instantes com as
          instruções de acesso ao curso.
        </p>

        <Link to="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <XCircle size={26} aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-xl font-bold text-gray-900">Não foi possível confirmar o pagamento</h1>

      <p className="mt-2 text-sm text-gray-500">
        Ocorreu um problema ao consultar o status do pagamento. Você pode tentar novamente.
      </p>

      <Link
        to={retryPath}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Tentar novamente
      </Link>
    </div>
  );
}
