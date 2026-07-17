import { Link } from "react-router-dom";

export default function NotificacoesAluno() {
  const notificacoes = [
    {
      id: 1,
      titulo: "Nova atividade disponível",
      mensagem: "A atividade Projeto Final React foi adicionada ao curso React do Zero.",
      data: "23/05/2026",
      tipo: "Atividade",
      status: "Não lida",
    },
    {
      id: 2,
      titulo: "Avaliação corrigida",
      mensagem: "Sua avaliação de UI/UX Design já foi corrigida.",
      data: "22/05/2026",
      tipo: "Nota",
      status: "Lida",
    },
    {
      id: 3,
      titulo: "Novo material publicado",
      mensagem: "Um novo PDF foi publicado no curso JavaScript Essencial.",
      data: "21/05/2026",
      tipo: "Material",
      status: "Não lida",
    },
    {
      id: 4,
      titulo: "Certificado disponível",
      mensagem: "Seu certificado do curso React do Zero está disponível para download.",
      data: "20/05/2026",
      tipo: "Certificado",
      status: "Lida",
    },
  ];

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Notificações
        </h1>

        <p className="mt-2 text-gray-600">
          Acompanhe avisos importantes sobre cursos, atividades, notas e certificados.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <StatCard title="Total" value="18" />
        <StatCard title="Não lidas" value="5" />
        <StatCard title="Atividades" value="6" />
        <StatCard title="Certificados" value="2" />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Minhas notificações
          </h2>

          <button className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
            Marcar todas como lidas
          </button>
        </div>

        <div className="space-y-4">
          {notificacoes.map((notificacao) => (
            <article
              key={notificacao.id}
              className={`rounded-2xl border p-5 ${
                notificacao.status === "Não lida"
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {notificacao.tipo}
                    </span>

                    <StatusBadge status={notificacao.status} />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900">
                    {notificacao.titulo}
                  </h3>

                  <p className="mt-2 text-gray-600">
                    {notificacao.mensagem}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    {notificacao.data}
                  </p>
                </div>

                <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
                  Ver detalhes
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Tipos de notificações
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Atividades"
            description="Avisos sobre novas tarefas, prazos e entregas pendentes."
          />

          <InfoCard
            title="Notas"
            description="Atualizações sobre avaliações corrigidas e feedbacks recebidos."
          />

          <InfoCard
            title="Certificados"
            description="Alertas quando um certificado estiver disponível."
          />
        </div>

        <div className="mt-6">
          <Link
            to="/student/dashboard-aluno"
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
  const isNaoLida = status === "Não lida";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isNaoLida
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {status}
    </span>
  );
}

function InfoCard({ title, description }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}