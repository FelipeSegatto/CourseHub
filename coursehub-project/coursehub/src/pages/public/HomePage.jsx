import { useState, useEffect } from "react";
import CardCourses from "../../components/CardCourses";
import CourseService from "../../services/CourseService";



export default function HomePage() {
const [cursos, setCursos] = useState([]);

const cursosData = CourseService();

useEffect(() => {
  setCursos(cursosData);
}, [cursosData]);


  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-4xl">
      
          <span className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Cursos práticos para projetos reais
          </span>

          <h1 className="max-w-3xl text-5xl font-sans leading-tight tracking-tight text-gray-950">
            Aprenda tecnologia construindo produtos digitais de verdade.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Cursos objetivos de programação, design e desenvolvimento web para
            você criar dashboards, interfaces modernas e projetos de portfólio.
          </p>

          <div className="mt-7 flex gap-3">
            <a
              href="#courses"
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Ver cursos
            </a>

            <a
              href="#features"
              className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Como funciona
            </a>
          </div>
        </div>

        <div id="courses" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cursos.slice(0, 6).map((course) => (
            <CardCourses key={course.id} course={course} />
          ))}
        </div>

        <div
          id="features"
          className="mt-16 grid gap-8 border-t border-gray-200 pt-10 md:grid-cols-2"
        >
          <div className="space-y-4 text-sm text-gray-700">
            <p>✦ Projetos reais para colocar no portfólio.</p>
            <p>✦ Aulas objetivas, práticas e sem enrolação.</p>
            <p>✦ Conteúdo focado em carreira e mercado.</p>
            <p>✦ Desenvolvimento de interfaces modernas.</p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <span className="font-semibold text-gray-900">Front-end moderno</span>
              <span className="text-gray-400">→</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <span className="font-semibold text-gray-900">Design para sistemas</span>
              <span className="text-gray-400">→</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <span className="font-semibold text-gray-900">Projetos para portfólio</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}