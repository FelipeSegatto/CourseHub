function formatTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatMessageBubble({ message, isOwn }) {
  if (message.messageType === "system") {
    return (
      <div className="my-2 text-center text-xs text-gray-500">
        {message.body}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        } ${message.pending ? "opacity-60" : ""} ${message.failed ? "border border-red-400" : ""}`}
      >
        {!isOwn && <p className="mb-0.5 text-xs font-semibold text-gray-500">{message.senderName}</p>}

        {message.isDeleted ? (
          <p className={`text-sm italic ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
            Mensagem removida.
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        )}

        <p className={`mt-1 text-right text-[10px] ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
          {message.failed ? "Falha ao enviar" : message.pending ? "Enviando..." : formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
