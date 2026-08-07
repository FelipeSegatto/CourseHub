import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  archiveConversation,
} from "../../services/ChatService";
import InstitutionalChatNotice from "../../components/chat/InstitutionalChatNotice";
import ChatMessageBubble from "../../components/chat/ChatMessageBubble";
import ChatMessageComposer from "../../components/chat/ChatMessageComposer";
import NewAcademicChatModal from "../../components/chat/NewAcademicChatModal";

const INBOX_POLL_MS = 30000;
const CONVERSATION_POLL_MS = 5000;

const CONVERSATION_TYPE_LABEL = {
  academic_peer: "Colega",
  teacher_support: "Professor",
  administrative_support: "Administração",
  staff_support: "Equipe",
};

function formatConversationTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function conversationTitle(conversation) {
  if (conversation.title) return conversation.title;

  if (conversation.otherParticipant?.name) {
    return conversation.otherParticipant.name;
  }

  return CONVERSATION_TYPE_LABEL[conversation.type] || "Conversa";
}

/**
 * Uses a visible interval poll for the inbox (30s) and, only while a
 * conversation is open, a faster one for its messages (5s) -- both
 * paused while the tab is hidden, refreshed immediately on
 * visibility return, same idiom as useUnreadNotifications/
 * useChatUnreadCount.
 */
