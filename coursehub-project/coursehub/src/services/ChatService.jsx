import { apiFetch } from "./APIService";

function buildQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const shouldIgnore = value === undefined || value === null || value === "";

    if (!shouldIgnore) {
      query.append(key, String(value));
    }
  });

  return query.toString();
}

export async function listConversations(params = {}) {
  const queryString = buildQueryString(params);

  return apiFetch(queryString ? `/api/chat/conversations?${queryString}` : "/api/chat/conversations");
}

export async function getUnreadChatCount() {
  return apiFetch("/api/chat/unread-count");
}

export async function getConversation(conversationId) {
  return apiFetch(`/api/chat/conversations/${conversationId}`);
}

export async function listMessages(conversationId, params = {}) {
  const queryString = buildQueryString(params);
  const base = `/api/chat/conversations/${conversationId}/messages`;

  return apiFetch(queryString ? `${base}?${queryString}` : base);
}

export async function sendMessage(conversationId, { body, clientMessageId, replyToMessageId }) {
  return apiFetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, clientMessageId, replyToMessageId }),
  });
}

export async function markConversationRead(conversationId, { lastReadMessageId } = {}) {
  return apiFetch(`/api/chat/conversations/${conversationId}/read`, {
    method: "PATCH",
    body: JSON.stringify({ lastReadMessageId }),
  });
}

export async function archiveConversation(conversationId) {
  return apiFetch(`/api/chat/conversations/${conversationId}/archive`, { method: "PATCH" });
}

export async function listAcademicContacts(search) {
  const queryString = buildQueryString({ search });

  return apiFetch(queryString ? `/api/chat/academic-contacts?${queryString}` : "/api/chat/academic-contacts");
}

export async function openAcademicPeerConversation(peerUserId) {
  return apiFetch("/api/chat/academic-conversations", {
    method: "POST",
    body: JSON.stringify({ peerUserId }),
  });
}
