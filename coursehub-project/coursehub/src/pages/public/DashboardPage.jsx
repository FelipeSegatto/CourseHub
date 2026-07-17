import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <main className="bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              Área do aluno
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              Acesse seus cursos, acompanhe seu progresso e continue estudando.
            </h1>

            <p className="mt-5 text-lg text-gray-600">
              Entre na sua área do aluno para assistir aulas, acompanhar seu
              desempenho, revisar conteúdos e continuar exatamente de onde
              parou.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Entrar na minha conta
              </Link>

              <Link
                to="/"
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Ver cursos disponíveis
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="rounded-2xl bg-gray-100 p-6">
              <p className="text-sm font-semibold text-gray-500">
                Preview da área do aluno
              </p>

              <h2 className="mt-3 text-2xl font-bold text-gray-900">
                Seu progresso em um só lugar
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">Curso atual</p>
                  <p className="font-semibold text-gray-900">
                    React do Zero ao Dashboard
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">Progresso</p>
                  <div className="mt-2 h-3 rounded-full bg-gray-200">
                    <div className="h-3 w-[62%] rounded-full bg-blue-600" />
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">Próxima aula</p>
                  <p className="font-semibold text-gray-900">
                    Rotas dinâmicas com React Router
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}