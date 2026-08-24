import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getPublicInstitutionInfo } from "../../services/PublicInstitutionService";
import { requestInvoicePaymentLinkByEmail } from "../../services/PublicInvoicePaymentService";

function InfoRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="text-sm font-semibold text-gray-500">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

/**
 * Página pública "Fale conosco" -- dados institucionais configuráveis
 * (nunca hardcoded no JSX, sempre lidos de GET /api/public/institution)
 * e o bloco "Acesse sua fatura", incluindo a recuperação segura de um
 * link de pagamento perdido. Não é um chat/CRM: só os dois blocos
 * pedidos, nada além disso.
 */
export default function ContactPage() {
  const [institution, setInstitution] = useState(null);
  const [institutionError, setInstitutionError] = useState("");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let ignoreRequest = false;

    async function loadInstitution() {
      try {
        const response = await getPublicInstitutionInfo();

        if (!ignoreRequest) {
          setInstitution(response?.data || null);
        }
      } catch (requestError) {
        if (!ignoreRequest) {
          console.error("Erro ao carregar dados institucionais:", requestError);
          setInstitutionError("Não foi possível carregar as informações de contato agora.");
        }
      }
    }

    loadInstitution();

    return () => {
      ignoreRequest = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setResultMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("Informe um e-mail válido.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await requestInvoicePaymentLinkByEmail(trimmedEmail);

      setResultMessage(
        response?.message || "Se houver uma cobrança disponível para este e-mail, enviaremos as instruções de acesso."
      );
      setEmail("");
    } catch (requestError) {
      setFormError(requestError.message || "Não foi possível processar sua solicitação agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold text-gray-950">Fale conosco</h1>
        <p className="mt-2 text-gray-600">
          Informações de contato.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Informações institucionais</h2>

        {institutionError && <p className="mt-3 text-sm text-red-600">{institutionError}</p>}

        {!institutionError && !institution && <p className="mt-3 text-sm text-gray-500">Carregando...</p>}

        {institution && (
          <div className="mt-4 space-y-2">
            <InfoRow label="Instituição" value={institution.name} />
            <InfoRow label="E-mail de atendimento" value={institution.supportEmail} />
            <InfoRow label="Telefone" value={institution.phone} />
            <InfoRow label="WhatsApp" value={institution.whatsapp} />
            <InfoRow label="Horário de atendimento" value={institution.businessHours} />
            <InfoRow label="Endereço" value={institution.address} />
            <InfoRow label="CNPJ" value={institution.cnpj} />
            {institution.websiteUrl && (
              <InfoRow
                label="Site"
                value={
                  <a href={institution.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {institution.websiteUrl}
                  </a>
                }
              />
            )}
          </div>
        )}
      </section>

     
    </main>
  );
}
