import { useState } from "react";
import { createAdminUser, updateUser } from "../../services/AdminUserService";

function AdminUserModal({ mode = "create", initialData = null, handleCloseModal, onSuccess }) {
  const isEditMode = mode === "edit";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    gender: initialData?.gender || "Masculino",
    password: "",
    confirmPassword: "",
    status: initialData?.status || "active",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function validateForm() {
    if (!formData.name.trim()) {
      return "Nome é obrigatório.";
    }

    if (!formData.email.trim()) {
      return "E-mail é obrigatório.";
    }

    if (!isEditMode) {
      if (!formData.password || !formData.confirmPassword) {
        return "Senha e confirmação de senha são obrigatórias.";
      }

      if (formData.password !== formData.confirmPassword) {
        return "As senhas não coincidem.";
      }

      if (formData.password.length < 6) {
        return "A senha deve ter pelo menos 6 caracteres.";
      }
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const result = isEditMode
        ? await updateUser(initialData.id, {
            name: formData.name.trim(),
            email: formData.email.trim(),
            gender: formData.gender,
          })
        : await createAdminUser({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            status: formData.status,
          });

      await onSuccess?.(result);
    } catch (requestError) {
      console.error("Erro ao salvar usuário:", requestError);
      setError(requestError.message || "Erro ao salvar usuário.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={handleCloseModal}
          disabled={loading}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ✕
        </button>

        <div className="shrink-0 border-b border-gray-200 px-6 py-5 pr-14">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Editar usuário" : "Cadastrar administrador"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {isEditMode
              ? "Altera apenas os dados básicos de identidade — status, papel e senha são alterados pelas ações da tabela."
              : "Este formulário cria contas de administrador. Para alunos ou professores, use as páginas Alunos/Professores."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-6"
        >
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <label className={labelClass}>
            Nome
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Sophia Fernandez"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            E-mail
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="sophia@email.com"
              className={inputClass}
            />
          </label>

          {isEditMode ? (
            <label className={labelClass}>
              Gênero
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </label>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Senha
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Digite uma senha"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Confirmar senha
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirme a senha"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                Status inicial
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </>
          )}

          <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Salvando..." : isEditMode ? "Salvar alterações" : "Salvar administrador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUserModal;
