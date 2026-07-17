import { Link } from "react-router-dom";

export default function EmissaoAdmin() {
  const certificados = [
    {
      id: 1,
      aluno: "Ana Souza",
      curso: "React do Zero",
      progresso: "100%",
      status: "Pronto para emissão",
    },
    {
      id: 2,
      aluno: "Lucas Lima",
      curso: "Node.js API REST",
      progresso: "92%",
      status: "Pendente",
    },
    {
      id: 3,
      aluno: "Pedro Alves",
      curso: "AWS Cloud Fundamentals",
      progresso: "100%",
      status: "Emitido",
    },
  ];

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Emissão de Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Gerencie certificados pendentes, emitidos e prontos para emissão.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <StatCard title="Emitidos" value="86" />
        <StatCard title="Prontos" value="12" />
        <StatCard title="Pendentes" value="34" />
        <StatCard title="Cursos elegíveis" value="8" />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Solicitações de certificado
          </h2>

          <input
            type="text"
            placeholder="Buscar aluno ou curso..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 md:w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Aluno
                </th>
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Curso
                </th>
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Progresso
                </th>
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Status
                </th>
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {certificados.map((certificado) => (
                <tr key={certificado.id} className="border-b border-gray-100">
                  <td className="py-5 font-semibold text-gray-900">
                    {certificado.aluno}
                  </td>

                  <td className="py-5 text-gray-600">
                    {certificado.curso}
                  </td>

                  <td className="py-5 text-gray-600">
                    {certificado.progresso}
                  </td>

                  <td className="py-5">
                    <StatusBadge status={certificado.status} />
                  </td>

                  <td className="py-5">
                    <button
                      disabled={certificado.status !== "Pronto para emissão"}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        certificado.status === "Pronto para emissão"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Emitir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Regras de emissão
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <RuleCard
            title="Conclusão mínima"
            description="O aluno precisa concluir 100% do curso para receber o certificado."
          />

          <RuleCard
            title="Dados do aluno"
            description="Nome, e-mail e curso devem estar corretamente cadastrados."
          />

          <RuleCard
            title="Registro interno"
            description="Todo certificado emitido deve ficar salvo no histórico da plataforma."
          />
        </div>

        <div className="mt-6">
          <Link
            to="/admin/dashboard-admin"
            className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-blue-600">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusClasses = {
    "Pronto para emissão": "bg-blue-100 text-blue-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Emitido: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        statusClasses[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function RuleCard({ title, description }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}