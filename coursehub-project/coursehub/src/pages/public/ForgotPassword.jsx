import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  /*
    STEP 1:
    Guarda o e-mail digitado.
  */
  const [email, setEmail] = useState("");

  /*
    STEP 2:
    Guarda as duas senhas da segunda etapa.
  */
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  /*
    Controla qual formulário aparece.

    false = formulário de e-mail
    true  = formulário de nova senha
  */
  const [isNewPasswordForm, setIsNewPasswordForm] =
    useState(false);

  /*
    Estados de carregamento.
  */
  const [isCheckingEmail, setIsCheckingEmail] =
    useState(false);

  const [isResettingPassword, setIsResettingPassword] =
    useState(false);

  /*
    Controla a exibição das senhas.
  */
  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /*
    Mensagens da tela.
  */
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    Atualiza os campos da nova senha.

    O name do input será usado como chave:
    newPassword ou confirmPassword.
  */
  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordData((currentPasswordData) => ({
      ...currentPasswordData,
      [name]: value,
    }));
  }

  /*
    PRIMEIRA ETAPA:
    Verifica se o e-mail existe.
  */
  async function handleCheckEmail(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    try {
      setIsCheckingEmail(true);

      const response = await fetch(
        "http://localhost:3001/api/forgot-password/check-email",
        {
          method: "POST",

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
            "Não foi possível verificar o e-mail."
        );
      }

      /*
        O e-mail existe.

        Agora trocamos para o formulário
        de definição da nova senha.
      */
      setEmail(normalizedEmail);
      setIsNewPasswordForm(true);

      setMessage(
        "E-mail encontrado. Agora defina sua nova senha."
      );
    } catch (error) {
      console.error("Erro ao verificar e-mail:", error);

      setError(
        error.message ||
          "Não foi possível verificar o e-mail."
      );
    } finally {
      setIsCheckingEmail(false);
    }
  }

  /*
    SEGUNDA ETAPA:
    Valida e envia a nova senha.
  */
  async function handleResetPassword(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const { newPassword, confirmPassword } =
      passwordData;

    if (!newPassword || !confirmPassword) {
      setError(
        "Informe a nova senha e a confirmação."
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "A nova senha deve possuir pelo menos 6 caracteres."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "A confirmação da nova senha não confere."
      );
      return;
    }

    try {
      setIsResettingPassword(true);

      const response = await fetch(
        "http://localhost:3001/api/forgot-password/reset",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Não foi possível redefinir a senha."
        );
      }

      setMessage(
        data.message ||
          "Senha redefinida com sucesso."
      );

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      });

      /*
        Após dois segundos, redireciona
        para a tela de login.
      */
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error(
        "Erro ao redefinir senha:",
        error
      );

      setError(
        error.message ||
          "Não foi possível redefinir a senha."
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  /*
    Permite voltar da segunda etapa
    para informar outro e-mail.
  */
  function handleChangeEmail() {
    setIsNewPasswordForm(false);

    setPasswordData({
      newPassword: "",
      confirmPassword: "",
    });

    setMessage("");
    setError("");
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
            {isNewPasswordForm ? (
              <LockKeyhole size={23} />
            ) : (
              <Mail size={23} />
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {isNewPasswordForm
              ? "Criar nova senha"
              : "Esqueci minha senha"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isNewPasswordForm
              ? `Defina uma nova senha para a conta ${email}.`
              : "Informe seu e-mail para iniciar a recuperação da senha."}
          </p>
        </div>

        {/*
          RENDERIZAÇÃO CONDICIONAL:

          Se isNewPasswordForm for false,
          mostra o formulário de e-mail.
        */}
        {!isNewPasswordForm && (
          <form onSubmit={handleCheckEmail}>
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
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              required
              className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            {message && (
              <Message type="success">
                {message}
              </Message>
            )}

            {error && (
              <Message type="error">{error}</Message>
            )}

            <button
              type="submit"
              disabled={isCheckingEmail}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingEmail
                ? "Verificando..."
                : "Continuar"}
            </button>
          </form>
        )}

        {/*
          Se isNewPasswordForm for true,
          mostra o formulário da nova senha.
        */}
        {isNewPasswordForm && (
          <form onSubmit={handleResetPassword}>
            <PasswordField
              id="new-password"
              label="Nova senha"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              showPassword={showNewPassword}
              onToggleVisibility={() =>
                setShowNewPassword(
                  (currentValue) => !currentValue
                )
              }
              autoComplete="new-password"
            />

            <div className="mt-5">
              <PasswordField
                id="confirm-password"
                label="Confirmar nova senha"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                showPassword={showConfirmPassword}
                onToggleVisibility={() =>
                  setShowConfirmPassword(
                    (currentValue) => !currentValue
                  )
                }
                autoComplete="new-password"
              />
            </div>

            {message && (
              <Message type="success">
                {message}
              </Message>
            )}

            {error && (
              <Message type="error">{error}</Message>
            )}

            <button
              type="submit"
              disabled={isResettingPassword}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResettingPassword
                ? "Redefinindo..."
                : "Redefinir senha"}
            </button>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={isResettingPassword}
              className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Usar outro e-mail
            </button>
          </form>
        )}
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
            showPassword
              ? "Ocultar senha"
              : "Mostrar senha"
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