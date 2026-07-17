import { Link } from "react-router-dom";

export default function Card({ course }) {
  return (
    <article className="flex min-h-[320px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition">
      <span className="text-sm font-medium text-blue-600">
        {course.category}
      </span>

      <h2 className="mt-3 text-xl font-bold text-gray-900">
        {course.name}
      </h2>

      <img
        src={`/images/${course.image_url}`}
        alt={course.name}
        className="mt-4 h-48 w-full rounded-lg object-cover"
        onError={(e) => {
          e.target.src = "/images/default-course.webp";
        }}
      />

      <p className="mt-3 text-sm text-gray-600">
        Professor: {course.professor || "Não informado"}
      </p>
      <p className="mt-3 text-sm text-gray-600">
        Nível: {course.nivel || "Não informado"}
      </p>

      <p className="mt-3 text-sm text-gray-600">
        {course.expanded_description}
      </p>
      
      <p className="mt-3 text-sm text-gray-600">
        Ementa: {course.syllabus?.join(", ") || "Não informada"}
      </p>
      

      <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
        <span>{course.nivel}</span>
        <span>{course.workload_hours}h</span>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <strong className="text-lg text-gray-900">
          R$ {Number(course.price).toFixed(2)}
        </strong>

        <Link
          to={`/course/${course.id}`}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Acessar curso
        </Link>
      </div>
    </article>
  );
}