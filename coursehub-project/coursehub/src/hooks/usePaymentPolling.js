import { useEffect, useRef, useState } from "react";
import { getInvoicePayment } from "../services/FinancialService";

const POLL_INTERVAL_MS = 4000;
// ~5 minutos de polling -- generoso para um QR Code PIX (geralmente
// pago em segundos a poucos minutos), limitado para que uma aba
// esquecida aberta não fique consultando para sempre. O webhook
// continua sendo a fonte real da verdade; isto é só UX, uma leitura
// de fallback enquanto o modal está aberto.
const MAX_POLLS = 75;

const TERMINAL_STATUSES = new Set(["approved", "rejected", "cancelled", "refunded", "chargeback"]);

/**
 * Consulta GET /student/finance/payments/:id enquanto o status ainda
 * é "pending", para que o modal reflita uma aprovação sem o aluno
 * precisar fechar e reabrir. Para automaticamente ao atingir um
 * status terminal, ao atingir MAX_POLLS, ou ao desmontar.
 */
export function usePaymentPolling(paymentId) {
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!paymentId) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    async function poll() {
      try {
        const result = await getInvoicePayment(paymentId);

        if (cancelled) return;

        setPayment(result.data);
        setError("");

        pollCountRef.current += 1;

        const isTerminal = TERMINAL_STATUSES.has(result.data.status);

        if (!isTerminal && pollCountRef.current < MAX_POLLS) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (requestError) {
        if (cancelled) return;

        setError(requestError.message || "Não foi possível consultar o status do pagamento.");
      }
    }

    poll();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [paymentId]);

  return { payment, error };
}
