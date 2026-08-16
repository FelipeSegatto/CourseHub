import { useState } from "react";

function TextField({ label, value, onChange, type = "text", placeholder, required = true }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-[15px] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

/**
 * Etapa 3 -- dados do aluno (sempre) + dados do contratante (só
 * quando recipientMode==='other'). CPF/CNPJ têm só checagem de
 * formato aqui -- o backend revalida com dígito verificador real
 * (utils/documentValidation.js).
 */
export default function Step3ContractingPartyData({
  recipientMode,
  studentCandidate,
  onChangeStudent,
  contractingPartyData,
  onChangeContractingParty,
  onNext,
  onBack,
}) {
  const [partyType, setPartyType] = useState(contractingPartyData?.party_type || "individual");

  const studentReady =
    studentCandidate.name?.trim() &&
    studentCandidate.email?.trim() &&
    studentCandidate.birthDate &&
    studentCandidate.cpf?.trim();

  const partyReady =
    recipientMode === "self" ||
    (contractingPartyData?.name?.trim() &&
      contractingPartyData?.document_number?.trim() &&
      contractingPartyData?.email?.trim() &&
      contractingPartyData?.relationshipType);

  function updateStudent(field, value) {
    onChangeStudent({ ...studentCandidate, [field]: value });
  }

  function updateParty(field, value) {
    onChangeContractingParty({ ...contractingPartyData, [field]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Etapa 3 de 5</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">
          {recipientMode === "self" ? "Seus dados" : "Dados do aluno"}
        </h2>
      </div>

      <div className="space-y-4">
        <TextField label="Nome completo" value={studentCandidate.name || ""} onChange={(v) => updateStudent("name", v)} />
        <TextField
          label={recipientMode === "self" ? "E-mail de acesso" : "E-mail de acesso do aluno"}
          type="email"
          value={studentCandidate.email || ""}
          onChange={(v) => updateStudent("email", v)}
        />
        <TextField
          label="Data de nascimento"
          type="date"
          value={studentCandidate.birthDate || ""}
          onChange={(v) => updateStudent("birthDate", v)}
        />
        <TextField label="CPF" value={studentCandidate.cpf || ""} onChange={(v) => updateStudent("cpf", v)} placeholder="000.000.000-00" />
        <TextField label="Telefone" required={false} value={studentCandidate.phone || ""} onChange={(v) => updateStudent("phone", v)} />
      </div>

      {recipientMode === "other" && (
        <div className="space-y-4 border-t border-gray-100 pt-5">
          <h3 className="text-base font-bold text-gray-900">Dados do contratante</h3>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</label>
            <div className="flex gap-2">
              {["individual", "company"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPartyType(type);
                    updateParty("party_type", type);
                  }}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    partyType === type ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {type === "individual" ? "Pessoa física" : "Empresa"}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label={partyType === "company" ? "Razão social" : "Nome"}
            value={contractingPartyData?.name || ""}
            onChange={(v) => updateParty("name", v)}
          />
          <TextField
            label={partyType === "company" ? "CNPJ" : "CPF"}
            value={contractingPartyData?.document_number || ""}
            onChange={(v) => {
              updateParty("document_number", v);
              updateParty("document_type", partyType === "company" ? "cnpj" : "cpf");
            }}
          />
          <TextField
            label="E-mail financeiro"
            type="email"
            value={contractingPartyData?.email || ""}
            onChange={(v) => updateParty("email", v)}
          />
          <TextField label="Telefone" required={false} value={contractingPartyData?.phone || ""} onChange={(v) => updateParty("phone", v)} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Relação com o aluno</label>
            <select
              value={contractingPartyData?.relationshipType || ""}
              onChange={(event) => updateParty("relationshipType", event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-[15px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Selecione</option>
              <option value="parent">Pai/Mãe</option>
              <option value="guardian">Responsável legal</option>
              <option value="company">Empresa</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl border border-gray-300 px-5 text-[15px] font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!studentReady || !partyReady}
          className="h-12 flex-[2] rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
