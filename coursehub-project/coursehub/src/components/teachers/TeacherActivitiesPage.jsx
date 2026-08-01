import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";

import TeacherManagementPage from "./TeacherManagementPage";
import ActivityModal from "./ActivityModal";
import DeleteModal from "./DeleteModal";
import TeacherTable from "./TeacherTable";
import TeacherStatusFilter from "./TeacherStatusFilter";

import StatusBadge from "../ui/StatusBadge";

const statusOptions = [
  { value: "", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "draft", label: "Rascunhos" },
  { value: "archived", label: "Arquivados" },
];

const typeLabels = {
  mixed: "Mista",
  quiz: "Questionário",
  text: "Discursiva",
  upload: "Envio de arquivo",
};

function formatDate(date) {
  if (!date) return "Sem prazo";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatScore(score) {
  const numericScore = Number(score);

  if (Number.isNaN(numericScore)) {
    return "10,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericScore);
}

export default function TeacherActivitiesPage({
  activityKind,
  pageTitle,
  pageDescription,
  createButtonText,
  tableTitle,
  emptyMessage,
  createActionTitle,
  createActionDescription,
}) {
  const { usuarioLogado } = useAuth();

  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allActivities, setAllActivities] = useState([]);

  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityToDelete, setSelectedActivityToDelete] =
    useState(null);

  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  async function loadActivities() {
    if (!usuarioLogado?.id) return;

    const endpoint =
      `/api/teacher/by-user/${usuarioLogado.id}/activities`;

    console.log(
      "Buscando atividades do professor:",
      endpoint
    );

    const data = await apiFetch(endpoint);

    console.log(
      "Atividades recebidas:",
      data
    );

    setAllActivities(
      Array.isArray(data) ? data : []
    );
  }

  async function loadCourses() {
    if (!usuarioLogado?.id) return;

    const endpoint =
      `/api/teacher/by-user/${usuarioLogado.id}/courses`;

    console.log(
      "Buscando cursos do professor:",
      endpoint
    );

    const data = await apiFetch(endpoint);

    console.log(
      "Cursos recebidos:",
      data
    );

    setCourses(
      Array.isArray(data) ? data : []
    );
  }

  /*
   * Busca as turmas do professor. A busca de turmas falhando
   * não bloqueia a listagem de atividades — o professor ainda
   * pode ver e criar atividades gerais normalmente.
   */
  async function loadClasses() {
    if (!usuarioLogado?.id) return;

    const endpoint =
      `/api/teacher/by-user/${usuarioLogado.id}/classes`;

    try {
      const data = await apiFetch(endpoint);

      const classList = Array.isArray(data)
        ? data
        : Array.isArray(data?.classes)
          ? data.classes
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setClasses(classList);
    } catch (classesError) {
      console.error(
        "Erro ao buscar turmas do professor:",
        classesError
      );

      setClasses([]);
    }
  }

  useEffect(() => {
    if (!usuarioLogado?.id) return;

    async function loadPageData() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          loadActivities(),
          loadCourses(),
          loadClasses(),
        ]);
      } catch (error) {
        console.error("Erro ao carregar página:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [usuarioLogado?.id]);

  const activitiesByKind = useMemo(() => {
    return allActivities.filter(
      (activity) => activity.activity_kind === activityKind
    );
  }, [allActivities, activityKind]);

  /*
   * Resolve o nome de exibição da turma de uma atividade.
   * Nunca mostra o ID cru — se class_name/className não vier da
   * API, tenta resolver pelo array de turmas carregado; se ainda
   * assim não achar, cai para um rótulo genérico.
   */
  const resolveActivityClassName = useCallback(
    (activity) => {
      const classId = activity.classId ?? activity.class_id ?? null;

      if (!classId) return null;

      const nameFromActivity =
        activity.className || activity.class_name;

      if (nameFromActivity) return nameFromActivity;

      const matchedClass = classes.find(
        (classItem) => Number(classItem.id) === Number(classId)
      );

      return matchedClass?.name || "Turma específica";
    },
    [classes]
  );

  const filteredActivities = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return activitiesByKind.filter((activity) => {
      const title = activity.title?.toLowerCase() || "";
      const description = activity.description?.toLowerCase() || "";
      const courseName =
        activity.course_name?.toLowerCase() ||
        activity.course_title?.toLowerCase() ||
        "";
      const type = activity.type?.toLowerCase() || "";
      const status = activity.status?.toLowerCase() || "";

      const className = (
        resolveActivityClassName(activity) || "todas as turmas"
      ).toLowerCase();

      const matchesSearch =
        !term ||
        title.includes(term) ||
        description.includes(term) ||
        courseName.includes(term) ||
        type.includes(term) ||
        status.includes(term) ||
        className.includes(term);

      const matchesStatus =
        !statusFilter || activity.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    activitiesByKind,
    busca,
    statusFilter,
    resolveActivityClassName,
  ]);

  const stats = useMemo(() => {
    return [
      {
        title:
          activityKind === "exam"
            ? "Total de avaliações"
            : "Total de atividades",
        value: activitiesByKind.length,
      },
      {
        title: "Ativos",
        value: activitiesByKind.filter(
          (activity) => activity.status === "active"
        ).length,
      },
      {
        title: "Rascunhos/Inativos",
        value: activitiesByKind.filter(
          (activity) =>
            activity.status === "draft" ||
            activity.status === "inactive"
        ).length,
      },
      {
        title: "Obrigatórios",
        value: activitiesByKind.filter(
          (activity) =>
            activity.is_required === 1 ||
            activity.is_required === true
        ).length,
      },
    ];
  }, [activitiesByKind, activityKind]);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedActivity(null);
    setModalOpen(true);
  }

  function handleEditClick(activity) {
    setModalMode("edit");
    setSelectedActivity(activity);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedActivity(null);
    setModalMode("create");
  }

  async function handleActivitySuccess() {
    await loadActivities();
    handleCloseModal();
  }

  function handleDeleteClick(activity) {
    setSelectedActivityToDelete(activity);
    setDeleteModalOpen(true);
  }

  function handleCloseDeleteModal() {
    if (loadingDelete) return;

    setSelectedActivityToDelete(null);
    setDeleteModalOpen(false);
  }

  async function handleDeleteActivity(activity) {
    if (!activity?.id || loadingDelete) return;

    try {
      setLoadingDelete(true);
      setError("");

      try {
        await apiFetch(
          `/api/activities/${activity.id}`,
          {
            method: "DELETE",
            body: JSON.stringify({
              userId: usuarioLogado.id,
            }),
          }
        );
      } catch (deleteActivityError) {
        throw new Error(
          deleteActivityError.data?.message ||
            `Erro ao remover ${
              activityKind === "exam" ? "avaliação" : "atividade"
            }.`,
          { cause: deleteActivityError }
        );
      }

      setAllActivities((previousActivities) =>
        previousActivities.map((currentActivity) =>
          currentActivity.id === activity.id
            ? {
                ...currentActivity,
                status: "archived",
              }
            : currentActivity
        )
      );

      handleCloseDeleteModal();
    } catch (error) {
      console.error("Erro ao arquivar atividade:", error);
      setError(error.message);
    } finally {
      setLoadingDelete(false);
    }
  }

  const quickActions = [
    {
      title: createActionTitle,
      description: createActionDescription,
      onClick: handleCreateClick,
    },
    {
      title: "Revisar entregas",
      description:
        activityKind === "exam"
          ? "Acompanhe avaliações enviadas e pendentes de correção."
          : "Acompanhe atividades enviadas e pendentes de correção.",
      onClick: () => {},
    },
    {
      title: "Acompanhar desempenho",
      description:
        activityKind === "exam"
          ? "Veja notas e desempenho dos alunos nas avaliações."
          : "Veja notas e progresso dos alunos nas atividades.",
      onClick: () => {},
    },
  ];

  const columns = [
    {
      key: "title",
      label: activityKind === "exam" ? "Avaliação" : "Atividade",
    },
    { key: "course", label: "Curso" },
    { key: "class", label: "Turma" },
    { key: "type", label: "Tipo" },
    { key: "due_date", label: "Prazo" },
    { key: "max_score", label: "Nota máxima" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Ações" },
  ];

  return (
    <>
      <TeacherManagementPage
        title={pageTitle}
        description={pageDescription}
        createButtonText={createButtonText}
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle={tableTitle}
        tableActions={
          <TeacherStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
          />
        }
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder={
          activityKind === "exam"
            ? "Buscar avaliação, curso ou tipo..."
            : "Buscar atividade, curso ou tipo..."
        }
        quickActions={quickActions}
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">
            Carregando...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-red-500">
            {error}
          </p>
        )}

        {!loading && !error && (
          <TeacherTable
            columns={columns}
            data={filteredActivities}
            emptyMessage={emptyMessage}
            renderRow={(activity) => (
              <tr
                key={activity.id}
                className="border-b border-gray-100"
              >
                <td className="py-5">
                  <p className="font-semibold text-gray-900">
                    {activity.title}
                  </p>

                  {activity.description && (
                    <p className="mt-1 max-w-md truncate text-sm text-gray-500">
                      {activity.description}
                    </p>
                  )}
                </td>

                <td className="py-5 text-gray-600">
                  {activity.course_name ||
                    activity.course_title ||
                    `Curso #${activity.course_id}`}
                </td>

                <td className="py-5 text-gray-600">
                  {resolveActivityClassName(activity) ||
                    "Todas as turmas"}
                </td>

                <td className="py-5 text-gray-600">
                  {typeLabels[activity.type] || activity.type || "-"}
                </td>

                <td className="py-5 text-gray-600">
                  {formatDate(activity.due_date)}
                </td>

                <td className="py-5 text-gray-600">
                  {formatScore(activity.max_score)}
                </td>

                <td className="py-5">
                  <StatusBadge status={activity.status} />
                </td>

                <td className="py-5">
                  <div className="flex flex-wrap gap-2">
                   <Link
                        to={
                            activity.activity_kind === "exam"
                            ? `/professor/avaliacoes/${activity.id}/envios`
                            : `/professor/atividades/${activity.id}/envios`
                        }
                        className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-200"
                        >
                        Ver envios
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleEditClick(activity)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(activity)}
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
      </TeacherManagementPage>

      {modalOpen && (
        <ActivityModal
            mode={modalMode}
            activity={selectedActivity}
            courses={courses}
            classes={classes}
            activityKind={activityKind}
            userId={usuarioLogado.id}
            handleCloseModal={handleCloseModal}
            onSuccess={handleActivitySuccess}
        />
        )}

      {deleteModalOpen && (
        <DeleteModal
          item={selectedActivityToDelete}
          variant={activityKind}
          loading={loadingDelete}
          handleCloseModal={handleCloseDeleteModal}
          onConfirm={handleDeleteActivity}
        />
      )}
    </>
  );
}