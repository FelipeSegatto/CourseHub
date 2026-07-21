import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import useEnrollment from "../../services/EnrollmentService";
import HeroGreetingsText from "../../components/HeroGreetingsText";

export default function DashboardAluno() {
  const { usuarioLogado } = useAuth();

   const studentId = usuarioLogado?.id;
   
   const {
      matriculas,
      loading,
      error,
    } = useEnrollment();

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!usuarioLogado) {
    return <p>Usuário não encontrado.</p>;
  }

  const totalCourses = matriculas.length;
  const currentCourse = matriculas[0];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <section className="relative mb-10 overflow-hidden rounded-[2rem] bg-slate-950 text-white">
  {/* Background decorativo */}
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

            <div
              className="
                absolute inset-0
                bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)]
                bg-[size:48px_48px]
              "
            />

            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
          </div>

          {/* Conteúdo */}
          <div className="relative grid gap-10 px-8 py-10 md:px-10 md:py-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-sm">
                Área do aluno
              </div>

              <div className="mt-5">
                <HeroGreetingsText
                  titleClassName="text-white"
                  descriptionClassName="text-slate-300"
                />
              </div>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Continue seus estudos, acompanhe seu progresso e retome sua jornada de
                onde parou.
              </p>

              {currentCourse && (
                <Link
                  to={`/aluno/dashboard-aluno/courses/${currentCourse.id}`}
                  className="
                    mt-7 inline-flex items-center justify-center
                    rounded-xl bg-white px-5 py-3
                    text-sm font-semibold text-slate-950
                    transition
                    hover:bg-blue-50
                  "
                >
                  Continuar estudando
                </Link>
              )}
            </div>

            {/* Resumo do curso atual */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                Curso atual
              </p>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                {currentCourse
                  ? currentCourse.name
                  : "Nenhum curso disponível"}
              </h2>

              {currentCourse && (
                <>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                    {currentCourse.description}
                  </p>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progresso</span>
                      <span className="font-medium text-white">0%</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Curso atual</p>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              {currentCourse ? currentCourse.name : "Nenhum curso disponível"}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Progresso geral</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">0%</h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Cursos matriculados</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {totalCourses}
            </h2>
          </div>
        </section>

        <section>
          <div className="ms-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Meus cursos</h2>
            <p className="text-gray-500">Continue de onde parou.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {matriculas.map((course) => {
              const progress = 0;

              return (
                <article
                  key={course.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-bold text-gray-900">
                    {course.name}
                  </h3>

                  <p className="mt-3 text-sm text-gray-500">
                    {course.description}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    Nível: {course.nivel} • Categoria: {course.category}
                  </p>

                  <div className="mt-5 h-3 rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <span>{progress}% concluído</span>

                    <Link to={`/aluno/dashboard-aluno/courses/${course.id}`}>
                      <button className="font-semibold text-blue-600 hover:text-blue-700 hover:cursor-pointer">
                        Acessar
                      </button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}