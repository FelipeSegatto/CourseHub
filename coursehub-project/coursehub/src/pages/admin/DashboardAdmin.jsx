export default function DashboardAdmin() {
  const stats = [
    { label: "Alunos ativos", value: "1.284", detail: "+12% este mês" },
    { label: "Cursos publicados", value: "32", detail: "6 em edição" },
    { label: "Professores", value: "14", detail: "3 com tarefas pendentes" },
    { label: "Certificados emitidos", value: "524", detail: "+48 este mês" },
  ];

  const quickActions = [
    "Cadastrar aluno",
    "Criar curso",
    "Cadastrar professor",
    "Emitir certificado",
  ];

  const recentActivities = [
    "Novo aluno cadastrado: Ana Martins",
    "Curso atualizado: React do Zero ao Dashboard",
    "Professor lançou notas da turma Front-end 01",
    "Certificado emitido para Lucas Andrade",
  ];

  const pendingTasks = [
    { title: "Provas aguardando correção", amount: 18 },
    { title: "Certificados pendentes", amount: 7 },
    { title: "Cursos sem professor", amount: 2 },
    { title: "Alunos aguardando aprovação", amount: 11 },
  ];

  const popularCourses = [
    { course: "React do Zero ao Dashboard", students: 420, completion: "68%" },
    { course: "JavaScript Essencial", students: 350, completion: "74%" },
    { course: "UX/UI para Sistemas Web", students: 215, completion: "59%" },
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10">
          <p className="text-sm font-semibold text-blue-600">
            Área do Administrador
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Painel administrativo
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Gerencie alunos, cursos, professores, tarefas, provas, certificados
            e acompanhe os principais indicadores da plataforma.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {item.label}
              </p>

              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                {item.value}
              </h2>

              <p className="mt-2 text-sm text-blue-600">
                {item.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Ações rápidas
              </h2>

              <p className="mt-1 text-gray-500">
                Acesse as principais funções administrativas.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-left font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Pendências
            </h2>

            <div className="mt-6 space-y-4">
              {pendingTasks.map((task) => (
                <div
                  key={task.title}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {task.title}
                  </span>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                    {task.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
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

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Cursos em destaque
            </h2>

            <div className="mt-6 space-y-4">
              {popularCourses.map((course) => (
                <div
                  key={course.course}
                  className="rounded-xl bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {course.course}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {course.students} alunos matriculados
                      </p>
                    </div>

                    <span className="text-sm font-bold text-blue-600">
                      {course.completion}
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: course.completion }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-blue-600 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Próximo passo recomendado
              </h2>

              <p className="mt-2 max-w-2xl text-blue-100">
                Revise as provas pendentes, atualize os cursos em edição e
                emita certificados para os alunos que já concluíram suas trilhas.
              </p>
            </div>

            <button className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">
              Ver pendências
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}