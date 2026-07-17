import { Link } from "react-router-dom";

export default function LessonNavigation({
  previousLesson,
  nextLesson,
  onPrevious,
  onNext,
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      {previousLesson ? (
        <button
          onClick={onPrevious}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
        >
          ← Aula anterior
        </button>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Próxima aula →
        </button>
      ) : (
        <button
          className="cursor-default rounded-xl bg-green-600 px-5 py-3 font-semibold text-white"
          disabled
        >
          Curso concluído ✓
        </button>
      )}
    </div>
  );
}