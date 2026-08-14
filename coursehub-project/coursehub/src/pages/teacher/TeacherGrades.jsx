import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiFetch } from "../../services/APIService";
import {
  getClassActivityGrades,
  quickGradeSubmission,
} from "../../services/TeacherGradeService";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

export default function TeacherGrades() {
  const { usuarioLogado } = useAuth();

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [classId, setClassId] = useState("");
  const [activityId, setActivityId] = useState("");

  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [savingId, setSavingId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [scoreDrafts, setScoreDrafts] = useState({});

  useEffect(() => {
    if (!usuarioLogado?.id) return;

    let ignoreRequest = false;

    async function loadBaseData() {
      try {
        setLoadingClasses(true);
        setLoadingActivities(true);

        const [classesResponse, activitiesResponse] = await Promise.all([
          apiFetch(`/api/teacher/by-user/${usuarioLogado.id}/classes`),
          apiFetch(`/api/teacher/by-user/${usuarioLogado.id}/activities`),
        ]);

        if (ignoreRequest) return;

        const classList = Array.isArray(classesResponse)
          ? classesResponse
          : Array.isArray(classesResponse?.classes)
            ? classesResponse.classes
            : [];

        setClasses(classList);
        setActivities(Array.isArray(activitiesResponse) ? activitiesResponse : []);
      } catch (requestError) {
        if (!ignoreRequest) {
          console.error("Erro ao carregar turmas/atividades:", requestError);
          setClasses([]);
          setActivities([]);
        }
      } finally {
        if (!ignoreRequest) {
          setLoadingClasses(false);
          setLoadingActivities(false);
        }
      }
    }

    loadBaseData();

    return () => {
      ignoreRequest = true;
    };
  }, [usuarioLogado?.id]);

  const activitiesForClass = classId
    ? activities.filter(
        (activity) =>
          activity.class_id === null || Number(activity.class_id) === Number(classId)
      )
    : [];

  function handleClassChange(event) {
    setClassId(event.target.value);
    setActivityId("");
    setGradesData(null);
  }

  const fetchGrades = useCallback(async () => {
    if (!classId || !activityId) {
      setGradesData(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getClassActivityGrades({ classId, activityId });

      setGradesData(result);
      setScoreDrafts({});
      setRowErrors({});
    } catch (requestError) {
      console.error("[TeacherGrades] erro:", requestError);
      setError(requestError.message || "Não foi possível carregar as notas.");
      setGradesData(null);
    } finally {
      setLoading(false);
    }
  }, [classId, activityId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  async function handleSaveScore(student) {
    const draft = scoreDrafts[student.submissionId];
    const normalizedScore = Number(draft !== undefined ? draft : student.score);

    if (Number.isNaN(normalizedScore) || normalizedScore < 0) {
      setRowErrors((current) => ({ ...current, [student.submissionId]: "Nota inválida." }));
      return;
    }

    if (normalizedScore > Number(gradesData.activity.maxScore)) {
      setRowErrors((current) => ({
        ...current,
        [student.submissionId]: `Nota máx.: ${gradesData.activity.maxScore}`,
      }));
      return;
    }

    try {
      setSavingId(student.submissionId);
      setRowErrors((current) => ({ ...current, [student.submissionId]: "" }));

      await quickGradeSubmission(usuarioLogado.id, student.submissionId, {
        score: normalizedScore,
      });

      await fetchGrades();
    } catch (requestError) {
      console.error("Erro ao salvar nota:", requestError);
      setRowErrors((current) => ({
        ...current,
        [student.submissionId]: requestError.message || "Erro ao salvar nota.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  const students = gradesData?.students || [];
  const totalAlunos = students.length;
  const enviados = students.filter((student) => student.submissionId !== null).length;
  const corrigidos = students.filter((student) => student.status === "graded").length;
  const pendentes = enviados - corrigidos;

  const scoredStudents = students.filter(
    (student) => student.status === "graded" && student.score !== null
  );
  const media =
    scoredStudents.length > 0
      ? (
          scoredStudents.reduce((sum, student) => sum + Number(student.score), 0) /
          scoredStudents.length
        ).toFixed(1)
      : "-";

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notas dos Alunos</h1>
        <p className="mt-2 text-gray-600">
          Selecione uma turma e uma atividade para lançar ou ajustar notas.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap gap-3">
          <select
            value={classId}
            onChange={handleClassChange}
            disabled={loadingClasses}
            className={inputClass}
          >
            <option value="">
              {loadingClasses ? "Carregando turmas..." : "Selecione uma turma"}
            </option>

            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>

          <select
            value={activityId}
            onChange={(event) => setActivityId(event.target.value)}
            disabled={!classId || loadingActivities}
            className={inputClass}
          >
            <option value="">
              {loadingActivities ? "Carregando atividades..." : "Selecione uma atividade"}
            </option>

            {activitiesForClass.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {(!classId || !activityId) && (
        <p className="mt-8 py-12 text-center text-gray-500">
          Selecione turma e atividade acima para ver as notas.
        </p>
      )}

      {classId && activityId && loading && (
        <p className="mt-8 py-12 text-center text-gray-500">Carregando notas...</p>
      )}

      {classId && activityId && !loading && error && (
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={fetchGrades}
            className="text-sm font-semibold text-red-700 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {classId && activityId && !loading && !error && gradesData && (
        <>
          <section className="mt-8 grid gap-6 md:grid-cols-4">
            <StatCard title="Alunos" value={totalAlunos} />
            <StatCard title="Enviados" value={enviados} color="blue" />
            <StatCard title="Corrigidos" value={corrigidos} color="green" />
            <StatCard title="Pendentes" value={pendentes} color="yellow" />
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-1">
            <StatCard title="Média da turma" value={media} color="purple" />
          </section>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-6 text-xl font-bold text-gray-900">
              {gradesData.class.name} · {gradesData.activity.title}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-4 text-sm font-semibold text-gray-500">Aluno</th>
                    <th className="pb-4 text-sm font-semibold text-gray-500">Status</th>
                    <th className="pb-4 text-sm font-semibold text-gray-500">Nota</th>
                    <th className="pb-4 text-sm font-semibold text-gray-500">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student.studentId} className="border-b border-gray-100">
                      <td className="py-5">
                        <p className="font-semibold text-gray-900">{student.studentName}</p>
                        <p className="text-xs text-gray-500">{student.registrationNumber}</p>
                      </td>

                      <td className="py-5">
                        {student.submissionId === null ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                            Não enviado
                          </span>
                        ) : (
                          <StatusBadge status={student.status} />
                        )}
                      </td>

                      {student.submissionId === null ? (
                        <>
                          <td className="py-5 text-gray-400">-</td>
                          <td className="py-5 text-gray-400">-</td>
                        </>
                      ) : (
                        <>
                          <td className="py-5">
                            <input
                              type="number"
                              min="0"
                              max={gradesData.activity.maxScore}
                              step="0.1"
                              value={
                                scoreDrafts[student.submissionId] !== undefined
                                  ? scoreDrafts[student.submissionId]
                                  : (student.score ?? "")
                              }
                              onChange={(event) =>
                                setScoreDrafts((current) => ({
                                  ...current,
                                  [student.submissionId]: event.target.value,
                                }))
                              }
                              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 outline-none focus:border-blue-500"
                            />

                            {rowErrors[student.submissionId] && (
                              <p className="mt-1 text-xs text-red-600">
                                {rowErrors[student.submissionId]}
                              </p>
                            )}
                          </td>

                          <td className="py-5">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveScore(student)}
                                disabled={savingId === student.submissionId}
                                className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                              >
                                {savingId === student.submissionId ? "Salvando..." : "Salvar nota"}
                              </button>

                              <Link
                                to={`/professor/envios/${student.submissionId}/corrigir`}
                                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              >
                                Ver correção completa
                              </Link>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
