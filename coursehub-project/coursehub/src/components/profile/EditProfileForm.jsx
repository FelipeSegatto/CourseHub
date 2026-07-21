import { useEffect, useState } from "react";
import { Save } from "lucide-react";

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}) {
  return (
    <div>
      <label
        htmlFor={`edit-profile-${name}`}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={`edit-profile-${name}`}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function EditProfileForm({
  profile,
  onSave,
  onCancel,
  isSaving,
  message,
  error,
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    phone: "",
    address: "",
    specialty: "",
  });

  useEffect(() => {
    setFormData({
      name: profile?.name || "",
      email: profile?.email || "",
      gender: profile?.gender || "",
      phone:
        profile?.details?.phone ||
        profile?.phone ||
        "",
      address:
        profile?.details?.address ||
        profile?.address ||
        "",
      specialty:
        profile?.details?.specialty ||
        profile?.specialty ||
        "",
    });
  }, [profile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSave(formData);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <InputField
          label="Nome completo"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <InputField
          label="E-mail"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        {profile.role !== "admin" && (
          <InputField
            label="Telefone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
          />
        )}

        <div>
          <label
            htmlFor="edit-profile-gender"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Gênero
          </label>

          <select
            id="edit-profile-gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Prefiro não informar</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="non_binary">Não binário</option>
            <option value="other">Outro</option>
          </select>
        </div>

        {profile.role === "student" && (
          <div className="md:col-span-2">
            <InputField
              label="Endereço"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Informe seu endereço"
            />
          </div>
        )}

        {profile.role === "teacher" && (
          <InputField
            label="Especialidade"
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            placeholder="Ex.: Língua Inglesa"
          />
        )}
      </div>

      {message && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={17} />

          {isSaving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

export default EditProfileForm;