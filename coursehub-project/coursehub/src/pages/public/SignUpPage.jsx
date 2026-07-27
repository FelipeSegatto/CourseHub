import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/APIService";

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

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setErro("Preencha todos os campos.");
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
          role: form.role,
        }),
      });

      setSucesso("Usuário cadastrado com sucesso!");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch (error) {
      setErro(error.message || "Erro ao cadastrar usuário.");
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
        <h1 className="text-2xl font-bold mb-2">Criar conta</h1>

        <p className="text-gray-500 mb-6">
          Cadastre-se para acessar o sistema.
        </p>

        {erro && (
          <p className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg">
            {erro}
          </p>
        )}

        {sucesso && (
          <p className="mb-4 bg-green-100 text-green-700 p-3 rounded-lg">
            {sucesso}
          </p>
        )}

        <div className="mb-4">
          <label className="block mb-1 font-medium">Nome</label>
          <input
            name="name"
            type="text"
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={handleChange}
            placeholder="Lucas Almeida"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">E-mail</label>
          <input
            name="email"
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={form.email}
            onChange={handleChange}
            placeholder="lucas@email.com"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Senha</label>
          <input
            name="password"
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={form.password}
            onChange={handleChange}
            placeholder="123456"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Confirmar senha</label>
          <input
            name="confirmPassword"
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Digite a senha novamente"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Gênero</label>

          <select
            name="gender"
            className="w-full border rounded-lg px-3 py-2"
            value={form.gender}
            onChange={handleChange}
          >
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Cadastrando..." : "Criar conta"}
        </button>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 font-semibold hover:underline"
          >
            Entrar
          </button>
        </p>
      </form>
    </main>
  );
}