import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

import {
  listUsers,
  updateUserStatus,
  updateUserRole,
  sendPasswordReset,
  softDeleteUser,
} from "../../services/AdminUserService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminUserModal from "../../components/admin/AdminUserModal";
import DeleteConfirmModal from "../../components/admin/AdminDeleteModal";
import AdminTable from "../../components/admin/AdminTable";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDisplayDate } from "../../utils/dateUtils";

const ROLE_OPTIONS = [
  { value: "student", label: "Aluno" },
  { value: "teacher", label: "Professor" },
  { value: "admin", label: "Administrador" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "blocked", label: "Bloqueados" },
];

const LINKED_ENTITY_OPTIONS = [
  { value: "student", label: "Vinculado a aluno" },
  { value: "teacher", label: "Vinculado a professor" },
  { value: "none", label: "Sem vínculo" },
];

const PAGE_LIMIT = 10;

function formatShortDate(value) {
  if (!value) return "-";

  return formatDisplayDate(String(value).slice(0, 10), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function UsersAdmin() {
  const { usuarioLogado } = useAuth();

  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [linkedEntityType, setLinkedEntityType] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleSelection, setRoleSelection] = useState("");
  const [rowActionLoading, setRowActionLoading] = useState(null);
  const [rowActionError, setRowActionError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await listUsers({
        search,
        role,
        status,
        linkedEntityType,
        page,
        limit: PAGE_LIMIT,
      });

      setUsers(Array.isArray(result?.data) ? result.data : []);
      setSummary(result?.summary || null);
      setPagination(
        result?.pagination || { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 }
      );
    } catch (requestError) {
      console.error("[UsersAdmin] erro ao buscar usuários:", requestError);
      setError(requestError.message || "Não foi possível carregar os usuários.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, role, status, linkedEntityType, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedUser(null);
    setModalOpen(true);
  }

  function handleEditClick(user) {
    setModalMode("edit");
    setSelectedUser(user);
    setModalOpen(true);
  }

  async function handleModalSuccess() {
    setModalOpen(false);
    setSelectedUser(null);
    await fetchUsers();
  }

  function isSelf(user) {
    return usuarioLogado?.id && Number(usuarioLogado.id) === Number(user.id);
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    try {
      setRowActionLoading(user.id);
      setRowActionError("");

      await updateUserStatus(user.id, nextStatus);
      await fetchUsers();
    } catch (requestError) {
      console.error("Erro ao alterar status:", requestError);
      setRowActionError(requestError.message || "Erro ao alterar status.");
    } finally {
      setRowActionLoading(null);
    }
  }

  async function handleSendPasswordReset(user) {
    try {
      setRowActionLoading(user.id);
      setRowActionError("");
      setFeedback("");

      const result = await sendPasswordReset(user.id);
      setFeedback(result?.message || "E-mail de redefinição enviado.");
    } catch (requestError) {
      console.error("Erro ao enviar recuperação de senha:", requestError);
      setRowActionError(
        requestError.message || "Erro ao enviar recuperação de senha."
      );
    } finally {
      setRowActionLoading(null);
    }
  }

  function openRoleModal(user) {
    setRoleTarget(user);
    setRoleSelection(user.role);
    setRowActionError("");
  }

  async function handleConfirmRoleChange() {
    if (!roleTarget) return;

    try {
      setRowActionLoading(roleTarget.id);
      setRowActionError("");

      await updateUserRole(roleTarget.id, roleSelection);

      setRoleTarget(null);
      await fetchUsers();
    } catch (requestError) {
      console.error("Erro ao alterar papel:", requestError);
      setRowActionError(requestError.message || "Erro ao alterar papel.");
    } finally {
      setRowActionLoading(null);
    }
  }

  function handleDeleteClick(user) {
    setDeleteTarget(user);
    setRowActionError("");
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      setRowActionLoading(deleteTarget.id);
      setRowActionError("");

      await softDeleteUser(deleteTarget.id);

      setDeleteTarget(null);
      await fetchUsers();
    } catch (requestError) {
      console.error("Erro ao remover usuário:", requestError);
      setRowActionError(requestError.message || "Erro ao remover usuário.");
    } finally {
      setRowActionLoading(null);
    }
  }

  const stats = [
    { title: "Total de usuários", value: summary?.total ?? 0 },
    { title: "Ativos", value: summary?.active ?? 0, color: "green" },
    { title: "Inativos/Bloqueados", value: summary?.inactiveOrBlocked ?? 0, color: "red" },
    { title: "Alunos", value: summary?.students ?? 0 },
    { title: "Professores", value: summary?.teachers ?? 0 },
    { title: "Administradores", value: summary?.admins ?? 0, color: "purple" },
  ];

  const columns = [
    { key: "user", label: "Usuário" },
    { key: "role", label: "Papel" },
    { key: "linked", label: "Entidade vinculada" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Criado em" },
    { key: "actions", label: "Ações" },
  ];

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto";

  return (
    <>
      <AdminManagementPage
        title="Gerenciamento de usuários"
        description="Identidade de autenticação: papel, status e credenciais. Dados acadêmicos/profissionais continuam em Alunos e Professores."
        createButtonText="+ Novo administrador"
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle="Lista de usuários"
        tableActions={
          <div className="flex flex-wrap gap-3">
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os papéis</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={linkedEntityType}
              onChange={(event) => {
                setLinkedEntityType(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos os vínculos</option>
              {LINKED_ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Buscar por nome ou e-mail..."
      >
        {feedback && (
          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {feedback}
          </p>
        )}

        {rowActionError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rowActionError}
          </p>
        )}

        {loading && (
          <p className="py-6 text-center text-gray-500">Carregando usuários...</p>
        )}

        {!loading && error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchUsers}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <AdminTable
              columns={columns}
              data={users}
              emptyMessage="Nenhum usuário encontrado."
              renderRow={(user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="py-5">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>

                  <td className="py-5 text-gray-600">
                    {ROLE_OPTIONS.find((option) => option.value === user.role)?.label ||
                      user.role}
                  </td>

                  <td className="py-5 text-gray-600">
                    {user.linkedEntity
                      ? `${user.linkedEntity.type === "student" ? "Aluno" : "Professor"} · ${user.linkedEntity.displayName}`
                      : "Sem vínculo"}
                  </td>

                  <td className="py-5">
                    <StatusBadge status={user.status} />
                  </td>

                  <td className="py-5 text-gray-600">
                    {formatShortDate(user.createdAt)}
                  </td>

                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(user)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSelf(user) || rowActionLoading === user.id}
                        title={isSelf(user) ? "Você não pode alterar o próprio status." : undefined}
                        className="rounded-lg bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {user.status === "active" ? "Inativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendPasswordReset(user)}
                        disabled={rowActionLoading === user.id}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Redefinir senha
                      </button>

                      <button
                        type="button"
                        onClick={() => openRoleModal(user)}
                        disabled={Boolean(user.linkedEntity) || isSelf(user)}
                        title={
                          user.linkedEntity
                            ? "Contas com entidade acadêmica/profissional vinculada não suportam troca de papel nesta versão."
                            : isSelf(user)
                              ? "Você não pode alterar o próprio papel."
                              : undefined
                        }
                        className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Alterar papel
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(user)}
                        disabled={isSelf(user) || rowActionLoading === user.id}
                        title={isSelf(user) ? "Você não pode remover a própria conta." : undefined}
                        className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Página {pagination.page} de {pagination.totalPages} ·{" "}
                  {pagination.total} usuário(s)
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, pagination.totalPages))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminManagementPage>

      {modalOpen && (
        <AdminUserModal
          mode={modalMode}
          initialData={selectedUser}
          handleCloseModal={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Remover usuário"
          description="Isso inativa a conta (soft delete) — impede login, mas preserva todo o histórico acadêmico."
          itemName={deleteTarget.name}
          loading={rowActionLoading === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Alterar papel</h2>

            <p className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
              {roleTarget.name}
            </p>

            {rowActionError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rowActionError}
              </p>
            )}

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Novo papel
              <select
                value={roleSelection}
                onChange={(event) => setRoleSelection(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                disabled={rowActionLoading === roleTarget.id}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={
                  rowActionLoading === roleTarget.id || roleSelection === roleTarget.role
                }
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
              >
                {rowActionLoading === roleTarget.id ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
