import { useEffect, useRef, useState } from "react";
import { Clock3, CheckCircle2, XCircle } from "lucide-react";

const MERCADO_PAGO_SDK_URL = "https://sdk.mercadopago.com/js/v2";
const BRICK_CONTAINER_ID = "coursehub-card-payment-brick";

/**
 * Carrega o SDK client-side v2 do próprio Mercado Pago e renderiza o
 * Card Payment Brick -- o dado bruto do cartão (número, validade, CVV)
 * é digitado DENTRO de um iframe hospedado pelo Mercado Pago e nunca
 * passa pelo React/DOM do CourseHub nem pelo backend do CourseHub. O
 * callback onSubmit do Brick entrega só um `token` de uso único
 * (mais bandeira/parcelas), que é o que este componente repassa para
 * `onToken` -- exatamente o que
 * services/paymentGateway/mercadoPagoGateway.js espera receber.
 *
 * RISCO RESIDUAL DOCUMENTADO: esta integração foi implementada a
 * partir da documentação pública do Card Payment Brick, mas não pôde
 * ser verificada ao vivo neste ambiente (sem chave pública/sandbox
 * real disponível). Antes de habilitar cartão em produção, validar
 * manualmente com credenciais de sandbox reais.
 */
export default function CreditCardPaymentPanel({ amount, onToken, submitting }) {
  const brickControllerRef = useRef(null);
  const [sdkState, setSdkState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSdkAndCreateBrick() {
      const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

      if (!publicKey) {
        setSdkState("unavailable");
        setError("Pagamento por cartão está temporariamente indisponível.");
        return;
      }

      try {
        if (!window.MercadoPago) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = MERCADO_PAGO_SDK_URL;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Falha ao carregar o script do Mercado Pago."));
            document.body.appendChild(script);
          });
        }

        if (cancelled) return;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        brickControllerRef.current = await bricksBuilder.create("cardPayment", BRICK_CONTAINER_ID, {
          initialization: { amount },
          callbacks: {
            onReady: () => {
              if (!cancelled) setSdkState("ready");
            },
            onSubmit: ({ token, payment_method_id: paymentMethodId, installments }) =>
              onToken({ cardToken: token, cardPaymentMethodId: paymentMethodId, cardInstallments: installments }),
            onError: (brickError) => {
              console.error("[CreditCardPaymentPanel] Card Payment Brick error:", brickError);
              if (!cancelled) setError("Não foi possível processar os dados do cartão. Verifique e tente novamente.");
            },
          },
        });
      } catch (loadError) {
        if (!cancelled) {
          setSdkState("unavailable");
          setError(loadError.message || "Pagamento por cartão está temporariamente indisponível.");
        }
      }
    }

    loadSdkAndCreateBrick();

    return () => {
      cancelled = true;
      brickControllerRef.current?.unmount?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  return (
    <div className="space-y-3">
      {sdkState === "loading" && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Clock3 size={16} /> Carregando pagamento seguro por cartão...
        </p>
      )}

      {sdkState === "unavailable" && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle size={16} /> {error}
        </p>
      )}

      {sdkState === "ready" && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Preencha os dados do cartão abaixo.
        </p>
      )}

      <div id={BRICK_CONTAINER_ID} />

      {submitting && <p className="text-center text-xs text-slate-400">Processando pagamento...</p>}

      <p className="text-center text-xs text-slate-400">
        Os dados do seu cartão são processados diretamente pelo Mercado Pago e nunca passam pelos
        servidores do CourseHub.
      </p>
    </div>
  );
}
