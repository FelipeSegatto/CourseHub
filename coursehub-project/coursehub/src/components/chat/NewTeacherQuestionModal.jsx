import { useEffect, useState } from "react";
import { apiFetch } from "../../services/APIService";
import { openTeacherQuestion } from "../../services/ChatService";

const TOPICS = [
  { value: "content", label: "Conteúdo" },
  { value: "activity", label: "Atividade" },
  { value: "exam", label: "Avaliação" },
  { value: "grade", label: "Nota" },
  { value: "attendance", label: "Frequência" },
  { value: "session", label: "Encontro" },
  { value: "general", label: "Geral" },
];

export default function NewTeacherQuestionModal({ onClose, onConversationStarted }) {
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const result = await apiFetch("/api/students/me/courses");
        const list = Array.isArray(result) ? result : result?.courses || [];

        if (!cancelled) {
          setCourses(list);
          if (list.length > 0) setCourseId(String(list[0].id));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Não foi possível carregar seus cursos.");
        }
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!courseId || !subject.trim() || !body.trim()) return;

    try {
      setSubmitting(true);
      setError("");

      const result = await openTeacherQuestion({
        courseId: Number(courseId),
        topic,
        subject: subject.trim(),
        body: body.trim(),
      });

      onConversationStarted(result.conversationId);
    } catch (requestError) {
      setError(requestError.message || "Não foi possível abrir a dúvida.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nova dúvida com o professor</h2>

          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-600" aria-label="Fechar">
            ✕
          </button>
        </div>

        {coursesLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Carregando seus cursos...</p>
        ) : courses.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Você precisa estar matriculado em um curso para abrir uma dúvida.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Curso</label>
              <select
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Tópico</label>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                {TOPICS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value.slice(0, 180))}
                placeholder="Resumo da sua dúvida"
                maxLength={180}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Mensagem</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, 4000))}
                rows={4}
                maxLength={4000}
                placeholder="Descreva sua dúvida em detalhes..."
                className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !courseId || !subject.trim() || !body.trim()}
              className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar dúvida"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
