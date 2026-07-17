function StatCard({ title, value, color = "blue" }) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600",
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className={`mt-2 text-3xl font-bold ${colors[color]}`}>
        {value}
      </p>
    </div>
  );
}

export default StatCard;