export default function DashboardProfessor() {
  const stats = [
    { label: "Turmas ativas", value: "4", detail: "2 turmas com entregas recentes" },
    { label: "Alunos acompanhados", value: "126", detail: "18 precisam de atenção" },
    { label: "Tarefas pendentes", value: "23", detail: "Correções aguardando revisão" },
    { label: "Provas para corrigir", value: "12", detail: "Prazo até sexta-feira" },
  ];

  const tasks = [
    {
      title: "Corrigir tarefa de React Router",
      course: "React do Zero ao Dashboard",
      deadline: "Hoje",
      submissions: 18,
    },
    {
      title: "Avaliar prova de JavaScript",
      course: "JavaScript Essencial",
      deadline: "Amanhã",
      submissions: 12,
    },
    {
      title: "Lançar notas do módulo de UX",
      course: "UX/UI para Sistemas Web",
      deadline: "Sexta-feira",
      submissions: 21,
    },
  ];

  const classes = [
    {
      name: "Front-end 01",
      course: "React do Zero ao Dashboard",
      students: 34,
      progress: "62%",
    },
    {
      name: "JavaScript Básico",
      course: "JavaScript Essencial",
      students: 41,
      progress: "74%",
    },
    {
      name: "Design para Web",
      course: "UX/UI para Sistemas Web",
      students: 28,
      progress: "48%",
    },
  ];

  const recentActivities = [
    "Ana Martins enviou a tarefa de React Router.",
    "Lucas Pereira concluiu a prova de JavaScript.",
    "Marina Costa comentou na aula de UX/UI.",
    "Turma Front-end 01 atingiu 62% de progresso.",
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10">
          <p className="text-sm font-semibold text-blue-600">
            Área do Professor
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Dashboard do professor
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Acompanhe suas turmas, corrija tarefas e provas, lance notas e
            monitore o progresso dos alunos em um só lugar.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">{item.label}</p>

              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                {item.value}
              </h2>

              <p className="mt-2 text-sm text-blue-600">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Tarefas e provas pendentes
                </h2>

                <p className="mt-1 text-gray-500">
                  Atividades que precisam de correção, feedback ou lançamento de
                  notas.
                </p>
              </div>

              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                Ver todas
              </button>
            </div>

            <div className="space-y-4">
              {tasks.map((task) => (
                <article
                  key={task.title}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {task.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {task.course}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-600">
                        {task.submissions} envios
                      </span>

                      <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                        {task.deadline}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Ações rápidas</h2>

            <div className="mt-6 grid gap-3">
              <button className="rounded-xl bg-blue-600 px-4 py-3 text-left font-semibold text-white transition hover:bg-blue-700">
                Criar nova tarefa
              </button>

              <button className="rounded-xl bg-gray-100 px-4 py-3 text-left font-semibold text-gray-800 transition hover:bg-gray-200">
                Corrigir provas
              </button>

              <button className="rounded-xl bg-gray-100 px-4 py-3 text-left font-semibold text-gray-800 transition hover:bg-gray-200">
                Lançar notas
              </button>

              <button className="rounded-xl bg-gray-100 px-4 py-3 text-left font-semibold text-gray-800 transition hover:bg-gray-200">
                Ver alunos
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Minhas turmas
            </h2>

            <div className="mt-6 space-y-4">
              {classes.map((classItem) => (
                <article
                  key={classItem.name}
                  className="rounded-xl bg-gray-50 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {classItem.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {classItem.course}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-blue-600">
                      {classItem.students} alunos
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: classItem.progress }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Progresso médio: {classItem.progress}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Atividade recente
            </h2>

            <div className="mt-6 space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity}
                  className="rounded-xl border border-gray-100 p-4 text-sm text-gray-700"
                >
                  {activity}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-blue-600 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Prioridade do dia
              </h2>

              <p className="mt-2 max-w-2xl text-blue-100">
                Corrija as provas pendentes, revise os feedbacks dos alunos e
                lance as notas das turmas com prazo próximo.
              </p>
            </div>

            <button className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">
              Começar correções
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}