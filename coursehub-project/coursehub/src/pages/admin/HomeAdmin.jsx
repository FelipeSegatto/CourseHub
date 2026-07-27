import { useEffect, useState } from "react";
import CardCourses from "../../components/CardCourses";
import { apiFetch } from "../../services/APIService";
import HeroGreetingsText from "../../components/HeroGreetingsText";


export default function HomeAdmin() {
  const [cursos, setCursos] = useState([]);

  useEffect(() => {
  async function fetchCursos() {
    try {
      const dados = await apiFetch("/api/courses");

      setCursos(
        Array.isArray(dados)
          ? dados
          : Array.isArray(dados?.courses)
            ? dados.courses
            : Array.isArray(dados?.data)
              ? dados.data
              : []
      );
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
      setCursos([]);
    }
  }

  fetchCursos();
}, []);

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <HeroGreetingsText />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cursos.map((course) => (
            <CardCourses key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}