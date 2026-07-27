import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";
import SessionModal from "../../components/teachers/SessionModal";

const sessionTypeOptions = [
  {
    value: "class",
    label: "Aula",
  },
  {
    value: "review",
    label: "Revisão",
  },
  {
    value: "exam",
    label: "Prova",
  },
  {
    value: "presentation",
    label: "Apresentação",
  },
  {
    value: "workshop",
    label: "Workshop",
  },
  {
    value: "lab",
    label: "Laboratório",
  },
  {
    value: "recovery",
    label: "Recuperação",
  },
  {
    value: "other",
    label: "Outro",
  },
];

const sessionStatusOptions = [
  {
    value: "scheduled",
    label: "Agendado",
  },
  {
    value: "completed",
    label: "Concluído",
  },
  {
    value: "cancelled",
    label: "Cancelado",
  },
];

const sessionStatusFilterOptions = [
  {
    value: "",
    label: "Todos os encontros",
  },
  ...sessionStatusOptions,
];


function formatDate(dateValue) {
  if (!dateValue) return "Data não informada";

  const datePart = String(dateValue).split("T")[0];
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return "Data não informada";
  }

  return `${day}/${month}/${year}`;
}

function formatLongDate(dateValue) {
  if (!dateValue) return "Data não informada";

  const datePart = String(dateValue).split("T")[0];
  const [year, month, day] = datePart
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return "Data não informada";
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(timeValue) {
  if (!timeValue) return null;

  return String(timeValue).slice(0, 5);
}

function formatSessionTime(startTime, endTime) {
  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);

  if (formattedStart && formattedEnd) {
    return `${formattedStart} às ${formattedEnd}`;
  }

  if (formattedStart) {
    return `A partir das ${formattedStart}`;
  }

  if (formattedEnd) {
    return `Até ${formattedEnd}`;
  }

  return "Horário não informado";
}

function getSessionTypeLabel(sessionType) {
  const option = sessionTypeOptions.find(
    (item) => item.value === sessionType
  );

  return option?.label || "Outro";
}

function getSessionStatusLabel(status) {
  const option = sessionStatusOptions.find(
    (item) => item.value === status
  );

  return option?.label || status;
}

function getSessionStatusClasses(status) {
  const classes = {
    scheduled:
      "bg-blue-100 text-blue-700 border-blue-200",

    completed:
      "bg-green-100 text-green-700 border-green-200",

    cancelled:
      "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    classes[status] ||
    "bg-gray-100 text-gray-600 border-gray-200"
  );
}

function getClassStatusLabel(status) {
  const labels = {
    active: "Ativa",
    inactive: "Inativa",
    completed: "Concluída",
    archived: "Arquivada",
  };

  return labels[status] || status || "Não informado";
}

function getClassStatusClasses(status) {
  const classes = {
    active:
      "bg-green-100 text-green-700 border-green-200",

    inactive:
      "bg-yellow-100 text-yellow-700 border-yellow-200",

    completed:
      "bg-blue-100 text-blue-700 border-blue-200",

    archived:
      "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    classes[status] ||
    "bg-gray-100 text-gray-600 border-gray-200"
  );
}

function getErrorMessage(error) {
  return (
    error?.message ||
    "Não foi possível concluir a operação."
  );
}

