import { useEffect, useState } from "react";
import CardCourses from "../../components/CardCourses";
import CourseService from "../../services/CourseService";
import HeroGreetingsText from "../../components/HeroGreetingsText";



export default function TeacherHome() {
  const [cursos, setCursos] = useState([]);

  const cursosData = CourseService();

  useEffect(() => {
    setCursos(cursosData);
  }, [cursosData]);

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