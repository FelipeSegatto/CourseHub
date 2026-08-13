import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/APIService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminCreateEditModal from "../../components/admin/AdminCreateEditModal";
import DeleteConfirmModal from "../../components/admin/AdminDeleteModal";
import AdminTable from "../../components/admin/AdminTable";
import AdminStatusFilter from "../../components/admin/AdminStatusFilter";
import StatusBadge from "../../components/ui/StatusBadge";

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** course_pricing_plans é a única fonte de preço -- nunca course.price. */
function PricingCell({ pricing }) {
  if (!pricing?.hasActivePlans) {
    return <span className="text-gray-400">Consulte os valores</span>;
  }

  return (
    <div>
      <p className="font-medium text-gray-900">A partir de {formatCurrency(pricing.startingPrice)}</p>
      {pricing.monthlyPaymentFrom !== null && (
        <p className="text-xs text-gray-500">
          Mensalidades a partir de {formatCurrency(pricing.monthlyPaymentFrom)}
        </p>
      )}
    </div>
  );
}

const courseStatusOptions = [
  { value: "", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "draft", label: "Rascunhos" },
  { value: "archived", label: "Arquivados" },
];

export default function CourseAdmin() {
  const [courses, setCourses] = useState([]);
  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [statusFilter, setStatusFilter] = useState("active");

  async function fetchCourses() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/api/admin/courses");

      const courseList = Array.isArray(response)
        ? response
        : Array.isArray(response?.courses)
          ? response.courses
          : Array.isArray(response?.data)
            ? response.data
            : [];

      setCourses(courseList);
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);

      setCourses([]);

      setError(
        error.message || "Erro ao buscar cursos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedCourse(null);
    setModalOpen(true);
  }

  function handleEditClick(course) {
    setModalMode("edit");
    setSelectedCourse(course);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setModalMode("create");
    setSelectedCourse(null);
  }

  async function handleCourseSuccess() {
    await fetchCourses();
    handleCloseModal();
  }

  function handleDeleteClick(course) {
    /*
     * Corrigido:
     * antes estava salvando o array completo `courses`.
     */
    setSelectedCourse(course);
    setDeleteModalOpen(true);
  }

  function handleCloseDeleteModal() {
    if (loadingDelete) return;

    setDeleteModalOpen(false);
    setSelectedCourse(null);
  }

  async function handleConfirmDelete() {
    if (!selectedCourse?.id || loadingDelete) {
      return;
    }

    try {
      setLoadingDelete(true);
      setError("");

      await apiFetch(
        `/api/admin/courses/${selectedCourse.id}`,
        {
          method: "DELETE",
        }
      );

      /*
       * Atualização local imediata.
       *
       * Ajuste "inactive" caso sua rota DELETE use
       * outro status para soft delete.
       */
      setCourses((previousCourses) =>
        previousCourses.map((course) =>
          course.id === selectedCourse.id
            ? {
                ...course,
                status: "inactive",
              }
            : course
        )
      );

      handleCloseDeleteModal();
    } catch (error) {
      console.error("Erro ao remover curso:", error);

      setError(
        error.message || "Erro ao remover curso."
      );
    } finally {
      setLoadingDelete(false);
    }
  }

  const filteredCourses = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return courses.filter((course) => {
      const name =
        course.name?.toLowerCase() || "";

      const category =
        course.category?.toLowerCase() || "";

      const teacherName =
        course.teacher_name?.toLowerCase() || "";

      const status =
        course.status?.toLowerCase() || "";

      const matchesSearch =
        !term ||
        name.includes(term) ||
        category.includes(term) ||
        teacherName.includes(term) ||
        status.includes(term);

      const matchesStatus =
        !statusFilter ||
        course.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courses, busca, statusFilter]);

  const stats = useMemo(() => {
    return [
      {
        title: "Total de cursos",
        value: courses.length,
      },
      {
        title: "Cursos ativos",
        value: courses.filter(
          (course) => course.status === "active"
        ).length,
      },
      {
        title: "Rascunhos/Inativos",
        value: courses.filter(
          (course) =>
            course.status === "draft" ||
            course.status === "inactive"
        ).length,
      },
      {
        title: "Matrículas totais",
        value: courses.reduce(
          (total, course) =>
            total +
            Number(course.total_students || 0),
          0
        ),
      },
    ];
  }, [courses]);

  const quickActions = [
    {
      title: "Cadastrar curso",
      description:
        "Adicione um novo curso à plataforma.",
      onClick: handleCreateClick,
    },
    {
      title: "Gerenciar acessos",
      description:
        "Edite status, bloqueios e dados cadastrais.",
      disabled: true,
      disabledReason: "Em breve — ainda não há uma página dedicada para isso.",
    },
    {
      title: "Acompanhar métricas dos cursos",
      description:
        "Veja o desempenho dos cursos.",
      disabled: true,
      disabledReason: "Em breve — ainda não há uma página dedicada para isso.",
    },
  ];

  const columns = [
    {
      key: "course",
      label: "Curso",
    },
    {
      key: "teacher_name",
      label: "Docente",
    },
    {
      key: "total_students",
      label: "Alunos matriculados",
    },
    {
      key: "workload_hours",
      label: "Carga horária",
    },
    {
      key: "pricing",
      label: "Preço",
    },
    {
      key: "status",
      label: "Status",
    },
    {
      key: "actions",
      label: "Ações",
    },
  ];

  return (
    <>
      <AdminManagementPage
        title="Gerenciamento de cursos"
        description="Acompanhe cursos cadastrados, turmas e outras métricas."
        createButtonText="+ Novo curso"
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle="Lista de cursos"
        tableActions={
          <AdminStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={courseStatusOptions}
          />
        }
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar curso, professor ou categoria..."
        quickActions={quickActions}
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">
            Carregando cursos...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-red-500">
            {error}
          </p>
        )}

        {!loading && !error && (
          <AdminTable
            columns={columns}
            data={filteredCourses}
            emptyMessage="Nenhum curso encontrado."
            renderRow={(course) => (
              <tr
                key={course.id}
                className="border-b border-gray-100"
              >
                <td className="py-5">
                  <p className="font-semibold text-gray-900">
                    {course.name}
                  </p>

                  {course.category && (
                    <p className="mt-1 text-sm text-gray-500">
                      {course.category}
                    </p>
                  )}
                </td>

                <td className="py-5 text-gray-600">
                  {course.teacher_name || "-"}
                </td>

                <td className="py-5 text-gray-600">
                  {Number(
                    course.total_students || 0
                  )}
                </td>

                <td className="py-5 text-gray-600">
                  {course.workload_hours
                    ? `${course.workload_hours}h`
                    : "-"}
                </td>

                <td className="py-5 text-sm">
                  <PricingCell pricing={course.pricing} />
                </td>

                <td className="py-5">
                  <StatusBadge
                    status={course.status}
                  />
                </td>

                <td className="py-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleEditClick(course)
                      }
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteClick(course)
                      }
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-200"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </AdminManagementPage>

      {modalOpen && (
        <AdminCreateEditModal
          variant="course"
          mode={modalMode}
          initialData={selectedCourse}
          handleCloseModal={handleCloseModal}
          onSuccess={handleCourseSuccess}
        />
      )}

      {deleteModalOpen && (
        <DeleteConfirmModal
          title="Remover curso"
          description="Tem certeza que deseja remover este curso?"
          itemName={selectedCourse?.name}
          loading={loadingDelete}
          onCancel={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}