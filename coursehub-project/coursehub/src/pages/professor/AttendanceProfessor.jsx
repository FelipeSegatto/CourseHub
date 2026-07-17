import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";

import AttendanceSummaryCard from "../../components/teachers/AttendanceSummaryCard";
import AttendanceTable from "../../components/teachers/AttendanceTable";

const VALID_ATTENDANCE_STATUSES = new Set([
  "present",
  "absent",
  "late",
  "excused",
]);

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * Normaliza o status recebido.
 *
 * Quando ainda não existe registro de frequência, usamos
 * "present" como valor inicial visual. Isso permite que o
 * professor use "marcar todos presentes" como fluxo padrão.
 */
function normalizeAttendanceStatus(status) {
  return VALID_ATTENDANCE_STATUSES.has(status)
    ? status
    : "present";
}

/*
 * Compatibilidade temporária:
 * aceita respostas camelCase ou snake_case.
 */
function normalizeClassData(classData) {
  if (!classData) return null;

  return {
    id: classData.id,

    name:
      classData.name ||
      classData.className ||
      classData.class_name ||
      "Turma",

    shift: classData.shift || "online",

    status: classData.status || "active",

    courseId:
      classData.courseId ??
      classData.course_id ??
      null,

    courseTitle:
      classData.courseName ||
      classData.course_name ||
      "Curso não informado",

    startDate:
      classData.startDate ??
      classData.start_date ??
      null,

    endDate:
      classData.endDate ??
      classData.end_date ??
      null,
  };
}

function normalizeStudent(student) {
  const studentId = Number(
    student.studentId ??
      student.student_id ??
      student.id
  );

  return {
    ...student,

    studentId,

    name:
      student.name ||
      student.studentName ||
      student.student_name ||
      "Aluno sem nome",

    email: student.email || "",

    registrationNumber:
      student.registrationNumber ||
      student.registration_number ||
      "",

    attendanceId:
      student.attendanceId ??
      student.attendance_id ??
      null,

    status: normalizeAttendanceStatus(
      student.status
    ),

    notes: student.notes ?? "",

    isSaved: Boolean(
      student.isSaved ??
        student.is_saved ??
        student.attendanceId ??
        student.attendance_id
    ),
  };
}

function normalizeStudents(students) {
  if (!Array.isArray(students)) return [];

  return students
    .map(normalizeStudent)
    .filter(
      (student) =>
        Number.isInteger(student.studentId) &&
        student.studentId > 0
    );
}

/*
 * O snapshot contém apenas os campos editáveis.
 * Assim, mudanças em isSaved ou attendanceId não fazem
 * a página considerar que existem alterações pendentes.
 */
function createStudentsSnapshot(students) {
  return JSON.stringify(
    students.map((student) => ({
      studentId: student.studentId,
      status: student.status,
      notes: student.notes?.trim() || "",
    }))
  );
}

