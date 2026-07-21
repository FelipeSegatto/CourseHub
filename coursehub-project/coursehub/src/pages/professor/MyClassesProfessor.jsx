import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
    value: "finished",
    label: "Concluídas",
  },
];

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const datePart =
    String(dateValue).split("T")[0];

  const [year, month, day] =
    datePart.split("-");

  if (!year || !month || !day) {
    return "-";
  }

  return `${day}/${month}/${year}`;
}

function normalizeClassItem(classItem) {
  return {
    id: classItem.id,

    name:
      classItem.name ||
      `Turma #${classItem.id}`,

    courseId:
      classItem.courseId ??
      classItem.course_id ??
      null,

    teacherId:
      classItem.teacherId ??
      classItem.teacher_id ??
      null,

    courseName:
      classItem.courseName ??
      classItem.course_name ??
      "",

    courseDescription:
      classItem.courseDescription ??
      classItem.course_description ??
      "",

    courseImageUrl:
      classItem.courseImageUrl ??
      classItem.course_image_url ??
      null,

    courseCategory:
      classItem.courseCategory ??
      classItem.course_category ??
      "",

    courseLevel:
      classItem.courseLevel ??
      classItem.course_level ??
      "",

    shift:
      classItem.shift ?? "",

    startDate:
      classItem.startDate ??
      classItem.start_date ??
      null,

    endDate:
      classItem.endDate ??
      classItem.end_date ??
      null,

    status:
      classItem.status ?? "inactive",

    studentCount: Number(
      classItem.studentCount ??
        classItem.student_count ??
        0
    ),

    contentCount: Number(
      classItem.contentCount ??
        classItem.content_count ??
        0
    ),

    activityCount: Number(
      classItem.activityCount ??
        classItem.activity_count ??
        0
    ),

    attendancePercentage:
      classItem.attendancePercentage ??
      classItem.attendance_percentage ??
      null,

    createdAt:
      classItem.createdAt ??
      classItem.created_at ??
      null,

    updatedAt:
      classItem.updatedAt ??
      classItem.updated_at ??
      null,
  };
}

export default function MyClassesProfessor() {
  const { usuarioLogado } = useAuth();

  const [classes, setClasses] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadClasses() {
    if (!usuarioLogado?.id) {
      setClasses([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await apiFetch(
        `/api/teacher/by-user/${usuarioLogado.id}/classes`
      );

      const rawClasses =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.classes)
            ? data.classes
            : Array.isArray(data?.data)
              ? data.data
              : [];

      const normalizedClasses =
        rawClasses.map(
          normalizeClassItem
        );

      setClasses(normalizedClasses);
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

  const filteredClasses =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return classes.filter(
        (classItem) => {
          const className =
            classItem.name
              ?.toLowerCase() || "";

          const courseName =
            classItem.courseName
              ?.toLowerCase() || "";

          const shift =
            classItem.shift
              ?.toLowerCase() || "";

          const matchesSearch =
            !normalizedSearch ||
            className.includes(
              normalizedSearch
            ) ||
            courseName.includes(
              normalizedSearch
            ) ||
            shift.includes(
              normalizedSearch
            );

          const matchesStatus =
            !statusFilter ||
            classItem.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      classes,
      search,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const activeClasses =
      classes.filter(
        (classItem) =>
          classItem.status ===
          "active"
      ).length;

    const totalStudents =
      classes.reduce(
        (total, classItem) =>
          total +
          Number(
            classItem.studentCount ||
              0
          ),
        0
      );

    const totalActivities =
      classes.reduce(
        (total, classItem) =>
          total +
          Number(
            classItem.activityCount ||
              0
          ),
        0
      );

    const classesWithAttendance =
      classes.filter(
        (classItem) =>
          classItem
            .attendancePercentage !==
            null &&
          classItem
            .attendancePercentage !==
            undefined
      );

    const averageAttendance =
      classesWithAttendance.length >
      0
        ? Math.round(
            classesWithAttendance.reduce(
              (
                total,
                classItem
              ) =>
                total +
                Number(
                  classItem
                    .attendancePercentage ||
                    0
                ),
              0
            ) /
              classesWithAttendance.length
          )
        : 0;

    return [
      {
        title: "Turmas ativas",
        value: activeClasses,
      },
      {
        title:
          "Alunos matriculados",
        value: totalStudents,
      },
      {
        title: "Atividades",
        value: totalActivities,
      },
      {
        title:
          "Frequência média",
        value:
          classesWithAttendance.length >
          0
            ? `${averageAttendance}%`
            : "-",
      },
    ];
  }, [classes]);

  const quickActions = [
    {
      title:
        "Registrar frequência",

      description:
        "Selecione uma turma e registre a presença dos alunos.",

      onClick: () => {},
    },
    {
      title:
        "Gerenciar atividades",

      description:
        "Crie e acompanhe atividades das suas turmas.",

      onClick: () => {},
    },
    {
      title:
        "Acompanhar alunos",

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
          onChange={
            setStatusFilter
          }
          options={
            classStatusOptions
          }
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
          <p className="text-red-500">
            {error}
          </p>

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
          renderRow={(
            classItem
          ) => (
            <tr
              key={classItem.id}
              className="border-b border-gray-100"
            >
              <td className="py-5">
                <p className="font-semibold text-gray-900">
                  {classItem.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Turma #
                  {classItem.id}
                </p>

                {classItem.shift && (
                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {classItem.shift}
                  </p>
                )}
              </td>

              <td className="py-5">
                <p className="font-medium text-gray-700">
                  {classItem.courseName ||
                    (classItem.courseId
                      ? `Curso #${classItem.courseId}`
                      : "Curso não informado")}
                </p>

                {classItem.courseLevel && (
                  <p className="mt-1 text-xs text-gray-400">
                    Nível:{" "}
                    {
                      classItem.courseLevel
                    }
                  </p>
                )}
              </td>

              <td className="py-5 text-gray-600">
                <p>
                  {formatDate(
                    classItem.startDate
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  até{" "}
                  {formatDate(
                    classItem.endDate
                  )}
                </p>
              </td>

              <td className="py-5">
                <p className="font-semibold text-gray-800">
                  {
                    classItem.studentCount
                  }
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  matriculados
                </p>
              </td>

              <td className="py-5">
                <StatusBadge
                  status={
                    classItem.status
                  }
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