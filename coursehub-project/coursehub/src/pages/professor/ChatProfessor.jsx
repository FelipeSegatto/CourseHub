import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { archiveConversation, resolveConversation } from "../../services/ChatService";
import { useChatInbox } from "../../hooks/useChatInbox";
import { useChatThread } from "../../hooks/useChatThread";
import InstitutionalChatNotice from "../../components/chat/InstitutionalChatNotice";
import ChatThreadPanel from "../../components/chat/ChatThreadPanel";

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "waiting_staff", label: "Aguardando resposta" },
  { value: "waiting_student", label: "Aguardando aluno" },
  { value: "resolved", label: "Resolvidas" },
];

function formatConversationTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ChatProfessor() {
  const { usuarioLogado } = useAuth();
  const currentUserId = usuarioLogado?.id;

  const [statusFilter, setStatusFilter] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const { conversations, setConversations, loading, error, refresh } = useChatInbox({
    type: "teacher_support",
    status: statusFilter || undefined,
  });

  const selectedConversation = conversations.find((c) => c.conversationId === selectedConversationId) || null;

  const { messages, loading: messagesLoading, error: messagesError, olderCursor, handleSend, handleLoadOlderMessages } =
    useChatThread({
      conversationId: selectedConversationId,
      currentUserId,
      currentUserName: usuarioLogado?.name,
      onMessageSent: refresh,
    });

  async function handleArchive() {
    if (!selectedConversationId) return;

    try {
      await archiveConversation(selectedConversationId);

      setConversations((current) => current.filter((item) => item.conversationId !== selectedConversationId));
      setSelectedConversationId(null);
    } catch {
      // Leave the item in place -- nothing to roll back visually beyond that.
    }
  }

  async function handleResolve() {
    if (!selectedConversationId) return;

    try {
      await resolveConversation(selectedConversationId);
      refresh();
    } catch {
      // Silent -- the button stays visible and the user can try again.
    }
  }

  const canPost = selectedConversation ? selectedConversation.canPost !== false : true;

  return (
    <main className="p-6">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dúvidas dos alunos</h1>
        <p className="mt-2 text-gray-600">Alunos matriculados nos seus cursos podem abrir dúvidas diretamente aqui.</p>
        <InstitutionalChatNotice className="mt-2" />
      </section>

      <section className="grid gap-6 rounded-2xl bg-white shadow md:grid-cols-[320px_1fr]" style={{ minHeight: 520 }}>
        <div className="flex flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading && <p className="px-4 py-6 text-center text-sm text-gray-500">Carregando...</p>}

          {!loading && error && <p className="px-4 py-3 text-center text-sm text-red-700">{error}</p>}

          {!loading && !error && conversations.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma dúvida por aqui.</p>
          )}

          <ul className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => {
              const isUnread =
                conversation.lastMessageId &&
                (conversation.lastReadMessageId ?? 0) < conversation.lastMessageId;

              return (
                <li key={conversation.conversationId}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.conversationId)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition hover:bg-gray-50 ${
                      selectedConversationId === conversation.conversationId ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block truncate ${isUnread ? "font-bold text-gray-900" : "text-gray-700"}`}>
                        {conversation.title || "Dúvida"}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {conversation.otherParticipant?.name}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formatConversationTime(conversation.lastMessageAt || conversation.createdAt)}
                      </span>
                    </span>

                    {isUnread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col">
          <ChatThreadPanel
            title={selectedConversation ? selectedConversation.title || "Dúvida" : ""}
            conversation={selectedConversation}
            messages={messages}
            loading={messagesLoading}
            error={messagesError}
            olderCursor={olderCursor}
            onLoadOlder={handleLoadOlderMessages}
            onSend={handleSend}
            canPost={canPost}
            currentUserId={currentUserId}
            onArchive={selectedConversation ? handleArchive : undefined}
            onResolve={selectedConversation ? handleResolve : undefined}
            emptyStateText="Selecione uma dúvida na lista."
          />
        </div>
      </section>
    </main>
  );
}
