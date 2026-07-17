import { Link } from "react-router-dom";

export default function ProfileAdmin() {
  const admin = {
    nome: "Administrador CourseHub",
    email: "admin@email.com",
    role: "Admin",
    cargo: "Gestão da plataforma",
    usuarios: 248,
    cursos: 18,
    professores: 12,
  };

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Perfil do Administrador
        </h1>
        <p className="mt-2 text-gray-600">
          Gerencie suas informações e acompanhe dados gerais da plataforma.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow lg:col-span-1">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
            A
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">{admin.nome}</h2>
            <p className="text-gray-500">{admin.email}</p>

            <span className="mt-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
              {admin.role}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Informações administrativas
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Nome" value={admin.nome} />
            <InfoItem label="E-mail" value={admin.email} />
            <InfoItem label="Função" value={admin.role} />
            <InfoItem label="Cargo" value={admin.cargo} />
          </div>

          <div className="mt-6">
            <Link
              to="/admin/dashboard-admin"
              className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Voltar para o dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <StatCard title="Usuários cadastrados" value={admin.usuarios} />
        <StatCard title="Cursos ativos" value={admin.cursos} />
        <StatCard title="Professores" value={admin.professores} />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Responsabilidades do administrador
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <ResponsibilityCard
            title="Gerenciar usuários"
            description="Acompanhar alunos, professores e permissões de acesso."
          />

          <ResponsibilityCard
            title="Gerenciar cursos"
            description="Organizar cursos, aulas, conteúdos e status de publicação."
          />

          <ResponsibilityCard
            title="Acompanhar métricas"
            description="Visualizar dados gerais de crescimento e atividade da plataforma."
          />

          <ResponsibilityCard
            title="Manter a plataforma"
            description="Garantir que a experiência dos usuários esteja funcionando bem."
          />
        </div>
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

function ResponsibilityCard({ title, description }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}