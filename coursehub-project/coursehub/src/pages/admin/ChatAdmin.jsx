import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  listAdministrativeQueue,
  assignAdministrativeTicket,
  getConversation,
  resolveConversation,
} from "../../services/ChatService";
import { useChatThread } from "../../hooks/useChatThread";
import InstitutionalChatNotice from "../../components/chat/InstitutionalChatNotice";
import ChatThreadPanel from "../../components/chat/ChatThreadPanel";

const CATEGORY_FILTERS = [
  { value: "", label: "Todas" },
  { value: "financial", label: "Financeiro" },
  { value: "calendar", label: "Calendário" },
  { value: "request", label: "Requerimento" },
];

const ASSIGNMENT_FILTERS = [
  { value: "unassigned", label: "Não atribuídos" },
  { value: "mine", label: "Atribuídos a mim" },
  { value: "all", label: "Todos" },
];

const STATUS_LABEL = {
  open: "Aberto",
  waiting_staff: "Aguardando administração",
  waiting_student: "Aguardando aluno",
  resolved: "Resolvido",
  closed: "Encerrado",
};

function formatConversationTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ChatAdmin() {
  const { usuarioLogado } = useAuth();
  const currentUserId = usuarioLogado?.id;

  const [categoryFilter, setCategoryFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("unassigned");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [queueReloadToken, setQueueReloadToken] = useState(0);

  const [accessState, setAccessState] = useState("idle"); // idle | checking | granted | denied | error
  const [conversationDetail, setConversationDetail] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchQueue() {
      try {
        const result = await listAdministrativeQueue({
          category: categoryFilter || undefined,
          unassignedOnly: assignmentFilter === "unassigned" ? true : undefined,
          assignedToUserId: assignmentFilter === "mine" ? currentUserId : undefined,
          limit: 50,
        });

        if (cancelled) return;

        setQueueItems(result?.items || []);
        setQueueError("");
      } catch (requestError) {
        if (cancelled) return;

        setQueueError(requestError.message || "Não foi possível carregar a fila.");
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    }

    fetchQueue();

    return () => {
      cancelled = true;
    };
  }, [categoryFilter, assignmentFilter, currentUserId, queueReloadToken]);

  useEffect(() => {
    if (!selectedConversationId) return undefined;

    let cancelled = false;

    async function checkAccess() {
      setAccessState("checking");
      setClaimError("");

      try {
        const result = await getConversation(selectedConversationId);

        if (cancelled) return;

        setConversationDetail(result);
        setAccessState("granted");
      } catch (requestError) {
        if (cancelled) return;

        setAccessState(requestError.status === 404 ? "denied" : "error");
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, queueReloadToken]);

  const threadConversationId = accessState === "granted" ? selectedConversationId : null;

  const { messages, loading: messagesLoading, error: messagesError, olderCursor, handleSend, handleLoadOlderMessages } =
    useChatThread({
      conversationId: threadConversationId,
      currentUserId,
      currentUserName: usuarioLogado?.name,
      onMessageSent: () => setQueueReloadToken((token) => token + 1),
    });

  const selectedQueueItem = queueItems.find((item) => item.conversationId === selectedConversationId) || null;

  async function handleClaim() {
    if (!selectedConversationId) return;

    try {
      setClaiming(true);
      setClaimError("");

      await assignAdministrativeTicket(selectedConversationId);

      setQueueReloadToken((token) => token + 1);
    } catch (requestError) {
      setClaimError(requestError.message || "Não foi possível assumir o atendimento.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleResolve() {
    if (!selectedConversationId) return;

    try {
      await resolveConversation(selectedConversationId);
      setQueueReloadToken((token) => token + 1);
    } catch {
      // Silent -- the button stays visible and the admin can try again.
    }
  }

  return (
    <main className="p-6">
      <section className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Protocolos administrativos</h1>
        <p className="mt-2 text-gray-600">
          Fila de protocolos abertos por alunos com a administração. Assuma um protocolo para responder.
        </p>
        <InstitutionalChatNotice className="mt-2" />
      </section>

      <section className="grid gap-6 rounded-2xl bg-white shadow md:grid-cols-[340px_1fr]" style={{ minHeight: 520 }}>
        <div className="flex flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setCategoryFilter(filter.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === filter.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2">
            {ASSIGNMENT_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setAssignmentFilter(filter.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  assignmentFilter === filter.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {queueLoading && <p className="px-4 py-6 text-center text-sm text-gray-500">Carregando...</p>}

          {!queueLoading && queueError && <p className="px-4 py-3 text-center text-sm text-red-700">{queueError}</p>}

          {!queueLoading && !queueError && queueItems.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhum protocolo nesta fila.</p>
          )}

          <ul className="flex-1 overflow-y-auto">
            {queueItems.map((item) => (
              <li key={item.conversationId}>
                <button
                  type="button"
                  onClick={() => setSelectedConversationId(item.conversationId)}
                  className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-gray-50 ${
                    selectedConversationId === item.conversationId ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="block w-full truncate font-semibold text-gray-900">{item.title || "Protocolo"}</span>
                  <span className="block truncate text-xs text-gray-500">{item.student?.name}</span>
                  <span className="flex w-full items-center justify-between text-xs text-gray-400">
                    <span>{STATUS_LABEL[item.status] || item.status}</span>
                    <span>{formatConversationTime(item.lastMessageAt || item.createdAt)}</span>
                  </span>
                  {item.assignedAdminName && (
                    <span className="text-xs text-blue-600">Com {item.assignedAdminName}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col">
          {!selectedConversationId && (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
              Selecione um protocolo na lista.
            </div>
          )}

          {selectedConversationId && accessState === "checking" && (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
              Carregando...
            </div>
          )}

          {selectedConversationId && accessState === "error" && (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-700">
              Não foi possível carregar este protocolo.
            </div>
          )}

          {selectedConversationId && accessState === "denied" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <h3 className="font-bold text-gray-900">{selectedQueueItem?.title || "Protocolo"}</h3>
              <p className="text-sm text-gray-600">
                Aluno: {selectedQueueItem?.student?.name || "—"}
                {selectedQueueItem?.assignedAdminName && ` · atualmente com ${selectedQueueItem.assignedAdminName}`}
              </p>
              <p className="text-sm text-gray-500">
                Você ainda não está neste atendimento. Assuma o protocolo para ver as mensagens e responder.
              </p>

              {claimError && <p className="text-sm text-red-700">{claimError}</p>}

              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claiming ? "Assumindo..." : "Assumir atendimento"}
              </button>
            </div>
          )}

          {selectedConversationId && accessState === "granted" && (
            <ChatThreadPanel
              title={conversationDetail?.title || "Protocolo"}
              conversation={conversationDetail}
              messages={messages}
              loading={messagesLoading}
              error={messagesError}
              olderCursor={olderCursor}
              onLoadOlder={handleLoadOlderMessages}
              onSend={handleSend}
              canPost={conversationDetail?.canPost !== false}
              currentUserId={currentUserId}
              onResolve={handleResolve}
            />
          )}
        </div>
      </section>
    </main>
  );
}