export default function ClassDetailsProfessor() {
  const { classId } = useParams();

  const navigate = useNavigate();

  const { usuarioLogado } = useAuth();

  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [summary, setSummary] = useState({
    totalSessions: 0,
    activeSessionCount: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    plannedSessionCount: 0,
    remainingToPlan: null,
  });

  const [statusFilter, setStatusFilter] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingSession, setEditingSession] =
    useState(null);




  const [cancellingSessionId, setCancellingSessionId] =
    useState(null);

  async function loadClassSessions() {
    if (!usuarioLogado?.id || !classId) return;

    try {
      setLoading(true);
      setError("");

      const data = await apiFetch(
        `/api/teacher/by-user/${usuarioLogado.id}/classes/${classId}/sessions`
      );

      setClassData(data?.class || null);

      setSessions(
        Array.isArray(data?.sessions)
          ? data.sessions
          : []
      );

      setSummary((currentSummary) => ({
        ...currentSummary,
        ...(data?.summary || {}),
      }));
    } catch (loadError) {
      console.error(
        "Erro ao carregar detalhes da turma:",
        loadError
      );

      setClassData(null);
      setSessions([]);

      setError(
        getErrorMessage(loadError)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClassSessions();
  }, [usuarioLogado?.id, classId]);

  const filteredSessions = useMemo(() => {
    if (!statusFilter) {
      return sessions;
    }

    return sessions.filter(
      (session) =>
        session.status === statusFilter
    );
  }, [sessions, statusFilter]);

  const nextSessionNumber = useMemo(() => {
    if (sessions.length === 0) {
      return 1;
    }

    const highestNumber = sessions.reduce(
      (highest, session) =>
        Math.max(
          highest,
          Number(session.sessionNumber || 0)
        ),
      0
    );

    return highestNumber + 1;
  }, [sessions]);

  function openCreateModal() {
    setEditingSession(null);
    setIsModalOpen(true);
  }

  function openEditModal(session) {
    setEditingSession(session);
    setIsModalOpen(true);
  }

  function closeSessionModal() {
    setIsModalOpen(false);
    setEditingSession(null);
  }

  async function handleSessionSaved() {
    await loadClassSessions();
  }

  async function handleCancelSession(session) {
    if (!usuarioLogado?.id) return;

    const shouldCancel = window.confirm(
      `Deseja cancelar o encontro "${session.title}"?`
    );

    if (!shouldCancel) return;

    try {
      setCancellingSessionId(session.id);
      setError("");

      const data = await apiFetch(
        `/api/teacher/by-user/${usuarioLogado.id}/class-sessions/${session.id}`,
        {
          method: "DELETE",
        }
      );

      const cancelledSession =
        data?.session;

      if (cancelledSession) {
        setSessions((currentSessions) =>
          currentSessions.map(
            (currentSession) =>
              currentSession.id ===
              cancelledSession.id
                ? {
                    ...currentSession,
                    ...cancelledSession,
                  }
                : currentSession
          )
        );
      }

      await loadClassSessions();
    } catch (cancelError) {
      console.error(
        "Erro ao cancelar encontro:",
        cancelError
      );

      setError(
        getErrorMessage(cancelError)
      );
    } finally {
      setCancellingSessionId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-gray-500">
              Carregando detalhes da turma...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !classData) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Voltar
          </button>

          <div className="rounded-3xl border border-red-100 bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">
              Não foi possível abrir a turma
            </h1>

            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadClassSessions}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/professor/minhas-turmas"
          className="inline-flex items-center text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >
          ← Voltar para minhas turmas
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                    Detalhes da turma
                  </p>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getClassStatusClasses(
                      classData?.status
                    )}`}
                  >
                    {getClassStatusLabel(
                      classData?.status
                    )}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-bold text-gray-900">
                  {classData?.name ||
                    `Turma #${classId}`}
                </h1>

                <p className="mt-2 text-gray-500">
                  {classData?.courseTitle ||
                    classData?.courseName ||
                    "Curso não informado"}
                </p>

                {classData?.shift && (
                  <p className="mt-2 text-sm text-gray-500">
                    Turno: {classData.shift}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/professor/turmas/${classId}/frequencia`}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Ver frequência geral
                </Link>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  + Novo encontro
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 xl:grid-cols-4">
            <SummaryCard
              title="Encontros planejados"
              value={
                summary.plannedSessionCount ||
                classData?.plannedSessionCount ||
                0
              }
            />

            <SummaryCard
              title="Agendados"
              value={summary.scheduled || 0}
            />

            <SummaryCard
              title="Concluídos"
              value={summary.completed || 0}
            />

            <SummaryCard
              title="Faltam planejar"
              value={
                summary.remainingToPlan ??
                "-"
              }
            />
          </div>
        </section>

        {error && classData && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Encontros e aulas
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Gerencie aulas, revisões, provas e
                outros encontros desta turma.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {sessionStatusFilterOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Novo encontro
              </button>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {sessions.length === 0
                  ? "Nenhum encontro cadastrado"
                  : "Nenhum encontro encontrado"}
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
                {sessions.length === 0
                  ? "Adicione as aulas, revisões, provas e outros encontros previstos para esta turma."
                  : "Não existem encontros correspondentes ao filtro selecionado."}
              </p>

              {sessions.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  + Criar primeiro encontro
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-5">
              {filteredSessions.map(
                (session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    classId={classId}
                    onEdit={() =>
                      openEditModal(session)
                    }
                    onCancel={() =>
                      handleCancelSession(
                        session
                      )
                    }
                    cancelling={
                      cancellingSessionId ===
                      session.id
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>

      <SessionModal
        open={isModalOpen}
        classId={classId}
        session={editingSession}
        nextSessionNumber={nextSessionNumber}
        onClose={closeSessionModal}
        onSaved={handleSessionSaved}
      />
    </main>
  );
}

function SummaryCard({ title, value }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </article>
  );
}

function SessionCard({
  session,
  classId,
  onEdit,
  onCancel,
  cancelling,
}) {
  const attendanceSummary =
    session.attendanceSummary || {};

  const hasAttendance =
    Number(attendanceSummary.total || 0) > 0;

  const isCancelled =
    session.status === "cancelled";

  const isCompleted =
    session.status === "completed";

  return (
    <article
      className={`rounded-3xl border p-5 transition sm:p-6 ${
        isCancelled
          ? "border-gray-200 bg-gray-50 opacity-80"
          : "border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-blue-600">
              Encontro{" "}
              {String(
                session.sessionNumber || 0
              ).padStart(2, "0")}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSessionStatusClasses(
                session.status
              )}`}
            >
              {getSessionStatusLabel(
                session.status
              )}
            </span>

            <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              {getSessionTypeLabel(
                session.sessionType
              )}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold text-gray-900">
            {session.title}
          </h3>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <span>
              {formatLongDate(
                session.sessionDate
              )}
            </span>

            <span>
              {formatSessionTime(
                session.startTime,
                session.endTime
              )}
            </span>
          </div>

          {session.description && (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
              {session.description}
            </p>
          )}

          {hasAttendance && (
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
                {attendanceSummary.present || 0}{" "}
                presentes
              </span>

              <span className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                {attendanceSummary.absent || 0}{" "}
                ausentes
              </span>

              <span className="rounded-lg bg-yellow-50 px-3 py-2 text-yellow-700">
                {attendanceSummary.late || 0}{" "}
                atrasados
              </span>

              <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                {attendanceSummary.excused || 0}{" "}
                justificados
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!isCancelled && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Editar
              </button>

              <button
                type="button"
                disabled
                title="A chamada por encontro será conectada na próxima etapa."
                className="cursor-not-allowed rounded-xl bg-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-500 opacity-70"
              >
                {isCompleted
                  ? "Ver chamada"
                  : "Fazer chamada"}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling
                  ? "Cancelando..."
                  : "Cancelar"}
              </button>
            </>
          )}

          {isCancelled && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Editar encontro
            </button>
          )}
        </div>
      </div>
    </article>
  );
}