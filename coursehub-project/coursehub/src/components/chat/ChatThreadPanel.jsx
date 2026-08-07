import ChatMessageBubble from "./ChatMessageBubble";
import ChatMessageComposer from "./ChatMessageComposer";

const STATUS_LABEL = {
  open: "Aberta",
  waiting_staff: "Aguardando professor",
  waiting_student: "Aguardando aluno",
  waiting_teacher: "Aguardando professor",
  waiting_admin: "Aguardando administração",
  resolved: "Resolvida",
  closed: "Encerrada",
};

const TOPIC_LABEL = {
  content: "Conteúdo",
  activity: "Atividade",
  exam: "Avaliação",
  grade: "Nota",
  attendance: "Frequência",
  session: "Encontro",
  general: "Geral",
};

export default function ChatThreadPanel({
  title,
  conversation,
  messages,
  loading,
  error,
  olderCursor,
  onLoadOlder,
  onSend,
  canPost,
  currentUserId,
  onArchive,
  onResolve,
  emptyStateText = "Selecione uma conversa ou comece uma nova.",
}) {
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
        {emptyStateText}
      </div>
    );
  }

  const isResolved = conversation.status === "resolved" || conversation.status === "closed";

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {conversation.category && TOPIC_LABEL[conversation.category] && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {TOPIC_LABEL[conversation.category]}
              </span>
            )}
            {conversation.status && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isResolved ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {STATUS_LABEL[conversation.status] || conversation.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onResolve && !isResolved && (
            <button
              type="button"
              onClick={onResolve}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-200"
            >
              Marcar como resolvida
            </button>
          )}

          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Arquivar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {olderCursor && (
          <div className="text-center">
            <button type="button" onClick={onLoadOlder} className="text-xs font-semibold text-blue-600 hover:underline">
              Carregar mensagens anteriores
            </button>
          </div>
        )}

        {loading && <p className="text-center text-sm text-gray-500">Carregando mensagens...</p>}

        {!loading && error && <p className="text-center text-sm text-red-700">{error}</p>}

        {!loading &&
          messages.map((message) => (
            <ChatMessageBubble
              key={message.messageId}
              message={message}
              isOwn={message.senderUserId === currentUserId}
            />
          ))}
      </div>

      <div className="border-t border-gray-200 p-4">
        <ChatMessageComposer
          onSend={onSend}
          disabled={!canPost || isResolved}
          disabledReason={
            isResolved ? "Esta conversa já foi resolvida." : "Você não pode mais enviar mensagens nesta conversa."
          }
        />
      </div>
    </>
  );
}
