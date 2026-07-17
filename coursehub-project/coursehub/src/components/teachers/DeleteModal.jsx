function DeleteContentModal({
  item,
  variant = "content",
  handleCloseModal,
  onConfirm,
}) {
  const isActivityVariant = variant === "activity";

  const title = isActivityVariant
    ? "Excluir atividade"
    : "Excluir conteúdo";

  const description = isActivityVariant
    ? "Tem certeza que deseja excluir esta atividade? Essa ação não pode ser desfeita."
    : "Tem certeza que deseja excluir este conteúdo? Essa ação não pode ser desfeita.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={handleCloseModal}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
        >
          ✕
        </button>

        <div className="border-b border-gray-200 px-6 py-5 pr-14">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>

          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {item?.title || "Item selecionado"}
            </p>

            <p className="mt-1 text-xs text-red-500">
              ID: #{item?.id}
            </p>
          </div>
        </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={() => onConfirm(item)}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 hover:shadow-lg"
                >
                    Excluir
                </button>
            </div>
      </div>
    </div>
  );
}

export default DeleteContentModal;