export default function ChatAluno() {
  const { usuarioLogado } = useAuth();
  const currentUserId = usuarioLogado?.id;

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState("");

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [olderCursor, setOlderCursor] = useState(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [conversationsReloadToken, setConversationsReloadToken] = useState(0);

  const selectedConversationIdRef = useRef(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const refreshConversations = useCallback(() => {
    setConversationsReloadToken((token) => token + 1);
  }, []);

  // Inbox: fetched on mount, on every conversationsReloadToken bump
  // (manual refresh after sending/starting a conversation), and
  // every 30s while the tab is visible. fetchConversations is
  // declared inside the effect on purpose -- calling an external
  // useCallback from an effect body trips react-hooks/set-state-in-effect
  // (same fix already applied in useNotificationInbox.js).
  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    async function fetchConversations() {
      try {
        const result = await listConversations({ limit: 30 });

        if (cancelled) return;

        setConversations(result?.items || []);
        setConversationsError("");
      } catch (requestError) {
        if (cancelled) return;

        setConversationsError(requestError.message || "Não foi possível carregar as conversas.");
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    }

    function start() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!cancelled) fetchConversations();
      }, INBOX_POLL_MS);
    }

    function stop() {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        fetchConversations();
        start();
      }
    }

    fetchConversations();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationsReloadToken]);

  // Selecting a conversation: load its messages fresh, mark it read.
  // No conversationId means nothing to fetch -- the message pane
  // itself isn't rendered in that case (see JSX below), so stale
  // `messages` sitting unseen in state needs no explicit clearing;
  // it's fully overwritten the next time a conversation is selected.
  useEffect(() => {
    if (!selectedConversationId) {
      return undefined;
    }

    let cancelled = false;

    async function fetchMessages() {
      setMessagesLoading(true);

      try {
        const result = await listMessages(selectedConversationId, { limit: 30 });

        if (cancelled) return;

        // Server returns most-recent-first; the thread reads top-to-
        // bottom oldest-first, so reverse for display.
        setMessages([...(result?.items || [])].reverse());
        setOlderCursor(result?.nextCursor || null);
        setMessagesError("");
      } catch (requestError) {
        if (cancelled) return;

        setMessagesError(requestError.message || "Não foi possível carregar as mensagens.");
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    }

    fetchMessages();
    markConversationRead(selectedConversationId).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  // Active-conversation poll (5s), only while one is open, paused
  // while hidden. Silent (no loading spinner, no error banner) and
  // preserves any not-yet-confirmed optimistic messages.
  useEffect(() => {
    if (!selectedConversationId) return undefined;

    let intervalId = null;
    let cancelled = false;

    async function fetchMessagesSilently() {
      try {
        const result = await listMessages(selectedConversationId, { limit: 30 });

        if (cancelled) return;

        setMessages((current) => {
          const fresh = [...(result?.items || [])].reverse();
          const optimistic = current.filter((item) => item.pending);

          return [...fresh, ...optimistic];
        });
        setOlderCursor(result?.nextCursor || null);
      } catch {
        // Silent poll -- a transient failure just tries again next tick.
      }
    }

    function start() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!cancelled) fetchMessagesSilently();
      }, CONVERSATION_POLL_MS);
    }

    function stop() {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        fetchMessagesSilently();
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedConversationId]);

  async function handleLoadOlderMessages() {
    if (!olderCursor || !selectedConversationId) return;

    try {
      const result = await listMessages(selectedConversationId, { limit: 30, cursor: olderCursor });
      const older = [...(result?.items || [])].reverse();

      setMessages((current) => [...older, ...current]);
      setOlderCursor(result?.nextCursor || null);
    } catch {
      // Silent -- staying on the current page is better than an
      // error banner for a "load more history" action.
    }
  }

  async function handleSend(body) {
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const optimisticMessage = {
      messageId: clientMessageId,
      senderUserId: currentUserId,
      senderName: usuarioLogado?.name,
      messageType: "text",
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((current) => [...current, optimisticMessage]);

    try {
      const result = await sendMessage(selectedConversationId, { body, clientMessageId });

      setMessages((current) =>
        current.map((item) => (item.messageId === clientMessageId ? { ...result, pending: false } : item))
      );
      refreshConversations();
    } catch {
      setMessages((current) =>
        current.map((item) =>
          item.messageId === clientMessageId ? { ...item, pending: false, failed: true } : item
        )
      );
    }
  }

  async function handleArchive(conversationId) {
    try {
      await archiveConversation(conversationId);

      setConversations((current) => current.filter((item) => item.conversationId !== conversationId));

      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversationId(null);
      }
    } catch {
      // Leave the item in place -- nothing to roll back visually
      // beyond that.
    }
  }

  function handleConversationStarted(conversationId) {
    setShowNewChatModal(false);
    refreshConversations();
    setSelectedConversationId(conversationId);
  }

  const selectedConversation = conversations.find((c) => c.conversationId === selectedConversationId) || null;
  const canPost = selectedConversation ? selectedConversation.canPost !== false : true;

  return (
    <main className="p-6">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="mt-2 text-gray-600">Converse com colegas que compartilham uma matrícula com você.</p>
        <InstitutionalChatNotice className="mt-2" />
      </section>

      <section className="grid gap-6 rounded-2xl bg-white shadow md:grid-cols-[320px_1fr]" style={{ minHeight: 520 }}>
        <div className="flex flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-bold text-gray-900">Conversas</h2>
            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Nova conversa
            </button>
          </div>

          {conversationsLoading && <p className="px-4 py-6 text-center text-sm text-gray-500">Carregando...</p>}

          {!conversationsLoading && conversationsError && (
            <p className="px-4 py-3 text-center text-sm text-red-700">{conversationsError}</p>
          )}

          {!conversationsLoading && !conversationsError && conversations.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Nenhuma conversa ainda. Comece uma com um colega.
            </p>
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
                        {conversationTitle(conversation)}
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
          {!selectedConversationId && (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
              Selecione uma conversa ou comece uma nova.
            </div>
          )}

          {selectedConversationId && (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h3 className="font-bold text-gray-900">
                  {selectedConversation ? conversationTitle(selectedConversation) : "Conversa"}
                </h3>

                <button
                  type="button"
                  onClick={() => handleArchive(selectedConversationId)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Arquivar
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {olderCursor && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleLoadOlderMessages}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Carregar mensagens anteriores
                    </button>
                  </div>
                )}

                {messagesLoading && <p className="text-center text-sm text-gray-500">Carregando mensagens...</p>}

                {!messagesLoading && messagesError && (
                  <p className="text-center text-sm text-red-700">{messagesError}</p>
                )}

                {!messagesLoading &&
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
                  onSend={handleSend}
                  disabled={!canPost}
                  disabledReason="Você não pode mais enviar mensagens nesta conversa."
                />
              </div>
            </>
          )}
        </div>
      </section>

      {showNewChatModal && (
        <NewAcademicChatModal
          onClose={() => setShowNewChatModal(false)}
          onConversationStarted={handleConversationStarted}
        />
      )}
    </main>
  );
}
