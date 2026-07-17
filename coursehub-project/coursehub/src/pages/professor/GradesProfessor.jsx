import { Link } from "react-router-dom";

export default function GradesProfessor() {
  const alunos = [
    {
      id: 1,
      nome: "Ana Souza",
      curso: "React do Zero",
      atividade: "Projeto Final",
      nota: 9.2,
      status: "Aprovado",
    },
    {
      id: 2,
      nome: "Lucas Lima",
      curso: "React do Zero",
      atividade: "Lista de Exercícios",
      nota: 7.8,
      status: "Aprovado",
    },
    {
      id: 3,
      nome: "Marina Costa",
      curso: "UI/UX Design",
      atividade: "Protótipo no Figma",
      nota: 6.4,
      status: "Recuperação",
    },
    {
      id: 4,
      nome: "Pedro Alves",
      curso: "AWS Cloud Fundamentals",
      atividade: "Avaliação Final",
      nota: 8.7,
      status: "Aprovado",
    },
  ];

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Notas dos Alunos
        </h1>

        <p className="mt-2 text-gray-600">
          Acompanhe avaliações, médias e situação dos alunos.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <StatCard title="Avaliações corrigidas" value="42" />
        <StatCard title="Média geral" value="8.1" />
        <StatCard title="Aprovados" value="36" />
        <StatCard title="Em recuperação" value="6" />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Lançamento de notas
          </h2>

          <input
            type="text"
            placeholder="Buscar aluno, curso ou atividade..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 md:w-96"
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
                  Atividade
                </th>
                <th className="pb-4 text-sm font-semibold text-gray-500">
                  Nota
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
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-b border-gray-100">
                  <td className="py-5 font-semibold text-gray-900">
                    {aluno.nome}
                  </td>

                  <td className="py-5 text-gray-600">
                    {aluno.curso}
                  </td>

                  <td className="py-5 text-gray-600">
                    {aluno.atividade}
                  </td>

                  <td className="py-5">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      defaultValue={aluno.nota}
                      className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 outline-none focus:border-blue-500"
                    />
                  </td>

                  <td className="py-5">
                    <StatusBadge status={aluno.status} />
                  </td>

                  <td className="py-5">
                    <button className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition">
                      Salvar nota
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
          Critérios de avaliação
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <RuleCard
            title="Aprovado"
            description="Aluno com média igual ou superior a 7.0."
          />

          <RuleCard
            title="Recuperação"
            description="Aluno com média entre 5.0 e 6.9."
          />

          <RuleCard
            title="Reprovado"
            description="Aluno com média inferior a 5.0."
          />
        </div>

        <div className="mt-6">
          <Link
            to="/teacher/dashboard-professor"
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
    Aprovado: "bg-green-100 text-green-700",
    Recuperação: "bg-yellow-100 text-yellow-700",
    Reprovado: "bg-red-100 text-red-700",
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