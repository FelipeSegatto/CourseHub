import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/APIService";

import {
  listEnrollments,
  updateEnrollmentStatus,
  getClassChangeImpact,
  changeEnrollmentClass,
} from "../../services/AdminEnrollmentService";
import { listClasses } from "../../services/AdminClassService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminEnrollmentModal from "../../components/admin/AdminEnrollmentModal";
import AdminTable from "../../components/admin/AdminTable";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDisplayDate } from "../../utils/dateUtils";

const STATUS_OPTIONS = [
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "completed", label: "Concluídas" },
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

export default function EnrollmentsAdmin() {
  const [enrollments, setEnrollments] = useState([]);
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
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [courses, setCourses] = useState([]);
  const [filterClasses, setFilterClasses] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);

  const [rowActionLoading, setRowActionLoading] = useState(null);
  const [rowActionError, setRowActionError] = useState("");

  const [classChangeTarget, setClassChangeTarget] = useState(null);
  const [classChangeImpact, setClassChangeImpact] = useState(null);
  const [classChangeOptions, setClassChangeOptions] = useState([]);
  const [classChangeSelection, setClassChangeSelection] = useState("");
  const [classChangeReason, setClassChangeReason] = useState("");
  const [classChangeLoading, setClassChangeLoading] = useState(false);
  const [classChangeError, setClassChangeError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await listEnrollments({
        search,
        courseId,
        classId,
        status,
        from,
        to,
        page,
        limit: PAGE_LIMIT,
      });

      setEnrollments(Array.isArray(result?.data) ? result.data : []);
      setSummary(result?.summary || null);
      setPagination(
        result?.pagination || { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 }
      );
    } catch (requestError) {
      console.error("[EnrollmentsAdmin] erro ao buscar matrículas:", requestError);
      setError(requestError.message || "Não foi possível carregar as matrículas.");
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [search, courseId, classId, status, from, to, page]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    let ignoreRequest = false;

    async function loadCourses() {
      try {
        const response = await apiFetch("/api/admin/courses");

        if (!ignoreRequest) {
          setCourses(Array.isArray(response) ? response : []);
        }
      } catch (requestError) {
        if (!ignoreRequest) {
          console.error("Erro ao carregar cursos:", requestError);
        }
      }
    }

    loadCourses();

    return () => {
      ignoreRequest = true;
    };
  }, []);

  useEffect(() => {
    if (!courseId) {
      setFilterClasses([]);
      setClassId("");
      return;
    }

    let ignoreRequest = false;

    async function loadClassesForFilter() {
      try {
        const response = await listClasses({ courseId, limit: 100 });

        if (!ignoreRequest) {
          setFilterClasses(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (requestError) {
        if (!ignoreRequest) {
          console.error("Erro ao carregar turmas do curso:", requestError);
        }
      }
    }

    loadClassesForFilter();

    return () => {
      ignoreRequest = true;
    };
  }, [courseId]);

  async function handleModalSuccess() {
    setModalOpen(false);
    await fetchEnrollments();
  }

  async function handleStatusChange(enrollment, nextStatus) {
    try {
      setRowActionLoading(enrollment.id);
      setRowActionError("");

      await updateEnrollmentStatus(enrollment.id, nextStatus);
      await fetchEnrollments();
    } catch (requestError) {
      console.error("Erro ao alterar status da matrícula:", requestError);
      setRowActionError(requestError.message || "Erro ao alterar status da matrícula.");
    } finally {
      setRowActionLoading(null);
    }
  }

  async function openClassChangeModal(enrollment) {
    setClassChangeTarget(enrollment);
    setClassChangeImpact(null);
    setClassChangeSelection("");
    setClassChangeReason("");
    setClassChangeError("");
    setClassChangeLoading(true);

    try {
      const [impact, classesResponse] = await Promise.all([
        getClassChangeImpact(enrollment.id),
        listClasses({ courseId: enrollment.course.id, status: "active", limit: 100 }),
      ]);

      setClassChangeImpact(impact);
      setClassChangeOptions(
        (classesResponse?.data || []).filter((c) => c.id !== enrollment.class?.id)
      );
    } catch (requestError) {
      console.error("Erro ao carregar impacto da troca de turma:", requestError);
      setClassChangeError(
        requestError.message || "Não foi possível calcular o impacto da troca."
      );
    } finally {
      setClassChangeLoading(false);
    }
  }

  function closeClassChangeModal() {
    if (classChangeLoading) return;

    setClassChangeTarget(null);
    setClassChangeImpact(null);
    setClassChangeError("");
  }

  async function handleConfirmClassChange() {
    if (!classChangeTarget || !classChangeSelection) return;

    try {
      setClassChangeLoading(true);
      setClassChangeError("");

      await changeEnrollmentClass(classChangeTarget.id, {
        newClassId: Number(classChangeSelection),
        reason: classChangeReason,
      });

      closeClassChangeModal();
      await fetchEnrollments();
    } catch (requestError) {
      console.error("Erro ao trocar turma:", requestError);
      setClassChangeError(requestError.message || "Erro ao trocar turma.");
    } finally {
      setClassChangeLoading(false);
    }
  }

  const stats = [
    { title: "Total de matrículas", value: summary?.total ?? 0 },
    { title: "Ativas", value: summary?.active ?? 0, color: "green" },
    { title: "Canceladas", value: summary?.cancelled ?? 0, color: "red" },
    { title: "Concluídas", value: summary?.completed ?? 0, color: "purple" },
  ];

  const columns = [
    { key: "student", label: "Aluno" },
    { key: "course", label: "Curso" },
    { key: "class", label: "Turma" },
    { key: "enrolled_at", label: "Data" },
    { key: "status", label: "Status" },
    { key: "contract", label: "Contrato financeiro" },
    { key: "actions", label: "Ações" },
  ];

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

  return (
    <>
      <AdminManagementPage
        title="Gerenciamento de matrículas"
        description="Matricule alunos em cursos e turmas, acompanhe status e contratos financeiros gerados."
        createButtonText="+ Nova matrícula"
        onCreateClick={() => setModalOpen(true)}
        stats={stats}
        tableTitle="Lista de matrículas"
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
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setPage(1);
              }}
              disabled={!courseId}
              className={inputClass}
            >
              <option value="">Todas as turmas</option>
              {filterClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
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

            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className={inputClass}
              title="De"
            />

            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className={inputClass}
              title="Até"
            />
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por aluno, matrícula ou curso..."
      >
        {rowActionError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rowActionError}
          </p>
        )}

        {loading && (
          <p className="py-6 text-center text-gray-500">Carregando matrículas...</p>
        )}

        {!loading && error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchEnrollments}
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
              data={enrollments}
              emptyMessage="Nenhuma matrícula encontrada."
              renderRow={(enrollment) => (
                <tr key={enrollment.id} className="border-b border-gray-100">
                  <td className="py-5">
                    <p className="font-semibold text-gray-900">
                      {enrollment.student.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {enrollment.student.registrationNumber}
                    </p>
                  </td>

                  <td className="py-5 text-gray-600">{enrollment.course.name}</td>
                  <td className="py-5 text-gray-600">
                    {enrollment.class?.name || "Sem turma"}
                  </td>

                  <td className="py-5 text-gray-600">
                    {formatShortDate(enrollment.enrolledAt)}
                  </td>

                  <td className="py-5">
                    <StatusBadge status={enrollment.status} />
                  </td>

                  <td className="py-5">
                    {enrollment.financialContract ? (
                      <StatusBadge status={enrollment.financialContract.status} />
                    ) : (
                      <span className="text-sm text-gray-400">Sem contrato</span>
                    )}
                  </td>

                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      {enrollment.status === "active" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openClassChangeModal(enrollment)}
                            disabled={rowActionLoading === enrollment.id}
                            className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Trocar turma
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(enrollment, "completed")}
                            disabled={rowActionLoading === enrollment.id}
                            className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Concluir
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(enrollment, "cancelled")}
                            disabled={rowActionLoading === enrollment.id}
                            className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}

                      {enrollment.status !== "active" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(enrollment, "active")}
                          disabled={rowActionLoading === enrollment.id}
                          className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            />

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Página {pagination.page} de {pagination.totalPages} ·{" "}
                  {pagination.total} matrícula(s)
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
                      setPage((current) => Math.min(current + 1, pagination.totalPages))
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
        <AdminEnrollmentModal
          handleCloseModal={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {classChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Trocar turma</h2>

            <p className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
              {classChangeTarget.student.name} · {classChangeTarget.course.name}
            </p>

            {classChangeLoading && !classChangeImpact && (
              <p className="mt-4 text-sm text-gray-500">Calculando impacto...</p>
            )}

            {classChangeError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {classChangeError}
              </p>
            )}

            {classChangeImpact && (
              <>
                <p className="mt-4 text-sm text-gray-600">
                  Situação na turma atual ({classChangeTarget.class?.name || "sem turma"}
                  ):
                </p>

                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  <li>Atividades específicas: {classChangeImpact.oldClassActivities}</li>
                  <li>Conteúdos específicos: {classChangeImpact.oldClassContents}</li>
                  <li>Envios do aluno: {classChangeImpact.oldClassSubmissions}</li>
                  <li>Registros de frequência: {classChangeImpact.oldClassAttendance}</li>
                </ul>

                <p className="mt-3 text-xs text-gray-500">
                  Nada é apagado pela troca — o histórico acima permanece
                  vinculado à turma antiga. O aluno passa a ver apenas os
                  conteúdos/atividades da nova turma a partir de agora.
                </p>

                <label className="mt-4 block text-sm font-medium text-gray-700">
                  Nova turma
                  <select
                    value={classChangeSelection}
                    onChange={(event) => setClassChangeSelection(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Selecione a nova turma</option>
                    {classChangeOptions.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-medium text-gray-700">
                  Motivo da troca
                  <textarea
                    value={classChangeReason}
                    onChange={(event) => setClassChangeReason(event.target.value)}
                    rows="2"
                    placeholder="Ex: conflito de horário, pedido do aluno..."
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeClassChangeModal}
                disabled={classChangeLoading}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              {classChangeImpact && (
                <button
                  type="button"
                  onClick={handleConfirmClassChange}
                  disabled={classChangeLoading || !classChangeSelection}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {classChangeLoading ? "Salvando..." : "Confirmar troca"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
