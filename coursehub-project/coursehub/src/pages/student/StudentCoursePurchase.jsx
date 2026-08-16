import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { API_URL } from "../../services/APIService";
import { purchaseCourseAsAuthenticatedStudent } from "../../services/StudentCheckoutService";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "../../constants/legalVersions";
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector";
import CreditCardPaymentPanel from "../../components/payment/CreditCardPaymentPanel";

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Compra autenticada de um novo curso pelo próprio aluno logado
 * (/aluno/financeiro/comprar/:courseId?plan=). Diferente do checkout
 * público, não precisa de verificação de e-mail nem de dados de
 * contratante -- o aluno já está identificado pelo token, e o
 * contrato é sempre contractingPartyMode "self" (ver
 * authenticatedCheckoutService.js).
 */
export default function StudentCoursePurchase() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedPlanId = searchParams.get("plan");
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(preselectedPlanId || null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [accepted, setAccepted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const [courseResponse, plansResponse] = await Promise.all([
          fetch(`${API_URL}/api/courses/${courseId}`),
          fetch(`${API_URL}/api/courses/${courseId}/pricing-plans`),
        ]);

        if (!courseResponse.ok) {
          throw new Error("Não foi possível carregar o curso.");
        }

        const courseData = await courseResponse.json();
        const plansData = plansResponse.ok ? await plansResponse.json() : [];

        if (cancelled) return;

        setCourse(courseData);
        setPlans(Array.isArray(plansData) ? plansData : []);

        if (!preselectedPlanId && Array.isArray(plansData) && plansData.length === 1) {
          setSelectedPlanId(plansData[0].id);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Não foi possível carregar o curso.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courseId, preselectedPlanId]);

  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null;

  const acceptedMethods = selectedPlan
    ? { pix: selectedPlan.acceptsPix, boleto: selectedPlan.acceptsBoleto, creditCard: selectedPlan.acceptsCreditCard }
    : { pix: false, boleto: false, creditCard: false };

  async function submitPurchase(paymentMethod, extra = {}) {
    setSubmitError("");

    if (!selectedPlan) {
      setSubmitError("Selecione um plano para continuar.");
      return;
    }

    if (!accepted) {
      setSubmitError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await purchaseCourseAsAuthenticatedStudent(courseId, {
        pricingPlanId: selectedPlan.id,
        paymentMethod,
        acceptance: { termsVersion: CURRENT_TERMS_VERSION, privacyVersion: CURRENT_PRIVACY_VERSION },
        ...extra,
      });

      navigate(
        `/checkout/processando?paymentId=${result.data.payment.paymentId}&invoiceId=${result.data.invoiceId}&via=student`
      );
    } catch (error) {
      setSubmitError(error.message || "Não foi possível concluir a compra.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectMethod(method) {
    setSelectedMethod(method);
    setSubmitError("");

    if (method === "credit_card") return;

    submitPurchase(method);
  }

  function handleCardToken({ cardToken, cardPaymentMethodId, cardInstallments }) {
    submitPurchase("credit_card", { cardToken, cardPaymentMethodId, cardInstallments });
  }

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Carregando...</p>;
  }

  if (loadError || !course) {
    return <p className="p-6 text-sm text-red-600">{loadError || "Curso não encontrado."}</p>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        to={`/courses/${courseId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft size={16} /> Voltar para o curso
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Contratar {course.name}</h1>

      {plans.length > 1 && !preselectedPlanId && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-gray-700">Escolha o plano</p>
          <div className="space-y-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  String(selectedPlanId) === String(plan.id)
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="font-semibold text-gray-900">{plan.name}</span>{" "}
                <span className="text-gray-500">— {formatCurrency(plan.totalAmount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPlan && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Plano</dt>
              <dd className="font-medium text-gray-900">{selectedPlan.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Valor</dt>
              <dd className="font-semibold text-gray-900">{formatCurrency(selectedPlan.totalAmount)}</dd>
            </div>
          </dl>

          <label className="mt-5 flex items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5"
            />
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

          <div className="mt-6">
            <PaymentMethodSelector
              acceptedMethods={acceptedMethods}
              selected={selectedMethod}
              onSelect={handleSelectMethod}
              disabled={!accepted || submitting}
            />

            {selectedMethod === "credit_card" && (
              <div className="mt-4">
                <CreditCardPaymentPanel amount={selectedPlan.totalAmount} onToken={handleCardToken} submitting={submitting} />
              </div>
            )}

            {submitError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {submitError}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
