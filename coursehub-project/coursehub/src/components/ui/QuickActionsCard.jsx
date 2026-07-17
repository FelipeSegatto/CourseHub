function QuickActionsCard({
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50"
    >
      <h3 className="font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-gray-600">
        {description}
      </p>
    </button>
  );
}

export default QuickActionsCard;