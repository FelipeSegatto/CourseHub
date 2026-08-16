import { useEffect, useState } from "react";
import CardCourses from "../../components/CardCourses";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCursos() {
      try {
        const resposta = await fetch("http://localhost:3001/api/courses");
        const dados = await resposta.json();

        console.log("Cursos vindos da API:", dados);

        setCourses(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error("Erro ao buscar cursos:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCursos();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Carregando cursos...
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
    
      <h1 className="text-4xl font-bold text-gray-900">
        Encontre o curso que você procura
      </h1>

      <p className="mt-3 text-gray-600">
        Escolha um curso abaixo para ver todos os detalhes.
      </p>

      {courses.length === 0 ? (
        <p className="mt-8 text-gray-600">
          Nenhum curso encontrado.
        </p>
      ) : (
        <section className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3 bg-gradient-to-br from-blue-50 via-white to-grey-200 min-h-screen">
          {courses.map((course) => (
            <CardCourses key={course.id} course={course} />
          ))}
        
        </section>
        
      )}
    </main>
  );
}