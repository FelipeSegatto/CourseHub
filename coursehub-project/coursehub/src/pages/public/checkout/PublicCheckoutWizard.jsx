import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { API_URL } from "../../../services/APIService";
import { createCheckoutSession, submitCheckoutContract } from "../../../services/PublicCheckoutService";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "../../../constants/legalVersions";

import Step1CoursePlan from "./steps/Step1CoursePlan";
import CheckoutEmailVerificationPending from "./CheckoutEmailVerificationPending";
import Step2Recipient from "./steps/Step2Recipient";
import Step3ContractingPartyData from "./steps/Step3ContractingPartyData";
import Step4ReviewAcceptance from "./steps/Step4ReviewAcceptance";
import Step5Payment from "./steps/Step5Payment";

const EMPTY_STUDENT = { name: "", email: "", birthDate: "", cpf: "", phone: "", address: "" };
const EMPTY_PARTY = { party_type: "individual", name: "", document_type: "cpf", document_number: "", email: "", phone: "", relationshipType: "" };

/**
 * Checkout público de curso -- visitante espontâneo, aluno novo ou
 * contratante externo. Se já estiver logado como aluno, redireciona
 * para a versão autenticada (StudentCoursePurchase.jsx), que não
 * precisa de verificação de e-mail nem de dados de contratante.
 */
export default function PublicCheckoutWizard() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedPlanId = searchParams.get("plan");
  const navigate = useNavigate();
  const { estaLogado, usuarioLogado } = useAuth();

  const [phase, setPhase] = useState("loading");
  const [loadError, setLoadError] = useState("");

  const [course, setCourse] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(preselectedPlanId || null);

  const [checkoutToken, setCheckoutToken] = useState(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [step1Error, setStep1Error] = useState("");
  const [step1Submitting, setStep1Submitting] = useState(false);

  const [recipientMode, setRecipientMode] = useState(null);
  const [studentCandidate, setStudentCandidate] = useState(EMPTY_STUDENT);
  const [contractingPartyData, setContractingPartyData] = useState(EMPTY_PARTY);
  const [accepted, setAccepted] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (estaLogado && usuarioLogado?.role === "student") {
      navigate(`/aluno/financeiro/comprar/${courseId}`, { replace: true });
    }
  }, [estaLogado, usuarioLogado, courseId, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [courseResponse, plansResponse] = await Promise.all([
          fetch(`${API_URL}/api/courses/${courseId}`),
          fetch(`${API_URL}/api/courses/${courseId}/pricing-plans`),
        ]);

        if (!courseResponse.ok) throw new Error("Não foi possível carregar o curso.");

        const courseData = await courseResponse.json();
        const plansData = plansResponse.ok ? await plansResponse.json() : [];

        if (cancelled) return;

        setCourse(courseData);
        setPlans(Array.isArray(plansData) ? plansData : []);
        setPhase("step1");
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Não foi possível carregar o curso.");
          setPhase("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null;

  async function handleStep1Next(email) {
    setStep1Error("");

    try {
      setStep1Submitting(true);

      const result = await createCheckoutSession({ courseId, pricingPlanId: selectedPlanId, email });

      setCheckoutToken(result.data.checkoutToken);
      setCheckoutEmail(email);
      setStudentCandidate((current) => ({ ...current, email }));
      setPhase("verifying");
    } catch (error) {
      setStep1Error(error.message || "Não foi possível iniciar o checkout.");
    } finally {
      setStep1Submitting(false);
    }
  }

  function handleVerified() {
    setPhase("step2");
  }

  function handleRecipientNext() {
    if (recipientMode === "self") {
      setStudentCandidate((current) => ({ ...current, email: checkoutEmail }));
    } else {
      setContractingPartyData((current) => ({ ...current, email: checkoutEmail }));
    }
    setPhase("step3");
  }

  async function submitPurchase(paymentMethod, extra = {}) {
    setSubmitError("");

    try {
      setSubmitting(true);

      const result = await submitCheckoutContract(checkoutToken, {
        recipientMode,
        studentCandidate,
        contractingPartyData: recipientMode === "other" ? contractingPartyData : undefined,
        acceptance: { termsVersion: CURRENT_TERMS_VERSION, privacyVersion: CURRENT_PRIVACY_VERSION },
        paymentMethod,
        ...extra,
      });

      if (result.data.paymentInitError) {
        navigate(`/checkout/resultado?invoiceId=${result.data.invoiceId}&via=public&retry=1`);
        return;
      }

      navigate(
        `/checkout/processando?paymentId=${result.data.payment.paymentId}&invoiceId=${result.data.invoiceId}&via=public`
      );
    } catch (error) {
      setSubmitError(error.message || "Não foi possível concluir a contratação.");
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

  if (phase === "loading") {
    return <p className="p-6 text-sm text-gray-500">Carregando...</p>;
  }

  if (phase === "error") {
    return <p className="p-6 text-sm text-red-600">{loadError}</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Contratar curso</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {phase === "step1" && (
          <Step1CoursePlan
            course={course}
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            onNext={handleStep1Next}
            submitting={step1Submitting}
            error={step1Error}
          />
        )}

        {phase === "verifying" && (
          <CheckoutEmailVerificationPending checkoutToken={checkoutToken} email={checkoutEmail} onVerified={handleVerified} />
        )}

        {phase === "step2" && (
          <Step2Recipient
            recipientMode={recipientMode}
            onSelect={setRecipientMode}
            onNext={handleRecipientNext}
            onBack={() => setPhase("step1")}
          />
        )}

        {phase === "step3" && (
          <Step3ContractingPartyData
            recipientMode={recipientMode}
            studentCandidate={studentCandidate}
            onChangeStudent={setStudentCandidate}
            contractingPartyData={contractingPartyData}
            onChangeContractingParty={setContractingPartyData}
            onNext={() => setPhase("step4")}
            onBack={() => setPhase("step2")}
          />
        )}

        {phase === "step4" && selectedPlan && (
          <Step4ReviewAcceptance
            course={course}
            plan={selectedPlan}
            studentCandidate={studentCandidate}
            recipientMode={recipientMode}
            contractingPartyData={contractingPartyData}
            accepted={accepted}
            onToggleAccepted={() => setAccepted((current) => !current)}
            onNext={() => setPhase("step5")}
            onBack={() => setPhase("step3")}
          />
        )}

        {phase === "step5" && selectedPlan && (
          <Step5Payment
            plan={selectedPlan}
            acceptedMethods={{
              pix: selectedPlan.acceptsPix,
              boleto: selectedPlan.acceptsBoleto,
              creditCard: selectedPlan.acceptsCreditCard,
            }}
            selectedMethod={selectedMethod}
            onSelectMethod={handleSelectMethod}
            onCardToken={handleCardToken}
            submitting={submitting}
            error={submitError}
            onBack={() => setPhase("step4")}
          />
        )}
      </div>
    </div>
  );
}
