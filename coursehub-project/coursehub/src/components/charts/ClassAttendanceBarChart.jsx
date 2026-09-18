import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function attendanceBarColor(percentage) {
  if (percentage >= 80) return "#16a34a";
  if (percentage >= 60) return "#d97706";
  return "#dc2626";
}

function chartLabel(classItem) {
  return classItem.className || classItem.courseName || "Turma";
}

export default function ClassAttendanceBarChart({ classes = [] }) {
  const data = classes
    .filter((classItem) => classItem.averageAttendancePercentage != null)
    .map((classItem) => ({
      name: chartLabel(classItem),
      value: Number(classItem.averageAttendancePercentage),
    }));

  const height = Math.max(220, data.length * 44 + 48);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Frequência por turma</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Média real de presença. Só aparece turma com chamada já lançada.
        </p>
      </div>

      {data.length === 0 ? (
        <p className="mt-8 py-8 text-center text-sm text-gray-500">
          Ainda não há frequência lançada para comparar as turmas.
        </p>
      ) : (
        <div
          className="mt-4"
          style={{ height }}
          role="img"
          aria-label={`Frequência média por turma. ${data
            .map((item) => `${item.name}: ${item.value}%`)
            .join(", ")}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 28, bottom: 8, left: 8 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                formatter={(value) => [`${value}%`, "Frequência"]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14} background={{ fill: "#e2e8f0" }}>
                {data.map((item) => (
                  <Cell key={item.name} fill={attendanceBarColor(item.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-600" /> 80%+
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-600" /> 60–79%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600" /> abaixo de 60%
        </span>
      </div>
    </article>
  );
}
