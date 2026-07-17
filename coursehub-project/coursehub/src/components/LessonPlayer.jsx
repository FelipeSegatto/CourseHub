import { Link } from "react-router-dom";

export default function LessonPlayer({ lesson }) {
  if (!lesson) {
    return (
      <div className="rounded-xl border border-gray-200 p-6">
        <p className="text-gray-600">Selecione um conteúdo para visualizar.</p>
      </div>
    );
  }

  if (lesson.type === "activity" || lesson.type === "assessment") {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {lesson.title}
        </h2>

        <p className="mb-4 rounded-xl border border-gray-200 p-4 text-gray-700">
          {lesson.description || "Atividade disponível para realização."}
        </p>

        <Link
          to={`/aluno/atividades/${lesson.id}`}
          className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {lesson.type === "assessment" ? "Realizar avaliação" : "Realizar atividade"}
        </Link>
      </div>
    );
  }

  if (lesson.type === "video") {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {lesson.title}
        </h2>

        <iframe
          width="100%"
          height="420"
          src={getYoutubeEmbedUrl(lesson.content_url)}
          title={lesson.title}
          frameBorder="0"
          allowFullScreen
          className="rounded-xl border"
        />
      </div>
    );
  }

  if (lesson.type === "pdf") {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {lesson.title}
        </h2>

        <iframe
          src={getDrivePreviewUrl(lesson.content_url)}
          width="100%"
          height="520"
          title={lesson.title}
          className="rounded-xl border"
        />
      </div>
    );
  }

  if (lesson.type === "text") {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {lesson.title}
        </h2>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-700">
          {lesson.content_text || lesson.description || "Texto não cadastrado."}
        </div>
      </div>
    );
  }

  return (
    <p className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-700">
      Tipo de conteúdo não reconhecido: {lesson.type}
    </p>
  );
}

function getYoutubeEmbedUrl(url = "") {
  if (!url) return "";

  if (url.includes("watch?v=")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes("/embed/")) {
    return url;
  }

  return "";
}

function getDrivePreviewUrl(url = "") {
  if (!url) return "";

  if (url.includes("/preview")) return url;

  const match = url.match(/\/d\/(.+?)\//);

  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }

  return url;
}