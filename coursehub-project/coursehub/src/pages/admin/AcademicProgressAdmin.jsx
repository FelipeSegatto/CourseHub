import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../services/APIService";

import { listAcademicProgress } from "../../services/AdminAcademicProgressService";
import { listClasses } from "../../services/AdminClassService";

import ManagementPageShell from "../../components/ui/ManagementPageShell";
import ExportPdfButton from "../../components/reports/ExportPdfButton";
import AdminTable from "../../components/admin/AdminTable";

const PAGE_LIMIT = 20;

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

/**
 * Progresso acadêmico (conteúdos) por matrícula ativa -- não existia
 * visão admin agregada para isso antes da Fase 3 de relatórios; esta
 * tela e o endpoint que ela consome (GET /api/admin/academic-progress,
 * services/admin/adminAcademicProgressService.js) são novos, criados
 * junto com a exportação em PDF (menor prioridade entre os 5
 * relatórios, por isso a tela é deliberadamente enxuta: sem
 * criação/edição, só consulta e exportação).
 */
export default function AcademicProgressAdmin() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);

  const [courses, setCourses] = useState([]);
  const [filterClasses, setFilterClasses] = useState([]);

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

      const result = await listAcademicProgress({ search, courseId, classId, page, limit: PAGE_LIMIT });

      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
    } catch (requestError) {
      console.error("[AcademicProgressAdmin] erro:", requestError);
      setError(requestError.message || "Não foi possível carregar o progresso acadêmico.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, courseId, classId, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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

  const columns = [
    { key: "student", label: "Aluno" },
    { key: "course", label: "Curso" },
    { key: "class", label: "Turma" },
    { key: "contents", label: "Conteúdos concluídos" },
    { key: "progress", label: "Progresso" },
  ];

  function renderRow(row) {
    return (
      <tr key={row.enrollmentId} className="border-b border-gray-100 text-sm text-gray-700">
        <td className="py-3">
          <p className="font-medium text-gray-900">{row.student.name}</p>
          <p className="text-xs text-gray-500">{row.student.registrationNumber}</p>
        </td>
        <td className="py-3">{row.course.name}</td>
        <td className="py-3">{row.class?.name || "—"}</td>
        <td className="py-3">
          {row.completedContents} / {row.totalContents}
        </td>
        <td className="py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.min(row.progressPercentage, 100)}%` }}
              />
            </div>

            <span className="text-xs font-semibold text-gray-600">{row.progressPercentage.toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <ManagementPageShell
      backTo="/admin/dashboard-admin"
      title="Progresso acadêmico"
      description="Percentual de conteúdos concluídos por aluno, considerando apenas matrículas ativas."
      tableTitle="Progresso por matrícula"
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

          <ExportPdfButton
            basePath="/api/admin/reports/academic-progress"
            filters={{ search, courseId, classId }}
          />
        </div>
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Buscar por aluno ou matrícula..."
    >
      {loading && <p className="py-6 text-center text-gray-500">Carregando progresso acadêmico...</p>}

      {!loading && error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={fetchItems}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
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
            renderRow={renderRow}
            emptyMessage="Nenhuma matrícula ativa encontrada para os filtros selecionados."
          />

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} matrícula(s)
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page <= 1}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </ManagementPageShell>
  );
}