export default function AttendanceProfessor() {
  const { classId } = useParams();
  const { usuarioLogado } = useAuth();

  const normalizedClassId = Number(classId);

  const [classData, setClassData] =
    useState(null);

  const [students, setStudents] = useState([]);

  const [attendanceDate, setAttendanceDate] =
    useState(getTodayDate());

  const [initialSnapshot, setInitialSnapshot] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  /*
   * Impede que uma requisição antiga sobrescreva uma
   * requisição mais recente ao trocar rapidamente a data.
   */
  const requestIdRef = useRef(0);

  const currentSnapshot = useMemo(
    () => createStudentsSnapshot(students),
    [students]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!students.length || !initialSnapshot) {
      return false;
    }

    return currentSnapshot !== initialSnapshot;
  }, [
    currentSnapshot,
    initialSnapshot,
    students.length,
  ]);

  /*
   * Uma chamada ainda não registrada também precisa poder
   * ser salva, mesmo que o professor mantenha todos como
   * presentes.
   */
  const hasUnsavedRecords = useMemo(
    () =>
      students.some(
        (student) => !student.isSaved
      ),
    [students]
  );

  const canSave =
    students.length > 0 &&
    (hasUnsavedChanges || hasUnsavedRecords);

  const summary = useMemo(() => {
    return students.reduce(
      (accumulator, student) => {
        accumulator.total += 1;

        if (
          VALID_ATTENDANCE_STATUSES.has(
            student.status
          )
        ) {
          accumulator[student.status] += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      }
    );
  }, [students]);

  async function loadAttendance() {
    if (!usuarioLogado?.id) return;

    if (
      !Number.isInteger(normalizedClassId) ||
      normalizedClassId <= 0
    ) {
      return;
    }

    if (!attendanceDate) return;

    const currentRequestId =
      requestIdRef.current + 1;

    requestIdRef.current = currentRequestId;

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const encodedDate =
        encodeURIComponent(attendanceDate);

      const data = await apiFetch(
        `/teacher/by-user/${usuarioLogado.id}/classes/${normalizedClassId}/attendance?date=${encodedDate}`
      );

      /*
       * Ignora resposta de uma requisição ultrapassada.
       */
      if (
        currentRequestId !==
        requestIdRef.current
      ) {
        return;
      }

      const receivedStudents = normalizeStudents(
        data?.students
      );

      setClassData(
        normalizeClassData(data?.class)
      );

      setStudents(receivedStudents);

      setInitialSnapshot(
        createStudentsSnapshot(receivedStudents)
      );
    } catch (fetchError) {
      if (
        currentRequestId !==
        requestIdRef.current
      ) {
        return;
      }

      console.error(
        "Erro ao carregar frequência:",
        fetchError
      );

      setClassData(null);
      setStudents([]);
      setInitialSnapshot("");

      setError(
        fetchError.message ||
          "Não foi possível carregar a frequência da turma."
      );
    } finally {
      if (
        currentRequestId ===
        requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [
    usuarioLogado?.id,
    normalizedClassId,
    attendanceDate,
  ]);

  function handleAttendanceDateChange(event) {
    const nextDate = event.target.value;

    if (!nextDate) return;

    if (
      (hasUnsavedChanges ||
        hasUnsavedRecords) &&
      !window.confirm(
        "Existem registros não salvos. Deseja trocar a data e descartá-los?"
      )
    ) {
      return;
    }

    setAttendanceDate(nextDate);
  }

  function handleStatusChange(
    studentId,
    status
  ) {
    if (
      !VALID_ATTENDANCE_STATUSES.has(status)
    ) {
      return;
    }

    setSuccessMessage("");

    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status,
            }
          : student
      )
    );
  }

  function handleNotesChange(
    studentId,
    notes
  ) {
    setSuccessMessage("");

    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              notes,
            }
          : student
      )
    );
  }

  function handleMarkAllPresent() {
    setSuccessMessage("");

    setStudents((currentStudents) =>
      currentStudents.map((student) => ({
        ...student,
        status: "present",
      }))
    );
  }

  function handleResetChanges() {
    if (!initialSnapshot) return;

    const snapshotStudents = JSON.parse(
      initialSnapshot
    );

    const snapshotByStudentId = new Map(
      snapshotStudents.map((student) => [
        student.studentId,
        student,
      ])
    );

    setStudents((currentStudents) =>
      currentStudents.map((student) => {
        const originalStudent =
          snapshotByStudentId.get(
            student.studentId
          );

        if (!originalStudent) return student;

        return {
          ...student,
          status: originalStudent.status,
          notes: originalStudent.notes,
        };
      })
    );

    setSuccessMessage("");
  }

  async function handleSaveAttendance() {
    if (
      !usuarioLogado?.id ||
      !Number.isInteger(normalizedClassId) ||
      normalizedClassId <= 0
    ) {
      return;
    }

    if (!students.length) {
      setError(
        "Não existem alunos para registrar."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        attendanceDate,

        records: students.map((student) => ({
          studentId: student.studentId,
          status: student.status,
          notes: student.notes?.trim() || "",
        })),
      };

      const data = await apiFetch(
        `/teacher/by-user/${usuarioLogado.id}/classes/${normalizedClassId}/attendance`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      /*
       * Caso o backend devolva os registros atualizados,
       * usamos essa resposta como fonte de verdade.
       *
       * Caso devolva apenas message/summary, mantemos o
       * estado atual e marcamos os alunos como salvos.
       */
      const returnedStudents =
        normalizeStudents(
          data?.students || data?.records
        );

      const savedStudents =
        returnedStudents.length > 0
          ? returnedStudents
          : students.map((student) => ({
              ...student,
              isSaved: true,
            }));

      setStudents(savedStudents);

      setInitialSnapshot(
        createStudentsSnapshot(savedStudents)
      );

      setClassData((currentClassData) =>
        normalizeClassData(
          data?.class || currentClassData
        )
      );

      setSuccessMessage(
        data?.message ||
          "Frequência salva com sucesso."
      );
    } catch (saveError) {
      console.error(
        "Erro ao salvar frequência:",
        saveError
      );

      setError(
        saveError.message ||
          "Não foi possível salvar a frequência."
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    !Number.isInteger(normalizedClassId) ||
    normalizedClassId <= 0
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Turma inválida
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Não foi possível identificar a
              turma selecionada.
            </p>

            <Link
              to="/professor/turmas"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Voltar para minhas turmas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Link
              to="/professor/turmas"
              className="font-semibold text-slate-500 transition hover:text-blue-700"
            >
              Minhas turmas
            </Link>

            <span className="text-slate-300">
              /
            </span>

            {classData && (
              <>
                <Link
                  to={`/professor/turmas/${normalizedClassId}`}
                  className="font-semibold text-slate-500 transition hover:text-blue-700"
                >
                  {classData.name}
                </Link>

                <span className="text-slate-300">
                  /
                </span>
              </>
            )}

            <span className="font-semibold text-slate-800">
              Frequência
            </span>
          </div>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
                Gestão acadêmica
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {classData
                  ? `Frequência — ${classData.name}`
                  : "Frequência da turma"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Registre presenças, ausências,
                atrasos e justificativas dos
                alunos.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-auto lg:min-w-72">
              <label
                htmlFor="attendance-date"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Data da aula
              </label>

              <input
                id="attendance-date"
                type="date"
                value={attendanceDate}
                disabled={loading || saving}
                onChange={
                  handleAttendanceDateChange
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>

            <button
              type="button"
              disabled={loading}
              onClick={loadAttendance}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        {!loading && classData && (
          <AttendanceSummaryCard
            classData={classData}
            attendanceDate={attendanceDate}
            summary={summary}
          />
        )}

        <div className="mt-6">
          <AttendanceTable
            students={students}
            loading={loading}
            disabled={saving}
            onStatusChange={
              handleStatusChange
            }
            onNotesChange={
              handleNotesChange
            }
          />
        </div>

        {!loading &&
          !error &&
          students.length === 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="font-bold text-amber-800">
                Nenhum aluno matriculado
              </p>

              <p className="mt-1 text-sm text-amber-700">
                A turma ainda não possui alunos
                ativos para o registro de
                frequência.
              </p>
            </div>
          )}

        {!loading && students.length > 0 && (
          <footer className="sticky bottom-4 z-20 mt-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {canSave
                    ? "Existem registros não salvos"
                    : "Frequência atualizada"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {canSave
                    ? "Salve para registrar os dados desta aula no sistema."
                    : "Nenhuma mudança pendente no momento."}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    handleMarkAllPresent
                  }
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Marcar todos presentes
                </button>

                <button
                  type="button"
                  disabled={
                    !hasUnsavedChanges ||
                    saving
                  }
                  onClick={
                    handleResetChanges
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Descartar alterações
                </button>

                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={
                    handleSaveAttendance
                  }
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving
                    ? "Salvando..."
                    : "Salvar frequência"}
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </main>
  );
}