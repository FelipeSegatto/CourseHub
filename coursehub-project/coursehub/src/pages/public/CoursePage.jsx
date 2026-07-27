import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = "http://localhost:3001";

export default function CoursePage() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let componenteMontado = true;

    async function fetchCurso() {
      try {
        setLoading(true);
        setError("");

        console.log("ID recebido pela URL:", id);

        const response = await fetch(
          `${API_URL}/api/courses/${id}`
        );

        console.log("Status da resposta:", response.status);

        const responseText = await response.text();

        let data = {};

        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error(
              "O servidor retornou uma resposta que não é JSON."
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              `Erro ao buscar curso. Status: ${response.status}`
          );
        }

        if (componenteMontado) {
          setCourse(data);
        }
      } catch (error) {
        console.error("Erro ao buscar curso:", error);

        if (componenteMontado) {
          setCourse(null);
          setError(
            error.message ||
              "Não foi possível carregar o curso."
          );
        }
      } finally {
        if (componenteMontado) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchCurso();
    } else {
      setError("ID do curso não informado.");
      setLoading(false);
    }

    return () => {
      componenteMontado = false;
    };
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

  if (error || !course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Curso não encontrado
        </h1>

        <p className="mt-3 text-red-600">
          {error || "Não foi possível localizar este curso."}
        </p>

        <Link
          to="/course"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Voltar para cursos
        </Link>
      </main>
    );
  }

  const syllabus =
    typeof course.syllabus === "string"
      ? course.syllabus
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(course.syllabus)
        ? course.syllabus
        : [];

  const price = Number(course.price || 0);

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
        src={
          course.image_url ||
          "/images/default-course.webp"
        }
        alt={course.name}
        className="mt-8 h-80 w-full rounded-2xl object-cover"
        onError={(event) => {
          event.currentTarget.src =
            "/images/default-course.webp";
        }}
      />

      <p className="mt-8 text-lg leading-8 text-gray-600">
        {course.expanded_description ||
          course.description ||
          "Este curso ainda não possui uma descrição detalhada."}
      </p>

      {syllabus.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Conteúdo do curso
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
            {syllabus.map((item, index) => (
              <li key={`${item}-${index}`}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm text-gray-500">
          Investimento
        </p>

        <strong className="mt-2 block text-3xl text-gray-900">
          {price.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </strong>

        <button
          type="button"
          className="mt-6 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
        >
          Comprar curso
        </button>
      </div>
    </main>
  );
}