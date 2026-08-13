import { Link } from "react-router-dom";

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * course_pricing_plans é a única fonte de preço comercial -- nunca
 * course.price (mantido no banco só por compatibilidade, nunca
 * usado aqui, nem como fallback). Sem plano ativo, mostramos
 * "Consulte os valores" em vez de omitir o preço silenciosamente.
 */
function PriceDisplay({ pricing }) {
  if (!pricing?.hasActivePlans) {
    return <span className="text-sm font-semibold text-gray-500">Consulte os valores</span>;
  }

  return (
    <div>
      <strong className="block text-base text-gray-950">
        Curso a partir de {formatCurrency(pricing.startingPrice)}
      </strong>

      {pricing.monthlyPaymentFrom !== null && (
        <span className="block text-xs text-gray-500">
          Mensalidades a partir de {formatCurrency(pricing.monthlyPaymentFrom)}
        </span>
      )}
    </div>
  );
}

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

        <div className="mt-5 flex items-center justify-between gap-3">
          <PriceDisplay pricing={course.pricing} />

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