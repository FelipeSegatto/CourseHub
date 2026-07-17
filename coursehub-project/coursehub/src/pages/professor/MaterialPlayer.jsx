import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import LessonPlayer from "../../components/LessonPlayer";

export default function DashboardMaterial() {
  const { id } = useParams();
  const Navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [allContents, setAllContents] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedType, setSelectedType] = useState("video");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = [
    { type: "video", label: "Vídeo aulas" },
    { type: "pdf", label: "PDFs / Apostilas" },
    { type: "atividade", label: "Atividades" },
    { type: "avaliacao", label: "Avaliações" },
  ];

  

  useEffect(() => {
    async function fetchCourseData() {
      try {
        setLoading(true);
        setError("");

        const courseResponse = await fetch(`http://localhost:3001/courses/${id}`);
        const courseData = await courseResponse.json();

        if (!courseResponse.ok) {
          throw new Error(courseData.message || "Curso não encontrado.");
        }

        setCourse(courseData);

        const contentsResponse = await fetch(
          `http://localhost:3001/courses/${id}/contents`
        );
        const contentsData = await contentsResponse.json();

        if (!contentsResponse.ok) {
          throw new Error(contentsData.message || "Erro ao buscar conteúdos.");
        }

        setAllContents(contentsData);

        const firstVideo = contentsData.find((content) => content.type === "video");
        const firstContent = firstVideo || contentsData[0] || null;

        setSelectedContent(firstContent);

        if (firstContent) {
          setSelectedType(firstContent.type);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do curso:", error);

        setCourse(null);
        setAllContents([]);
        setSelectedContent(null);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseData();
  }, [id]);

  const filteredContents = allContents.filter(
    (content) => content.type === selectedType
  );

  const currentIndex = filteredContents.findIndex(
    (content) => content.id === selectedContent?.id
  );

  const isVideoTab = selectedType === "video";
  const isFirstContent = currentIndex <= 0;
  const isLastContent = currentIndex === filteredContents.length - 1;

  function handleSelectCategory(type) {
    setSelectedType(type);

    const firstContentOfType = allContents.find(
      (content) => content.type === type
    );

    setSelectedContent(firstContentOfType || null);
  }

  function handlePreviousContent() {
    if (!isVideoTab || isFirstContent) return;

    setSelectedContent(filteredContents[currentIndex - 1]);
  }

  function handleNextContent() {
    if (!isVideoTab || isLastContent) return;

    setSelectedContent(filteredContents[currentIndex + 1]);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Carregando curso...
        </h1>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Curso não encontrado
        </h1>

        {error && <p className="mt-4 text-red-600">{error}</p>}

        <button
            onClick={() => Navigate(-1)}
          
          className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition"
        >
          Voltar para a página anterior
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <button
        onClick={() => Navigate(-1)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        ← Voltar para a página anterior
      </button>
         

      <h1 className="mt-6 text-5xl font-bold text-gray-900">{course.name}</h1>

      <section className="mt-10 flex gap-8">
        <div className="flex-[1.5] rounded-2xl border border-gray-200 p-6">
          <LessonPlayer lesson={selectedContent} />

          {isVideoTab && filteredContents.length > 0 && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                onClick={handlePreviousContent}
                disabled={isFirstContent}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  isFirstContent
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                ← Aula anterior
              </button>

              <span className="text-sm font-semibold text-gray-600">
                Aula {currentIndex + 1} de {filteredContents.length}
              </span>

              <button
                onClick={handleNextContent}
                disabled={isLastContent}
                className={`rounded-xl px-5 py-3 font-semibold transition ${
                  isLastContent
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Próxima aula →
              </button>
            </div>
          )}
        </div>

        <aside className="flex-1 rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Conteúdo do curso
          </h2>

          <nav className="mt-5 grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <button
                key={category.type}
                onClick={() => handleSelectCategory(category.type)}
                className={`rounded-xl border p-3 text-sm font-semibold transition ${
                  selectedType === category.type
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {category.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-2">
            {filteredContents.length === 0 && (
              <p className="rounded-xl border border-gray-200 p-4 text-gray-500">
                Nenhum conteúdo cadastrado nesta categoria.
              </p>
            )}

            {filteredContents.map((content) => (
              <button
                key={content.id}
                onClick={() => setSelectedContent(content)}
                className={`block w-full rounded-xl border p-3 text-left transition ${
                  selectedContent?.id === content.id
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="block font-semibold">{content.title}</span>

                <span className="mt-1 block text-xs text-gray-500">
                  {content.type === "video" && "Vídeo aula"}
                  {content.type === "pdf" && "PDF / Apostila"}
                  {content.type === "activity" && "Atividade"}
                  {content.type === "assessment" && "Avaliação"}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}