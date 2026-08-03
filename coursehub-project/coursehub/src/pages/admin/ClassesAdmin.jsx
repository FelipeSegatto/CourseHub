import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/APIService";

import {
  listClasses,
  getClassImpact,
  updateClassStatus,
  deleteClass,
} from "../../services/AdminClassService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminClassModal from "../../components/admin/AdminClassModal";
import AdminTable from "../../components/admin/AdminTable";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDisplayDate } from "../../utils/dateUtils";

const STATUS_OPTIONS = [
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
  { value: "finished", label: "Finalizadas" },
];

const SHIFT_OPTIONS = [
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "night", label: "Noite" },
  { value: "online", label: "Online" },
];

const PAGE_LIMIT = 10;

function formatShortDate(value) {
  if (!value) return "-";

  return formatDisplayDate(String(value).slice(0, 10), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClassesAdmin() {
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [status, setStatus] = useState("");
  const [shift, setShift] = useState("");
  const [page, setPage] = useState(1);

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedClass, setSelectedClass] = useState(null);

  const [impactTarget, setImpactTarget] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Busca digitada com debounce — a listagem agora é resolvida no
  // backend (paginação real), então cada tecla não pode disparar uma
  // requisição própria como acontecia no filtro em memória antigo.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await listClasses({
        search,
        courseId,
        teacherId,
        status,
        shift,
        page,
        limit: PAGE_LIMIT,
      });

      setClasses(Array.isArray(result?.data) ? result.data : []);
      setSummary(result?.summary || null);
      setPagination(
        result?.pagination || { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 }
      );
    } catch (requestError) {
      console.error("[ClassesAdmin] erro ao buscar turmas:", requestError);
      setError(requestError.message || "Não foi possível carregar as turmas.");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [search, courseId, teacherId, status, shift, page]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    let ignoreRequest = false;

    async function loadFilterOptions() {
      try {
        const [coursesResponse, teachersResponse] = await Promise.all([
          apiFetch("/api/admin/courses"),
          apiFetch("/api/admin/teachers"),
        ]);

        if (ignoreRequest) return;

        setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
        setTeachers(Array.isArray(teachersResponse) ? teachersResponse : []);
      } catch (requestError) {
        if (!ignoreRequest) {
          console.error("Erro ao carregar filtros:", requestError);
        }
      }
    }

    loadFilterOptions();

    return () => {
      ignoreRequest = true;
    };
  }, []);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedClass(null);
    setModalOpen(true);
  }

  function handleEditClick(classItem) {
    setModalMode("edit");
    setSelectedClass(classItem);
    setModalOpen(true);
  }

  async function handleModalSuccess() {
    setModalOpen(false);
    setSelectedClass(null);
    await fetchClasses();
  }

  async function handleRemoveClick(classItem) {
    setImpactTarget(classItem);
    setImpactData(null);
    setActionError("");
    setImpactLoading(true);

    try {
      const impact = await getClassImpact(classItem.id);
      setImpactData(impact);
    } catch (requestError) {
      console.error("Erro ao calcular impacto da turma:", requestError);
      setActionError(
        requestError.message || "Não foi possível calcular o impacto da turma."
      );
    } finally {
      setImpactLoading(false);
    }
  }

  function closeImpactModal() {
    if (actionLoading) return;

    setImpactTarget(null);
    setImpactData(null);
    setActionError("");
  }

  const hasImpact =
    impactData && Object.values(impactData).some((count) => count > 0);

  async function handleConfirmDelete() {
    if (!impactTarget) return;

    try {
      setActionLoading(true);
      setActionError("");

      await deleteClass(impactTarget.id);

      closeImpactModal();
      await fetchClasses();
    } catch (requestError) {
      console.error("Erro ao remover turma:", requestError);
      setActionError(requestError.message || "Erro ao remover turma.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInactivateInstead() {
    if (!impactTarget) return;

    try {
      setActionLoading(true);
      setActionError("");

      await updateClassStatus(impactTarget.id, "inactive");

      closeImpactModal();
      await fetchClasses();
    } catch (requestError) {
      console.error("Erro ao inativar turma:", requestError);
      setActionError(requestError.message || "Erro ao inativar turma.");
    } finally {
      setActionLoading(false);
    }
  }

  const stats = [
    { title: "Total de turmas", value: summary?.total ?? 0 },
    { title: "Turmas ativas", value: summary?.active ?? 0 },
    { title: "Inativas/Finalizadas", value: summary?.inactiveOrFinished ?? 0 },
    { title: "Alunos matriculados", value: summary?.totalActiveEnrollments ?? 0 },
  ];

  const columns = [
    { key: "class", label: "Turma" },
    { key: "course", label: "Curso" },
    { key: "teacher", label: "Professor" },
    { key: "shift", label: "Turno" },
    { key: "start_date", label: "Início" },
    { key: "end_date", label: "Término" },
    { key: "active_enrollments", label: "Alunos ativos" },
    { key: "session_count", label: "Sessões" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Ações" },
  ];

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

  return (
    <>
      <AdminManagementPage
        title="Gerenciamento de turmas"
        description="Acompanhe turmas cadastradas, professores responsáveis e matrículas ativas."
        createButtonText="+ Nova turma"
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle="Lista de turmas"
        tableActions={
          <div className="flex flex-wrap gap-3">
            <select
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            <select
              value={teacherId}
              onChange={(event) => {
                setTeacherId(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os professores</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>

            <select
              value={shift}
              onChange={(event) => {
                setShift(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os turnos</option>
              {SHIFT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar turma, curso ou professor..."
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">Carregando turmas...</p>
        )}

        {!loading && error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchClasses}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <AdminTable
              columns={columns}
              data={classes}
              emptyMessage="Nenhuma turma encontrada."
              renderRow={(classItem) => (
                <tr key={classItem.id} className="border-b border-gray-100">
                  <td className="py-5">
                    <p className="font-semibold text-gray-900">{classItem.name}</p>
                  </td>

                  <td className="py-5 text-gray-600">{classItem.course?.name || "-"}</td>
                  <td className="py-5 text-gray-600">
                    {classItem.teacher?.name || "-"}
                  </td>

                  <td className="py-5 text-gray-600">
                    {SHIFT_OPTIONS.find((option) => option.value === classItem.shift)
                      ?.label || classItem.shift}
                  </td>

                  <td className="py-5 text-gray-600">
                    {formatShortDate(classItem.startDate)}
                  </td>
                  <td className="py-5 text-gray-600">
                    {formatShortDate(classItem.endDate)}
                  </td>

                  <td className="py-5 text-gray-600">{classItem.activeEnrollments}</td>
                  <td className="py-5 text-gray-600">{classItem.sessionCount}</td>

                  <td className="py-5">
                    <StatusBadge status={classItem.status} />
                  </td>

                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(classItem)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveClick(classItem)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Página {pagination.page} de {pagination.totalPages} ·{" "}
                  {pagination.total} turma(s)
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(current + 1, pagination.totalPages)
                      )
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminManagementPage>

      {modalOpen && (
        <AdminClassModal
          mode={modalMode}
          initialData={selectedClass}
          handleCloseModal={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {impactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Remover turma</h2>

            <p className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
              {impactTarget.name}
            </p>

            {impactLoading && (
              <p className="mt-4 text-sm text-gray-500">Calculando impacto...</p>
            )}

            {actionError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </p>
            )}

            {!impactLoading && impactData && (
              <>
                {hasImpact ? (
                  <>
                    <p className="mt-4 text-sm text-red-600">
                      Esta turma possui vínculos ativos e não pode ser removida
                      permanentemente:
                    </p>

                    <ul className="mt-3 space-y-1 text-sm text-gray-700">
                      <li>Matrículas ativas: {impactData.activeEnrollments}</li>
                      <li>Atividades específicas: {impactData.activities}</li>
                      <li>Conteúdos específicos: {impactData.courseContents}</li>
                      <li>Sessões: {impactData.sessions}</li>
                      <li>Registros de frequência: {impactData.attendanceRecords}</li>
                    </ul>

                    <p className="mt-4 text-sm text-gray-600">
                      Você pode inativar a turma em vez de excluí-la — o histórico
                      é preservado.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">
                    Esta turma não possui matrículas, atividades, conteúdos,
                    sessões ou frequência registrada — pode ser removida
                    permanentemente.
                  </p>
                )}
              </>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeImpactModal}
                disabled={actionLoading}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              {!impactLoading && impactData && hasImpact && (
                <button
                  type="button"
                  onClick={handleInactivateInstead}
                  disabled={actionLoading}
                  className="rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-60"
                >
                  {actionLoading ? "Inativando..." : "Inativar turma"}
                </button>
              )}

              {!impactLoading && impactData && !hasImpact && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={actionLoading}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading ? "Removendo..." : "Remover permanentemente"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
