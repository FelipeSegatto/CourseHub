import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";

import TeacherManagementPage from "../../components/teachers/TeacherManagementPage";
import TeacherTable from "../../components/teachers/TeacherTable";
import TeacherStatusFilter from "../../components/teachers/TeacherStatusFilter";

import StatusBadge from "../../components/ui/StatusBadge";

const classStatusOptions = [
  {
    value: "",
    label: "Todas as turmas",
  },
  {
    value: "active",
    label: "Ativas",
  },
  {
    value: "inactive",
    label: "Inativas",
  },
  {
    value: "completed",
    label: "Concluídas",
  },
  {
    value: "archived",
    label: "Arquivadas",
  },
];

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const datePart = String(dateValue).split("T")[0];
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return "-";

  return `${day}/${month}/${year}`;
}

export default function MyClassesProfessor() {
  const { usuarioLogado } = useAuth();

  const [classes, setClasses] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadClasses() {
    if (!usuarioLogado?.id) return;

    try {
      setLoading(true);
      setError("");

      const data = await apiFetch(
        `/teacher/by-user/${usuarioLogado.id}/classes`
      );

      const classList = Array.isArray(data)
        ? data
        : Array.isArray(data?.classes)
          ? data.classes
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setClasses(classList);
    } catch (loadError) {
      console.error(
        "Erro ao carregar turmas do professor:",
        loadError
      );

      setClasses([]);

      setError(
        loadError.message ||
          "Não foi possível carregar as turmas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, [usuarioLogado?.id]);

  const filteredClasses = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return classes.filter((classItem) => {
      const className =
        classItem.name?.toLowerCase() || "";

      const courseName =
        classItem.course_title?.toLowerCase() ||
        classItem.course_name?.toLowerCase() ||
        "";

      const schedule =
        classItem.schedule?.toLowerCase() || "";

      const matchesSearch =
        !normalizedSearch ||
        className.includes(normalizedSearch) ||
        courseName.includes(normalizedSearch) ||
        schedule.includes(normalizedSearch);

      const matchesStatus =
        !statusFilter ||
        classItem.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [classes, search, statusFilter]);

  const stats = useMemo(() => {
    const activeClasses = classes.filter(
      (classItem) => classItem.status === "active"
    ).length;

    const totalStudents = classes.reduce(
      (total, classItem) =>
        total + Number(classItem.student_count || 0),
      0
    );

    const totalActivities = classes.reduce(
      (total, classItem) =>
        total + Number(classItem.activity_count || 0),
      0
    );

    const classesWithAttendance = classes.filter(
      (classItem) =>
        classItem.attendance_percentage !== null &&
        classItem.attendance_percentage !== undefined
    );

    const averageAttendance =
      classesWithAttendance.length > 0
        ? Math.round(
            classesWithAttendance.reduce(
              (total, classItem) =>
                total +
                Number(
                  classItem.attendance_percentage || 0
                ),
              0
            ) / classesWithAttendance.length
          )
        : 0;

    return [
      {
        title: "Turmas ativas",
        value: activeClasses,
      },
      {
        title: "Alunos matriculados",
        value: totalStudents,
      },
      {
        title: "Atividades",
        value: totalActivities,
      },
      {
        title: "Frequência média",
        value: `${averageAttendance}%`,
      },
    ];
  }, [classes]);

  const quickActions = [
    {
      title: "Registrar frequência",
      description:
        "Selecione uma turma e registre a presença dos alunos.",
      onClick: () => {},
    },
    {
      title: "Gerenciar atividades",
      description:
        "Crie e acompanhe atividades das suas turmas.",
      onClick: () => {},
    },
    {
      title: "Acompanhar alunos",
      description:
        "Consulte alunos e informações acadêmicas por turma.",
      onClick: () => {},
    },
  ];

  const classColumns = [
    {
      key: "class",
      label: "Turma",
    },
    {
      key: "course",
      label: "Curso",
    },
    {
      key: "period",
      label: "Período",
    },
    {
      key: "students",
      label: "Alunos",
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
    <TeacherManagementPage
      title="Minhas turmas"
      description="Acompanhe suas turmas, alunos, atividades e registros de frequência."
      stats={stats}
      tableTitle="Turmas atribuídas"
      tableActions={
        <TeacherStatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={classStatusOptions}
        />
      }
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar turma, curso ou horário..."
      quickActions={quickActions}
    >
      {loading && (
        <p className="py-8 text-center text-gray-500">
          Carregando turmas...
        </p>
      )}

      {!loading && error && (
        <div className="py-8 text-center">
          <p className="text-red-500">{error}</p>

          <button
            type="button"
            onClick={loadClasses}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <TeacherTable
          columns={classColumns}
          data={filteredClasses}
          emptyMessage="Nenhuma turma encontrada."
          renderRow={(classItem) => (
            <tr
              key={classItem.id}
              className="border-b border-gray-100"
            >
              <td className="py-5">
                <p className="font-semibold text-gray-900">
                  {classItem.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Turma #{classItem.id}
                </p>

                {classItem.schedule && (
                  <p className="mt-1 text-xs text-gray-500">
                    {classItem.schedule}
                  </p>
                )}
              </td>

              <td className="py-5 text-gray-600">
                {classItem.course_title ||
                  classItem.course_name ||
                  `Curso #${classItem.course_id}`}
              </td>

              <td className="py-5 text-gray-600">
                <p>{formatDate(classItem.start_date)}</p>

                <p className="mt-1 text-xs text-gray-400">
                  até {formatDate(classItem.end_date)}
                </p>
              </td>

              <td className="py-5">
                <p className="font-semibold text-gray-800">
                  {classItem.student_count ?? 0}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  matriculados
                </p>
              </td>

              <td className="py-5">
                <StatusBadge
                  status={classItem.status}
                />
              </td>

              <td className="py-5">
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/professor/turmas/${classItem.id}`}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    Abrir turma
                  </Link>

                  <Link
                    to={`/professor/turmas/${classItem.id}/frequencia`}
                    className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
                  >
                    Frequência
                  </Link>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </TeacherManagementPage>
  );
}