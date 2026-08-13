import { useEffect, useState } from "react";
import { listAcademicContacts, openAcademicPeerConversation } from "../../services/ChatService";

export default function NewAcademicChatModal({ onClose, onConversationStarted }) {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingUserId, setStartingUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await listAcademicContacts(search);

        if (!cancelled) {
          setContacts(result?.items || []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Não foi possível carregar seus colegas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = setTimeout(load, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search]);

  async function handleStartConversation(userId) {
    try {
      setStartingUserId(userId);

      const result = await openAcademicPeerConversation(userId);

      onConversationStarted(result.conversationId);
    } catch (requestError) {
      setError(requestError.message || "Não foi possível iniciar a conversa.");
    } finally {
      setStartingUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Nova conversa</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar colega pelo nome..."
          autoFocus
          className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />

        {loading && <p className="py-6 text-center text-sm text-gray-500">Carregando...</p>}

        {!loading && error && <p className="py-3 text-center text-sm text-red-700">{error}</p>}

        {!loading && !error && contacts.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            Nenhum colega encontrado com matrícula ativa em um curso em comum.
          </p>
        )}

        {!loading && !error && contacts.length > 0 && (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {contacts.map((contact) => (
              <li key={contact.userId}>
                <button
                  type="button"
                  onClick={() => handleStartConversation(contact.userId)}
                  disabled={startingUserId === contact.userId}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                  <span className="font-medium text-gray-900">{contact.name}</span>
                  {startingUserId === contact.userId && (
                    <span className="ml-auto text-xs text-gray-400">Abrindo...</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
