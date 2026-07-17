import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CourseService from "../../services/CourseService";

export default function CoursePage() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCurso() {
      try {
        console.log("ID recebido pela URL:", id);

        const url = `http://localhost:3001/courses/${id}`;
        console.log("Buscando curso em:", url);

        const resposta = await fetch(url);
        console.log("Status da resposta:", resposta.status);

        const dados = await resposta.json();
        console.log("Dados recebidos:", dados);

        if (!resposta.ok) {
          throw new Error(dados.message || "Curso não encontrado");
        }

        setCourse(dados);
      } catch (error) {
        console.error("Erro ao buscar curso:", error);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCurso();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Carregando curso...
        </h1>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Curso não encontrado
        </h1>

        <Link
          to="/course"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition"
        >
          Voltar para cursos
        </Link>
      </main>
    );
  }

  const syllabus =
    typeof course.syllabus === "string"
      ? course.syllabus.split(";")
      : Array.isArray(course.syllabus)
      ? course.syllabus
      : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        to="/course"
        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        ← Voltar para cursos
      </Link>

      <h1 className="mt-6 text-5xl font-bold text-gray-900">
        {course.name}
      </h1>

      <div className="mt-4 flex flex-wrap gap-3">
        {course.nivel && (
          <span className="rounded-xl bg-blue-100 px-4 py-2 text-blue-700">
            {course.nivel}
          </span>
        )}

        {course.workload_hours && (
          <span className="rounded-xl bg-gray-100 px-4 py-2 text-gray-700">
            {course.workload_hours}h
          </span>
        )}

        {course.category && (
          <span className="rounded-xl bg-purple-100 px-4 py-2 text-purple-700">
            {course.category}
          </span>
        )}

        {course.teacher_name && (
            <span className="rounded-xl bg-green-100 px-4 py-2 text-green-700">
              Professor: {course.teacher_name}
            </span>
        )}
      </div>

      <img
        src={`${course.image_url}`}
        alt={course.name}
        className="mt-4 h-48 w-full rounded-lg object-cover"
        onError={(e) => {
          e.target.src = "/images/default-course.webp";
        }}
         />

      <p className="mt-8 text-lg leading-8 text-gray-600">
        {course.expanded_description || course.description}
      </p>

      {syllabus.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Conteúdo do curso
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
            {syllabus.map((item, index) => (
              <li key={index}>{item.trim()}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Investimento</p>

        <strong className="mt-2 block text-3xl text-gray-900">
          R$ {Number(course.price).toFixed(2)}
        </strong>

        <button className="mt-6 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition">
          Comprar curso
        </button>
      </div>
    </main>
  );
}