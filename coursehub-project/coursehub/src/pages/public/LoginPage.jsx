import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setErro("");

    if (!email || !password) {
      setErro("Informe e-mail e senha.");
      return;
    }

    try {
      setLoading(true);

      const user = await login(email, password);

      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "teacher") {
        navigate("/professor", { replace: true });
      } else {
        navigate("/aluno", { replace: true });
      }
    } catch (error) {
      setErro(error.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow"
      >
        <h1 className="text-2xl font-bold mb-2">Entrar</h1>

        <p className="text-gray-500 mb-6">Acesse sua conta no sistema.</p>

        {erro && (
          <p className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg">
            {erro}
          </p>
        )}

        <div className="mb-4">
          <label className="block mb-1 font-medium">E-mail</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="lucas@email.com"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">Senha</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="123456"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

       

        <p className="mt-6 text-sm text-gray-600 text-center">
          Não tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-blue-600 font-semibold hover:underline"
          >
            Criar conta
          </button> </p>
        
          <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/esqueci-minha-senha")}
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:cursor-pointer"
          >
            Esqueci minha senha
          </button>
          </div>
        
      </form>
    </main>
  );
}