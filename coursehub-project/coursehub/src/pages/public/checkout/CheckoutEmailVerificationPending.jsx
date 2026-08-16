import { useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";

import { getCheckoutSession } from "../../../services/PublicCheckoutService";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 150; // ~10 min, cobre o TTL da sessão com folga

/**
 * Aguarda o e-mail ser confirmado em outra aba
 * (VerifyCheckoutEmail.jsx) -- consulta periodicamente
 * GET /sessions/:token até status==='verified', ou até a sessão
 * expirar. Para de consultar ao desmontar, ao confirmar, ou ao
 * atingir MAX_POLLS.
 */
export default function CheckoutEmailVerificationPending({ checkoutToken, email, onVerified }) {
  const [expired, setExpired] = useState(false);
  const pollCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function poll() {
      try {
        const result = await getCheckoutSession(checkoutToken);

        if (cancelled) return;

        if (result.data.status === "verified") {
          onVerified();
          return;
        }

        pollCountRef.current += 1;

        if (pollCountRef.current < MAX_POLLS) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setExpired(true);
        }
      } catch {
        if (!cancelled) setExpired(true);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkoutToken, onVerified]);

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <MailCheck size={26} aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold text-gray-900">Confirme seu e-mail</h2>

      <p className="text-sm text-gray-500">
        Enviamos um link de confirmação para <strong className="text-gray-700">{email}</strong>. Abra
        o link em uma nova aba para continuar -- esta página atualiza sozinha assim que confirmado.
      </p>

      {expired && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Não recebemos a confirmação a tempo. Recarregue a página e comece novamente.
        </p>
      )}
    </div>
  );
}
