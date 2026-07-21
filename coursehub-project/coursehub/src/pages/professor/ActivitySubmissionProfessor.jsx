import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";

import TeacherManagementPage from "../../components/teachers/TeacherManagementPage";
import TeacherTable from "../../components/teachers/TeacherTable";
import TeacherStatusFilter from "../../components/teachers/TeacherStatusFilter";

import StatusBadge from "../../components/ui/StatusBadge";

const submissionStatusOptions = [
  { value: "", label: "Todos os envios" },
  {
    value: "pending_review",
    label: "Aguardando correção",
  },
  { value: "graded", label: "Corrigidos" },
  { value: "returned", label: "Devolvidos" },
  { value: "draft", label: "Rascunhos" },
  { value: "submitted", label: "Enviados" },
];

function formatDate(dateString) {
  if (!dateString) return "Sem data";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatScore(score, maxScore) {
  if (
    score === null ||
    score === undefined ||
    score === ""
  ) {
    return "-";
  }

  const normalizedScore = Number(score);
  const normalizedMaxScore = Number(maxScore);

  if (Number.isNaN(normalizedScore)) {
    return "-";
  }

  const formattedScore =
    normalizedScore.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  if (Number.isNaN(normalizedMaxScore)) {
    return formattedScore;
  }

  return `${formattedScore} / ${normalizedMaxScore.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

export default function ActivitySubmissionProfessor() {
  const { activityId } = useParams();
  const { usuarioLogado } = useAuth();

  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("pending_review");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSubmissions() {
  console.log("ID do usuário professor:", usuarioLogado?.id);
  console.log("ID da atividade na URL:", activityId);

  if (!usuarioLogado?.id) {
    throw new Error(
      "O usuário do professor não foi identificado."
    );
  }

  if (!activityId) {
    throw new Error(
      "O ID da atividade não foi encontrado na rota."
    );
  }

  const requestUrl =
    `/api/teacher/by-user/` +
    `${usuarioLogado.id}/activities/` +
    `${activityId}/submissions`;

  console.log("URL da requisição:", requestUrl);

  let data;
  try {
    data = await apiFetch(requestUrl);
  } catch (loadSubmissionsError) {
    throw new Error(
      loadSubmissionsError.data?.message ||
        "Erro ao buscar entregas da atividade.",
      { cause: loadSubmissionsError }
    );
  }

  console.log("Resposta completa do backend:", data);
  console.log("Atividade recebida:", data.activity);
  console.log("Submissions recebidas:", data.submissions);

  setActivity(data.activity || null);

  setSubmissions(
    Array.isArray(data.submissions)
      ? data.submissions
      : []
  );
}

  useEffect(() => {
    if (!usuarioLogado?.id || !activityId) return;

    async function loadPageData() {
      try {
        setLoading(true);
        setError("");

        await loadSubmissions();
      } catch (error) {
        console.error(
          "Erro ao carregar entregas:",
          error
        );

        setError(
          error.message ||
            "Erro ao carregar entregas."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [usuarioLogado?.id, activityId]);

  const filteredSubmissions = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return submissions.filter((submission) => {
      const studentName =
        submission.student_name?.toLowerCase() || "";

      const studentEmail =
        submission.student_email?.toLowerCase() || "";

      const registrationNumber =
        submission.registration_number
          ?.toLowerCase() || "";

      const matchesSearch =
        !term ||
        studentName.includes(term) ||
        studentEmail.includes(term) ||
        registrationNumber.includes(term);

      const matchesStatus =
        !statusFilter ||
        submission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, busca, statusFilter]);

  const stats = useMemo(() => {
    const pendingReviews = submissions.filter(
      (submission) =>
        submission.status === "pending_review"
    ).length;

    const graded = submissions.filter(
      (submission) =>
        submission.status === "graded"
    ).length;

    const returned = submissions.filter(
      (submission) =>
        submission.status === "returned"
    ).length;

    return [
      {
        title: "Total de envios",
        value: submissions.length,
        color: "blue",
      },
      {
        title: "Aguardando correção",
        value: pendingReviews,
        color: "yellow",
      },
      {
        title: "Corrigidos",
        value: graded,
        color: "green",
      },
      {
        title: "Devolvidos",
        value: returned,
        color: "red",
      },
    ];
  }, [submissions]);

  const quickActions = [
    {
      title: "Corrigir pendentes",
      description:
        "Exiba apenas entregas aguardando avaliação.",
      onClick: () =>
        setStatusFilter("pending_review"),
    },
    {
      title: "Ver corrigidos",
      description:
        "Consulte entregas que já receberam nota e feedback.",
      onClick: () => setStatusFilter("graded"),
    },
    {
      title: "Ver todos os envios",
      description:
        "Remova o filtro atual e mostre todas as entregas.",
      onClick: () => setStatusFilter(""),
    },
  ];

  const columns = [
    { key: "student", label: "Aluno" },
    { key: "registration", label: "Matrícula" },
    { key: "submittedAt", label: "Enviado em" },
    { key: "status", label: "Status" },
    { key: "score", label: "Nota" },
    { key: "actions", label: "Ações" },
  ];

  const isExam =
    activity?.activity_kind === "exam";

  const backRoute = isExam
    ? "/professor/avaliacoes"
    : "/professor/atividades";

  const entityLabel = isExam
    ? "avaliação"
    : "atividade";

  return (
    <>
      <TeacherManagementPage
        title={
          activity
            ? `Entregas: ${activity.title}`
            : "Entregas da atividade"
        }
        description={
          activity
            ? `Acompanhe e corrija os envios da ${entityLabel} no curso ${activity.course_name}.`
            : "Acompanhe os envios dos alunos e realize as correções."
        }
        createButtonText=""
        onCreateClick={null}
        stats={stats}
        tableTitle="Lista de entregas"
        tableActions={
          <TeacherStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={submissionStatusOptions}
          />
        }
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar aluno, e-mail ou matrícula..."
        quickActions={quickActions}
      >
        <div className="mb-5">
          <Link
            to={backRoute}
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            ← Voltar para{" "}
            {isExam ? "avaliações" : "atividades"}
          </Link>
        </div>

        {loading && (
          <p className="py-8 text-center text-gray-500">
            Carregando entregas...
          </p>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="text-red-500">
              {error}
            </p>

            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError("");

                  await loadSubmissions();
                } catch (error) {
                  setError(error.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <TeacherTable
            columns={columns}
            data={filteredSubmissions}
            emptyMessage="Nenhuma entrega encontrada."
            renderRow={(submission) => {
              const canGrade =
                submission.status ===
                  "pending_review" ||
                submission.status === "submitted";

              const isGraded =
                submission.status === "graded";

              return (
                <tr
                  key={submission.id}
                  className="border-b border-gray-100"
                >
                  <td className="py-5">
                    <p className="font-semibold text-gray-900">
                      {submission.student_name ||
                        "Aluno sem nome"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {submission.student_email || "-"}
                    </p>
                  </td>

                  <td className="py-5 text-gray-600">
                    {submission.registration_number ||
                      "-"}
                  </td>

                  <td className="py-5 text-gray-600">
                    {formatDate(
                      submission.submitted_at
                    )}
                  </td>

                  <td className="py-5">
                    <StatusBadge
                      status={submission.status}
                    />
                  </td>

                  <td className="py-5 font-semibold text-gray-900">
                    {formatScore(
                      submission.score,
                      activity?.max_score
                    )}
                  </td>

                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/professor/envios/${submission.id}/corrigir`}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          canGrade
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {canGrade
                          ? "Corrigir"
                          : isGraded
                            ? "Ver correção"
                            : "Ver entrega"}
                      </Link>

                      {submission.status ===
                        "returned" && (
                        <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
                          Aguardando reenvio
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </TeacherManagementPage>
    </>
  );
}