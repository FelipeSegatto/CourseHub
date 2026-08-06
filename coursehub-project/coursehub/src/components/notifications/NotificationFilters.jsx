const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" },
  { value: "read", label: "Lidas" },
];

export default function NotificationFilters({ status, onStatusChange, unreadCount, onMarkAllRead }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onStatusChange(filter.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              status === filter.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onMarkAllRead}
        disabled={unreadCount === 0}
        className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Marcar todas como lidas
      </button>
    </div>
  );
}
