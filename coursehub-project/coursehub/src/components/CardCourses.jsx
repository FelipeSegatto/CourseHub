import { Link } from "react-router-dom";

export default function CardCourses({ course }) {
  return (
    <article className="group">
      <div className="overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={course.image_url || "/images/default-course.webp"}
          alt={course.name}
          className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/images/default-course.webp";
          }}
        />
      </div>

      <div className="mt-4">
        {course.category && (
          <span className="text-sm font-semibold text-blue-600">
            {course.category}
          </span>
        )}

        <h2 className="mt-2 text-xl font-semibold font-sans leading-snug text-gray-950">
          {course.name}
        </h2>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
          {course.description}
        </p>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{course.nivel}</span>
          <span>{course.workload_hours}h</span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <strong className="text-base text-gray-950">
            R$ {Number(course.price).toFixed(2)}
          </strong>

          <Link
            to={`/course/${course.id}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Acessar →
          </Link>
        </div>
      </div>
    </article>
  );
}