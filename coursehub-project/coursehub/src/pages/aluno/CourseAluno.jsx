import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import useEnrollment from "../../services/EnrollmentService";

export default function CourseAluno() {
  const { usuarioLogado } = useAuth();

  const {
  matriculas,
  loading,
  error,
} = useEnrollment();

  if (loading) {
    return <p className="p-6">Carregando...</p>;
  }

  if (!usuarioLogado) {
    return <p className="p-6">Usuário não encontrado.</p>;
  }

  return (
    <main className="bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10">
          <p className="text-sm font-semibold text-blue-600">
            Área do aluno
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Meus cursos
          </h1>

          <p className="mt-3 max-w-2xl text-gray-600">
            Acesse seus cursos, continue de onde parou e acompanhe seu progresso.
          </p>
        </section>

        {matriculas.length === 0 && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <p className="text-gray-600">
              Você ainda não está matriculado em nenhum curso.
            </p>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matriculas.map((course) => {
            const progress = 0;

            return (
              <article
                key={course.id}
                className="flex min-h-[300px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
              >
                <div>
                  <span className="inline-block text-sm font-semibold text-blue-600">
                    {course.category || "Curso"}
                  </span>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {course.name}
                  </h2>

                  <p className="mt-3 text-sm text-gray-600">
                    {course.description ||
                      "Sem descrição cadastrada."}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {course.nivel ||
                        "Nível não informado"}
                    </span>

                    <span>
                      {course.enrollment_status ||
                        "active"}
                    </span>
                  </div>

                  <div className="h-3 rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {progress}% concluído
                    </span>

                    <Link
                      to={`/aluno/dashboard-aluno/courses/${course.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Continuar
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}