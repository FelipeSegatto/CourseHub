import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/APIService";
import { AdminGradeService } from "../../services/AdminGradeService";
import { listClasses } from "../../services/AdminClassService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminTable from "../../components/admin/AdminTable";
import { formatDisplayDate } from "../../utils/dateUtils";

const PAGE_LIMIT = 10;

function formatShortDate(value) {
  if (!value) return "-";

  return formatDisplayDate(String(value).slice(0, 10), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function GradesAdmin() {
  const [items, setItems] = useState([]);
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
  const [teacherId, setTeacherId] = useState("");
  const [adjustedOnly, setAdjustedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filterClasses, setFilterClasses] = useState([]);

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustScore, setAdjustScore] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await AdminGradeService.list({
        search,
        courseId,
        classId,
        teacherId,
        adjustedOnly: adjustedOnly || undefined,
        page,
        limit: PAGE_LIMIT,
      });

      setItems(Array.isArray(result?.data) ? result.data : []);
      setSummary(result?.summary || null);
      setPagination(
        result?.pagination || { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 }
      );
    } catch (requestError) {
      console.error("[GradesAdmin] erro:", requestError);
      setError(requestError.message || "Não foi possível carregar as notas.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, courseId, classId, teacherId, adjustedOnly, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    let ignoreRequest = false;

    async function loadBaseOptions() {
      try {
        const [coursesResponse, teachersResponse] = await Promise.all([
          apiFetch("/api/admin/courses"),
          apiFetch("/api/admin/teachers"),
        ]);

        if (ignoreRequest) return;

        setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
        setTeachers(Array.isArray(teachersResponse) ? teachersResponse : []);
      } catch (requestError) {
        if (!ignoreRequest) console.error("Erro ao carregar filtros base:", requestError);
      }
    }

    loadBaseOptions();

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
        if (!ignoreRequest) console.error("Erro ao carregar turmas do curso:", requestError);
      }
    }

    loadClassesForFilter();

    return () => {
      ignoreRequest = true;
    };
  }, [courseId]);

  function handleAdjustClick(item) {
    setAdjustTarget(item);
    setAdjustScore(String(item.score));
    setAdjustReason("");
    setAdjustError("");
  }

  function closeAdjustModal() {
    if (adjustLoading) return;

    setAdjustTarget(null);
    setAdjustScore("");
    setAdjustReason("");
    setAdjustError("");
  }

  async function handleConfirmAdjust() {
    if (!adjustTarget) return;

    const normalizedScore = Number(adjustScore);

    if (Number.isNaN(normalizedScore) || normalizedScore < 0) {
      setAdjustError("Informe uma nota válida.");
      return;
    }

    if (normalizedScore > Number(adjustTarget.maxScore)) {
      setAdjustError(`A nota não pode ultrapassar ${adjustTarget.maxScore}.`);
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError("Informe o motivo do ajuste.");
      return;
    }

    try {
      setAdjustLoading(true);
      setAdjustError("");

      await AdminGradeService.adjust(adjustTarget.id, {
        score: normalizedScore,
        reason: adjustReason.trim(),
      });

      closeAdjustModal();
      await fetchItems();
    } catch (requestError) {
      console.error("Erro ao ajustar nota:", requestError);
      setAdjustError(requestError.message || "Erro ao ajustar nota.");
    } finally {
      setAdjustLoading(false);
    }
  }

  const stats = [
    { title: "Total de notas", value: summary?.total ?? 0 },
    { title: "Média geral", value: summary?.averageScore ?? "-" },
    { title: "Ajustadas por admin", value: summary?.adjustedCount ?? 0, color: "purple" },
  ];

  const columns = [
    { key: "student", label: "Aluno" },
    { key: "course", label: "Curso · Turma" },
    { key: "activity", label: "Atividade" },
    { key: "score", label: "Nota atual" },
    { key: "teacher", label: "Corrigida por" },
    { key: "adjustment", label: "Ajuste admin" },
    { key: "actions", label: "Ações" },
  ];

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

  return (
    <>
      <AdminManagementPage
        title="Notas dos alunos"
        description="Notas já lançadas pelos professores, com opção de ajuste administrativo auditado."
        stats={stats}
        tableTitle="Lista de notas"
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

            <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={adjustedOnly}
                onChange={(event) => {
                  setAdjustedOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Só ajustadas
            </label>
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar aluno ou atividade..."
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">Carregando notas...</p>
        )}

        {!loading && error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchItems}
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
              data={items}
              emptyMessage="Nenhuma nota encontrada."
              renderRow={(item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-5">
                    <p className="font-semibold text-gray-900">{item.student.name}</p>
                    <p className="text-xs text-gray-500">{item.student.registrationNumber}</p>
                  </td>

                  <td className="py-5 text-gray-600">
                    {item.course.name}
                    {item.class ? ` · ${item.class.name}` : ""}
                  </td>

                  <td className="py-5 text-gray-600">{item.activity.title}</td>

                  <td className="py-5 font-semibold text-gray-900">
                    {item.score} / {item.maxScore}
                  </td>

                  <td className="py-5 text-gray-600">{item.teacher?.name || "-"}</td>

                  <td className="py-5">
                    {item.adjustment ? (
                      <span
                        title={item.adjustment.reason || ""}
                        className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
                      >
                        {formatShortDate(item.adjustment.adjustedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  <td className="py-5">
                    <button
                      type="button"
                      onClick={() => handleAdjustClick(item)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              )}
            />

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Página {pagination.page} de {pagination.totalPages} · {pagination.total}{" "}
                  registro(s)
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

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Ajustar nota</h2>

            <p className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
              {adjustTarget.student.name} · {adjustTarget.activity.title}
            </p>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Nota atual: {adjustTarget.score} / {adjustTarget.maxScore}
              </label>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Nova nota</label>
              <input
                type="number"
                min="0"
                max={adjustTarget.maxScore}
                step="0.1"
                value={adjustScore}
                onChange={(event) => setAdjustScore(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Motivo do ajuste</label>
              <textarea
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="Explique o motivo da correção..."
              />
            </div>

            {adjustError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {adjustError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeAdjustModal}
                disabled={adjustLoading}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmAdjust}
                disabled={adjustLoading}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {adjustLoading ? "Salvando..." : "Salvar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
