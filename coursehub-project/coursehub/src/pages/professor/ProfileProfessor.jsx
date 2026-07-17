import { Link } from "react-router-dom";

export default function ProfileProfessor() {
  const professor = {
    nome: "Professor CourseHub",
    email: "professor@email.com",
    role: "Professor",
    materia: "Desenvolvimento Web",
    cursos: 4,
    alunos: 128,
    aulasPublicadas: 36,
  };

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Perfil do Professor
        </h1>
        <p className="mt-2 text-gray-600">
          Visualize suas informações, cursos e dados principais.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
            P
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {professor.nome}
            </h2>
            <p className="text-gray-500">{professor.email}</p>

            <span className="mt-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
              {professor.role}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Informações profissionais
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Nome" value={professor.nome} />
            <InfoItem label="E-mail" value={professor.email} />
            <InfoItem label="Função" value={professor.role} />
            <InfoItem label="Área principal" value={professor.materia} />
          </div>

          <div className="mt-6">
            <Link
              to="/teacher/dashboard-professor"
              className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Voltar para o dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <StatCard title="Cursos ativos" value={professor.cursos} />
        <StatCard title="Alunos" value={professor.alunos} />
        <StatCard title="Aulas publicadas" value={professor.aulasPublicadas} />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Sobre o professor
        </h2>

        <p className="leading-relaxed text-gray-600">
          Este perfil reúne as principais informações do professor dentro da
          plataforma CourseHub. Futuramente, esta página pode incluir edição de
          dados, histórico de aulas, cursos criados, avaliações dos alunos e
          configurações da conta.
        </p>
      </section>
    </main>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
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