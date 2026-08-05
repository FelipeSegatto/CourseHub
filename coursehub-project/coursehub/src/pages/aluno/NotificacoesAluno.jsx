import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
} from "../../services/NotificationService";
import StatCard from "../../components/ui/StatCard";

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" },
  { value: "read", label: "Lidas" },
];

const PRIORITY_LABEL = {
  urgent: { text: "Urgente", className: "bg-red-100 text-red-700" },
  high: { text: "Importante", className: "bg-yellow-100 text-yellow-700" },
  normal: null,
};

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificacoesAluno() {
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [inboxResult, unreadResult] = await Promise.all([
        listNotifications({ status }),
        getUnreadNotificationCount(),
      ]);

      setItems(inboxResult?.items || []);
      setNextCursor(inboxResult?.nextCursor || null);
      setUnreadCount(unreadResult?.unreadCount ?? 0);
    } catch (requestError) {
      console.error("[NotificacoesAluno] erro:", requestError);
      setError(requestError.message || "Não foi possível carregar as notificações.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  async function handleLoadMore() {
    if (!nextCursor) return;

    try {
      setLoadingMore(true);

      const result = await listNotifications({ status, cursor: nextCursor });

      setItems((current) => [...current, ...(result?.items || [])]);
      setNextCursor(result?.nextCursor || null);
    } catch (requestError) {
      console.error("[NotificacoesAluno] erro ao carregar mais:", requestError);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkRead(notificationId) {
    try {
      await markNotificationRead(notificationId);

      setItems((current) =>
        current.map((item) =>
          item.notificationId === notificationId
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (requestError) {
      console.error("[NotificacoesAluno] erro ao marcar como lida:", requestError);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      await loadFirstPage();
    } catch (requestError) {
      console.error("[NotificacoesAluno] erro ao marcar todas como lidas:", requestError);
    }
  }

  async function handleArchive(notificationId) {
    try {
      await archiveNotification(notificationId);
      setItems((current) => current.filter((item) => item.notificationId !== notificationId));
    } catch (requestError) {
      console.error("[NotificacoesAluno] erro ao arquivar:", requestError);
    }
  }

  return (
    <main className="p-6">
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
        <p className="mt-2 text-gray-600">
          Acompanhe avisos importantes sobre cursos, atividades, notas e frequência.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <StatCard title="Não lidas" value={unreadCount} color="blue" />
        <StatCard title="Nesta página" value={items.length} />
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-900">Minhas notificações</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
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
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar todas como lidas
            </button>
          </div>
        </div>

        {loading && <p className="py-12 text-center text-gray-500">Carregando notificações...</p>}

        {!loading && error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadFirstPage}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="py-12 text-center text-gray-500">Nenhuma notificação por aqui.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="space-y-4">
              {items.map((item) => {
                const isUnread = !item.readAt;
                const priorityBadge = PRIORITY_LABEL[item.priority];

                return (
                  <article
                    key={item.recipientId}
                    className={`rounded-2xl border p-5 ${
                      isUnread ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {priorityBadge && (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge.className}`}
                            >
                              {priorityBadge.text}
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isUnread ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isUnread ? "Não lida" : "Lida"}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                        <p className="mt-2 text-gray-600">{item.message}</p>
                        <p className="mt-3 text-sm text-gray-500">{formatDateTime(item.createdAt)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={item.actionPath}
                          onClick={() => isUnread && handleMarkRead(item.notificationId)}
                          className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition"
                        >
                          Ver detalhes
                        </Link>

                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(item.notificationId)}
                            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                          >
                            Marcar como lida
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleArchive(item.notificationId)}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                        >
                          Arquivar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {nextCursor && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
                >
                  {loadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <Link
          to="/aluno/dashboard-aluno"
          className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Voltar ao dashboard
        </Link>
      </section>
    </main>
  );
}
