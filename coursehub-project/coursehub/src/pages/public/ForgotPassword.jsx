import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    Sempre pedimos o e-mail e sempre mostramos a mesma
    mensagem de sucesso — o backend nunca revela se aquele
    e-mail existe ou não, para não expor quais contas estão
    cadastradas no sistema.

    Se o e-mail existir, um link de redefinição (válido por
    15 minutos) chega na caixa de entrada da conta.
  */
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        "http://localhost:3001/api/forgot-password/check-email",
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Não foi possível processar sua solicitação."
        );
      }

      setMessage(
        data.message ||
          "Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha."
      );

      setEmail("");
    } catch (error) {
      console.error(
        "Erro ao solicitar recuperação de senha:",
        error
      );

      setError(
        error.message ||
          "Não foi possível processar sua solicitação."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Voltar para o login
        </button>

        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Mail size={23} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Esqueci minha senha
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Informe seu e-mail. Se houver uma conta cadastrada,
            enviaremos um link para você criar uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="forgot-password-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            E-mail
          </label>

          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            autoComplete="email"
            required
            className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          {message && (
            <Message type="success">{message}</Message>
          )}

          {error && <Message type="error">{error}</Message>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Message({ type, children }) {
  const className =
    type === "success"
      ? "mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
      : "mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700";

  return (
    <p
      role={type === "success" ? "status" : "alert"}
      className={className}
    >
      {children}
    </p>
  );
}
