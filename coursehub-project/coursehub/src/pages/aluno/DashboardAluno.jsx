import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import EnrollmentService from "../../services/EnrollmentService";
import HeroGreetingsText from "../../components/HeroGreetingsText";

export default function DashboardAluno() {
  const { usuarioLogado, loading } = useAuth();

   const studentId = usuarioLogado?.id;
   
   const cursosMatriculados = EnrollmentService(studentId);

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!usuarioLogado) {
    return <p>Usuário não encontrado.</p>;
  }

  const totalCourses = cursosMatriculados.length;
  const currentCourse = cursosMatriculados[0];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10 rounded-3xl bg-blue-600 p-8 text-white">
          <p className="text-sm font-medium text-blue-100">Área do aluno</p>

          <HeroGreetingsText
            titleClassName="text-white"
            descriptionClassName="text-blue-600"
          />

          <p className="mt-3 max-w-2xl text-blue-100">
            Continue seus estudos, acompanhe seu progresso e acesse seus cursos.
          </p>

          {currentCourse && (
            <Link to={`/aluno/dashboard-aluno/courses/${currentCourse.id}`}>
              <button className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-blue-600 hover:bg-blue-50 transition hover:cursor-pointer">
                Continuar estudando
              </button>
            </Link>
          )}
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
            {cursosMatriculados.map((course) => {
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