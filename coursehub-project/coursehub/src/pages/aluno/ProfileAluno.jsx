export default function ProfileStudent() {
  const student = {
    name: "Felipe Segatto",
    email: "felipe@email.com",
    plan: "Premium Student",
    joinedAt: "March 2026",
    completedCourses: 3,
    currentCourses: 2,
    certificates: 1,
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        
        <section className="mb-10 rounded-3xl bg-blue-600 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-bold text-blue-600">
                F
              </div>

              <div>
                <p className="text-sm font-medium text-blue-100">
                  Área do aluno
                </p>

                <h1 className="mt-1 text-4xl font-bold">
                  {student.name}
                </h1>

                <p className="mt-2 text-blue-100">
                  {student.email}
                </p>
              </div>
            </div>

            <button className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">
              Editar perfil
            </button>
          </div>
        </section>

        
        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Plano atual</p>

            <h2 className="mt-2 text-xl font-bold text-gray-900">
              {student.plan}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Cursos concluídos</p>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {student.completedCourses}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Cursos em andamento</p>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {student.currentCourses}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Certificados</p>

            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {student.certificates}
            </h2>
          </div>
        </section>

        
        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          
          <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Informações da conta
              </h2>

              <p className="mt-1 text-gray-500">
                Gerencie seus dados pessoais e configurações.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nome completo
                </label>

                <input
                  type="text"
                  value={student.name}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={student.email}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Plano
                </label>

                <input
                  type="text"
                  value={student.plan}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Membro desde
                </label>

                <input
                  type="text"
                  value={student.joinedAt}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none"
                  readOnly
                />
              </div>
            </div>

            <button className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
              Atualizar informações
            </button>
          </div>

          
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Atividade recente
              </h2>

              <p className="mt-1 text-gray-500">
                Últimas ações da conta.
              </p>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-gray-900">
                  React do Zero ao Dashboard
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Aula concluída: Rotas dinâmicas
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-gray-900">
                  JavaScript Essencial
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Exercício enviado com sucesso
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-gray-900">
                  Certificado disponível
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  UX/UI para Sistemas Web
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}