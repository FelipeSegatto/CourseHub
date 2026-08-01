import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";

import StudentManagementPage from "./StudentManagementPage";
import StudentTable from "./StudentTable";
import StudentStatusFilter from "./StudentStatusFilter";
import StatusBadge from "../ui/StatusBadge";



const statusOptions = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "submitted", label: "Entregues" },
  { value: "graded", label: "Corrigidas" },
  { value: "returned", label: "Devolvidas" },
];



function formatDate(dateString) {
  if (!dateString) return "Sem prazo";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getActivityStatus(activity) {
  if (activity.submission_status === "graded") {
    return "graded";
  }

  if (
    activity.submission_status === "pending_review" ||
    activity.submission_status === "submitted"
  ) {
    return "submitted";
  }

  if (activity.submission_status === "returned") {
    return "returned";
  }

  if (
    activity.due_date &&
    new Date(activity.due_date) < new Date()
  ) {
    return "overdue";
  }

  return "pending";
}


export default function StudentActivitiesList({
  title,
  description,
  listTitle,
  searchPlaceholder,
  emptyMessage,
  actionPendingLabel,
  detailsPath,
  activityKind,
  infoCards = [],
}) {
  const { usuarioLogado } = useAuth();

  const [activities, setActivities] = useState([]);
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  async function loadActivities() {
    try {
      setLoading(true);
      setError("");

      const data = await apiFetch(
        "/api/students/by-user/activities"
      );

      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Erro ao carregar atividades:",
        error
      );

      /*
       * Nunca mantém atividades antigas na tela após uma
       * resposta inválida (ex.: 403/404).
       */
      setActivities([]);
      setError(
        error.data?.message ||
          error.message ||
          "Não foi possível carregar as atividades."
      );
    } finally {
      setLoading(false);
    }
  }

  loadActivities();
}, []);

  const activitiesByKind = useMemo(() => {
    return activities.filter(
      (activity) =>
        !activityKind ||
        activity.activity_kind === activityKind
    );
  }, [activities, activityKind]);

  const formattedActivities = useMemo(() => {
    return activitiesByKind.map((activity) => {
      const status = getActivityStatus(activity);

      /*
      * Aceita tanto grade quanto score.
      *
      * A rota atual devolve os dois campos, mas isso
      * mantém o componente tolerante a outras rotas.
      */
      const rawGrade =
        activity.grade ??
        activity.score;

      const grade =
        rawGrade !== null &&
        rawGrade !== undefined
          ? Number(rawGrade).toFixed(1)
          : "-";

      return {
        id: activity.id,
        title: activity.title,

        courseTitle:
          activity.course_title ||
          activity.course_name ||
          `Curso #${activity.course_id}`,

        dueDate: formatDate(
          activity.due_date
        ),

        status,
        grade,
        original: activity,
      };
    });
  }, [activitiesByKind]);

  const filteredActivities = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return formattedActivities.filter((activity) => {
      const matchesSearch =
        !term ||
        activity.title
          ?.toLowerCase()
          .includes(term) ||
        activity.courseTitle
          ?.toLowerCase()
          .includes(term);

      const matchesStatus =
        !statusFilter ||
        activity.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    formattedActivities,
    busca,
    statusFilter,
  ]);

  const stats = useMemo(() => {
  /*
   * Pendentes incluem:
   * - ainda não realizadas;
   * - atrasadas;
   * - devolvidas para ajustes.
   */
  const pending = formattedActivities.filter(
    (activity) =>
      activity.status === "pending" ||
      activity.status === "overdue" ||
      activity.status === "returned"
  ).length;

  /*
   * Entregas enviadas que ainda aguardam correção.
   */
  const submitted = formattedActivities.filter(
    (activity) =>
      activity.status === "submitted"
  ).length;

  /*
   * Entregas já corrigidas.
   */
  const graded = formattedActivities.filter(
    (activity) =>
      activity.status === "graded"
  ).length;

  /*
   * Calcula a média apenas com atividades
   * que possuem nota.
   */
  const grades = formattedActivities
    .filter(
      (activity) => activity.grade !== "-"
    )
    .map((activity) =>
      Number(activity.grade)
    )
    .filter(
      (grade) => !Number.isNaN(grade)
    );

  const average =
    grades.length > 0
      ? (
          grades.reduce(
            (total, grade) =>
              total + grade,
            0
          ) / grades.length
        ).toFixed(1)
      : "-";

  return [
    {
      title:
        activityKind === "exam"
          ? "Avaliações pendentes"
          : "Atividades pendentes",
      value: pending,
      color: "yellow",
    },
    {
      title: "Aguardando correção",
      value: submitted,
      color: "blue",
    },
    {
      title: "Corrigidas",
      value: graded,
      color: "green",
    },
    {
      title:
        activityKind === "exam"
          ? "Média nas avaliações"
          : "Média nas atividades",
      value: average,
      color: "purple",
    },
  ];
}, [
  formattedActivities,
  activityKind,
]);

  const quickActions = [
    {
      title:
        activityKind === "exam"
          ? "Avaliações pendentes"
          : "Atividades pendentes",
      description:
        activityKind === "exam"
          ? "Veja quais avaliações ainda precisam ser realizadas."
          : "Veja quais atividades ainda precisam ser concluídas.",
      onClick: () => setStatusFilter("pending"),
    },
    {
      title: "Entregas realizadas",
      description:
        "Consulte os envios que ainda aguardam correção.",
      onClick: () => setStatusFilter("submitted"),
    },
    {
      title: "Notas e feedbacks",
      description:
        "Veja atividades corrigidas, notas e comentários do professor.",
      onClick: () => setStatusFilter("graded"),
    },
  ];

  const columns = [
    { key: "title", label: "Título" },
    { key: "course", label: "Curso" },
    { key: "dueDate", label: "Prazo" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Ações" },
  ];

  return (
    <StudentManagementPage
      title={title}
      description={description}
      stats={stats}
      quickActions={quickActions}
      tableTitle={listTitle}
      tableActions={
        <StudentStatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
        />
      }
      searchValue={busca}
      onSearchChange={setBusca}
      searchPlaceholder={searchPlaceholder}
      infoCards={infoCards}
      backTo="/aluno/dashboard-aluno"
      backLabel="Voltar ao dashboard"
    >
      {loading && (
        <p className="py-8 text-center text-gray-500">
          Carregando...
        </p>
      )}

      {!loading && error && (
        <p className="py-8 text-center text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && (
        <StudentTable
          columns={columns}
          data={filteredActivities}
          emptyMessage={emptyMessage}
          renderRow={(activity) => {
            const isPending =
              activity.status === "pending" ||
              activity.status === "overdue" ||
              activity.status === "returned";

            return (
              <tr
                key={activity.id}
                className="border-b border-gray-100"
              >
                <td className="py-5">
                  <p className="font-semibold text-sm text-gray-900">
                    {activity.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    ID: #{activity.id}
                  </p>
                </td>

                <td className="py-5 text-sm text-gray-700">
                  {activity.courseTitle}
                </td>

                <td className="py-5 mr-6 text-sm text-gray-700">
                  {activity.dueDate}
                </td>

                <td className="py-5">
                  <StatusBadge status={activity.status} />
                </td>

                <td className="py-5">
                  <Link
                    to={`${detailsPath}/${activity.id}`}
                    className={`inline-block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isPending
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {isPending
                      ? actionPendingLabel
                      : "Ver detalhes"}
                  </Link>
                </td>
              </tr>
            );
          }}
        />
      )}
    </StudentManagementPage>
  );
}