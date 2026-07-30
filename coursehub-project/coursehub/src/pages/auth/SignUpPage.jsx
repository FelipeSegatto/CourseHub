import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/APIService";
import AuthLayout from "../../layouts/AuthLayout";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "Masculino",
    role: "student",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((formAntigo) => ({
      ...formAntigo,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErro("");
    setSucesso("");

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    if (form.password.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErro("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);

      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          gender: form.gender,
          role: form.role,
        }),
      });

      setSucesso("Conta criada com sucesso. Redirecionando para o login...");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      setErro(error.message || "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Comece sua jornada"
      title="Novas possibilidades começam com um primeiro passo."
      description="Crie sua conta para acessar cursos, atividades e recursos de aprendizagem."
    >
      <header>
        <p className="text-sm font-semibold text-blue-600">
          Crie sua conta
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Comece a aprender
        </h1>

        <p className="mt-3 text-[15px] leading-6 text-slate-500">
          Preencha seus dados para acessar o CourseHub.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5"
      >
        {erro && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
          >
            {sucesso}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nome completo
          </label>

          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Lucas Almeida"
            className="
              h-12 w-full rounded-xl border border-slate-300
              bg-white px-4 text-[15px] text-slate-950
              outline-none transition
              placeholder:text-slate-400
              hover:border-slate-400
              focus:border-blue-500
              focus:ring-4 focus:ring-blue-500/10
            "
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            E-mail
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            placeholder="lucas@email.com"
            className="
              h-12 w-full rounded-xl border border-slate-300
              bg-white px-4 text-[15px] text-slate-950
              outline-none transition
              placeholder:text-slate-400
              hover:border-slate-400
              focus:border-blue-500
              focus:ring-4 focus:ring-blue-500/10
            "
          />
        </div>

        <div>
          <label
            htmlFor="gender"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Gênero
          </label>

          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="
              h-12 w-full rounded-xl border border-slate-300
              bg-white px-4 text-[15px] text-slate-950
              outline-none transition
              hover:border-slate-400
              focus:border-blue-500
              focus:ring-4 focus:ring-blue-500/10
            "
          >
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Senha
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Crie uma senha"
              className="
                h-12 w-full rounded-xl border border-slate-300
                bg-white px-4 pr-12 text-[15px] text-slate-950
                outline-none transition
                placeholder:text-slate-400
                hover:border-slate-400
                focus:border-blue-500
                focus:ring-4 focus:ring-blue-500/10
              "
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="
                absolute right-3 top-1/2
                flex -translate-y-1/2 items-center justify-center
                rounded-lg p-1.5 text-slate-400
                transition
                hover:bg-slate-100 hover:text-slate-700
              "
            >
              {showPassword ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Use pelo menos 6 caracteres.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirmar senha
          </label>

          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Digite a senha novamente"
              className="
                h-12 w-full rounded-xl border border-slate-300
                bg-white px-4 pr-12 text-[15px] text-slate-950
                outline-none transition
                placeholder:text-slate-400
                hover:border-slate-400
                focus:border-blue-500
                focus:ring-4 focus:ring-blue-500/10
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((current) => !current)
              }
              aria-label={
                showConfirmPassword
                  ? "Ocultar confirmação de senha"
                  : "Mostrar confirmação de senha"
              }
              className="
                absolute right-3 top-1/2
                flex -translate-y-1/2 items-center justify-center
                rounded-lg p-1.5 text-slate-400
                transition
                hover:bg-slate-100 hover:text-slate-700
              "
            >
              {showConfirmPassword ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="
            flex h-12 w-full items-center justify-center gap-2
            rounded-xl bg-slate-950 px-5
            text-[15px] font-semibold text-white
            transition
            hover:bg-slate-800
            focus:outline-none focus:ring-4 focus:ring-slate-950/15
            disabled:cursor-not-allowed disabled:bg-slate-400
          "
        >
          {loading && (
            <LoaderCircle
              size={18}
              className="animate-spin"
              aria-hidden="true"
            />
          )}

          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-center text-sm text-slate-500">
          Já possui uma conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Entrar
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}