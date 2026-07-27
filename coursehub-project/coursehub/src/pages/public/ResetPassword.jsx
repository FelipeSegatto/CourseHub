import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setPasswordData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError(
        "Link de redefinição inválido. Solicite um novo link."
      );
      return;
    }

    const { newPassword, confirmPassword } = passwordData;

    if (!newPassword || !confirmPassword) {
      setError("Informe a nova senha e a confirmação.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "A nova senha deve possuir pelo menos 6 caracteres."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        "http://localhost:3001/api/forgot-password/reset",
        {
          method: "PATCH",
          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Não foi possível redefinir a senha."
        );
      }

      setMessage(
        data.message || "Senha redefinida com sucesso."
      );

      setPasswordData({ newPassword: "", confirmPassword: "" });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);

      setError(
        error.message || "Não foi possível redefinir a senha."
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
            <LockKeyhole size={23} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Criar nova senha
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Defina uma nova senha para a sua conta.
          </p>
        </div>

        {!token && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            Este link de redefinição é inválido. Solicite um
            novo link na tela de recuperação de senha.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <PasswordField
            id="new-password"
            label="Nova senha"
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handleChange}
            showPassword={showNewPassword}
            onToggleVisibility={() =>
              setShowNewPassword((current) => !current)
            }
            autoComplete="new-password"
          />

          <div className="mt-5">
            <PasswordField
              id="confirm-password"
              label="Confirmar nova senha"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handleChange}
              showPassword={showConfirmPassword}
              onToggleVisibility={() =>
                setShowConfirmPassword((current) => !current)
              }
              autoComplete="new-password"
            />
          </div>

          {message && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          className="min-h-11 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          aria-label={
            showPassword ? "Ocultar senha" : "Mostrar senha"
          }
        >
          {showPassword ? (
            <EyeOff size={19} />
          ) : (
            <Eye size={19} />
          )}
        </button>
      </div>
    </div>
  );
}
