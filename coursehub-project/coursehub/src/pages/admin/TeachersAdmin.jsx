import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/APIService";

import AdminManagementPage from "../../components/admin/AdminManagementPage";
import AdminCreateEditModal from "../../components/admin/AdminCreateEditModal";
import DeleteConfirmModal from "../../components/admin/AdminDeleteModal";
import AdminTable from "../../components/admin/AdminTable";
import AdminStatusFilter from "../../components/admin/AdminStatusFilter";

import StatusBadge from "../../components/ui/StatusBadge";

export default function TeachersAdmin() {
  const [teachers, setTeachers] = useState([]);
  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [statusFilter, setStatusFilter] = useState("active");
  const userStatusOptions = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "blocked", label: "Bloqueados" },
];

  async function fetchTeachers() {
    try {
      setLoading(true);
      setError("");

      const data = await apiFetch("/admin/teachers");
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message || "Erro ao buscar professores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedTeacher(null);
    setModalOpen(true);
  }

  function handleEditClick(teacher) {
    setModalMode("edit");
    setSelectedTeacher(teacher);
    setModalOpen(true);
  }

  function handleDeleteClick(teacher) {
    setSelectedTeacher(teacher);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!selectedTeacher?.id) return;

    try {
      setLoadingDelete(true);

      await apiFetch(`/admin/teachers/${selectedTeacher.id}`, {
        method: "DELETE",
      });

      setDeleteModalOpen(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (error) {
      alert(error.message || "Erro ao remover professor.");
    } finally {
      setLoadingDelete(false);
    }
  }

  const filteredTeachers = useMemo(() => {
  const term = busca.trim().toLowerCase();

  return teachers.filter((teacher) => {
    const matchesSearch =
      !term ||
      teacher.name?.toLowerCase().includes(term) ||
      teacher.registration_number?.toLowerCase().includes(term) ||
      teacher.course_names?.toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter ||
      teacher.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}, [teachers, busca, statusFilter]);

  const stats = useMemo(() => {
    return [
      { title: "Total de professores", value: teachers.length },
      {
        title: "Professores ativos",
        value: teachers.filter((teacher) => teacher.status === "active").length,
      },
      {
        title: "Inativos",
        value: teachers.filter((teacher) => teacher.status === "inactive").length,
      },
         {
      title: "Cursos vinculados",
      value: teachers.reduce(
        (total, teacher) => total + Number(teacher.total_courses || 0),
        0
      ),
    },
    ];
  }, [teachers]);

  const quickActions = [
    {
      title: "Cadastrar professor",
      description: "Adicione um novo professor à plataforma.",
      onClick: handleCreateClick,
    },
    {
      title: "Gerenciar acessos",
      description: "Edite status, bloqueios e dados cadastrais.",
      onClick: () => {},
    },
    {
      title: "Acompanhar métricas do professor",
      description: "Veja o desempenho dos cursos vinculados aos professores.",
      onClick: () => {},
    },
  ];

    const columns = [
    { key: "teacher", label: "Professor" },
    { key: "registration_number", label: "Matrícula" },
    { key: "course_names", label: "Cursos" },
    { key: "phone", label: "Telefone" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Ações" },
  ];

  return (
    <>
      <AdminManagementPage
        title="Gerenciamento de professores"
        description="Acompanhe professores cadastrados, cursos, status e progresso."
        createButtonText="+ Novo professor"
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle="Lista de professores"
        tableActions={
          <AdminStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={userStatusOptions}
          />
        }
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar professor..."
        quickActions={quickActions}
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">
            Carregando professores...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-red-500">{error}</p>
        )}

        {!loading && !error && (
          <AdminTable
            columns={columns}
            data={filteredTeachers}
            emptyMessage="Nenhum professor encontrado."
            renderRow={(teacher) => (
              <tr key={teacher.id} className="border-b border-gray-100">
                <td className="py-5">
                  <p className="font-semibold text-gray-900">{teacher.name}</p>
                  <p className="text-sm text-gray-500">{teacher.email}</p>
                </td>

                <td className="py-5 text-gray-600">
                  {teacher.registration_number || "-"}
                </td>

                <td className="py-5 text-gray-600">{teacher.course_names || "-"}</td>
                <td className="py-5 text-gray-600">{teacher.phone || "-"}</td>

                <td className="py-5">
                  <StatusBadge status={teacher.status} />
                </td>

                <td className="py-5">
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                      Ver
                    </button>

                    <button
                      onClick={() => handleEditClick(teacher)}
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDeleteClick(teacher)}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </AdminManagementPage>

      {modalOpen && (
        <AdminCreateEditModal
          variant="teacher"
          mode={modalMode}
          initialData={selectedTeacher}
          handleCloseModal={() => setModalOpen(false)}
          onSuccess={fetchTeachers}
        />
      )}

      {deleteModalOpen && (
        <DeleteConfirmModal
          title="Remover professor"
          description="Tem certeza que deseja remover este professor?"
          itemName={selectedTeacher?.name}
          loading={loadingDelete}
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

