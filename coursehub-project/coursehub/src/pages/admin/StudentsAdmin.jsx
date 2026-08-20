import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { apiFetch } from "../../services/APIService";

import ManagementPageShell from "../../components/ui/ManagementPageShell";
import AdminCreateEditModal from "../../components/admin/AdminCreateEditModal";
import DeleteConfirmModal from "../../components/admin/AdminDeleteModal";
import AdminTable from "../../components/admin/AdminTable";
import AdminStatusFilter from "../../components/admin/AdminStatusFilter";
import TableActionButton from "../../components/ui/actions/TableActionButton";
import RowActionsMenu from "../../components/ui/actions/RowActionsMenu";

import StatusBadge from "../../components/ui/StatusBadge";

export default function StudentsAdmin() {
  const [students, setStudents] = useState([]);
  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [statusFilter, setStatusFilter] = useState("active");
  const studentStatusOptions = [
    { value: "active", label: "Ativos" },
    { value: "inactive", label: "Inativos" },
    { value: "cancelled", label: "Cancelados" },
  ];

  async function fetchStudents() {
    try {
      setLoading(true);
      setError("");

      const data = await apiFetch("/api/admin/students");
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message || "Erro ao buscar alunos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  function handleCreateClick() {
    setModalMode("create");
    setSelectedStudent(null);
    setModalOpen(true);
  }

  function handleEditClick(student) {
    setModalMode("edit");
    setSelectedStudent(student);
    setModalOpen(true);
  }

  function handleDeleteClick(student) {
    setSelectedStudent(student);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!selectedStudent?.id) return;

    try {
      setLoadingDelete(true);

      await apiFetch(`/api/admin/students/${selectedStudent.id}`, {
        method: "DELETE",
      });

      setDeleteModalOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      alert(error.message || "Erro ao remover aluno.");
    } finally {
      setLoadingDelete(false);
    }
  }

const filteredStudents = useMemo(() => {
  const term = busca.trim().toLowerCase();

  return students.filter((student) => {
    const matchesSearch =
      !term ||
      student.name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.registration_number?.toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter ||
      student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}, [students, busca, statusFilter]);

  const stats = useMemo(() => {
    return [
      { title: "Total de alunos", value: students.length },
      {
        title: "Alunos ativos",
        value: students.filter((student) => student.status === "active").length,
      },
      {
        title: "Inativos",
        value: students.filter((student) => student.status === "inactive").length,
      },
      {
        title: "Cancelados",
        value: students.filter((student) => student.status === "cancelled").length,
      },
    ];
  }, [students]);

  const quickActions = [
    {
      title: "Cadastrar aluno",
      description: "Adicione um novo aluno à plataforma.",
      onClick: handleCreateClick,
    },
    {
      title: "Acompanhar matrículas",
      description: "Veja os cursos vinculados aos alunos.",
      to: "/admin/matriculas",
    },
  ];

  const columns = [
    { key: "student", label: "Aluno" },
    { key: "registration_number", label: "Matrícula" },
    { key: "cpf", label: "CPF" },
    { key: "phone", label: "Telefone" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Ações", align: "right" },
  ];

  return (
    <>
      <ManagementPageShell
        backTo="/admin/dashboard-admin"
        title="Gerenciamento de Alunos"
        description="Acompanhe alunos cadastrados, cursos, status e progresso."
        createButtonText="+ Novo Aluno"
        onCreateClick={handleCreateClick}
        stats={stats}
        tableTitle="Lista de alunos"
        tableActions={
          <AdminStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={studentStatusOptions}
          />
        }
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar aluno..."
        quickActions={quickActions}
      >
        {loading && (
          <p className="py-6 text-center text-gray-500">
            Carregando alunos...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-red-500">{error}</p>
        )}

        {!loading && !error && (
          <AdminTable
            columns={columns}
            data={filteredStudents}
            emptyMessage="Nenhum aluno encontrado."
            renderRow={(student) => (
              <tr key={student.id} className="border-b border-gray-100">
                <td className="px-3 py-3">
                  <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                  {student.registration_number || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">{student.cpf || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">{student.phone || "-"}</td>

                <td className="whitespace-nowrap px-3 py-3">
                  <StatusBadge status={student.status} />
                </td>

                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <TableActionButton variant="accent" size="sm" onClick={() => handleEditClick(student)}>
                      Editar
                    </TableActionButton>

                    <RowActionsMenu
                      items={[
                        {
                          key: "delete",
                          label: "Remover",
                          icon: Trash2,
                          variant: "danger",
                          onClick: () => handleDeleteClick(student),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </ManagementPageShell>

      {modalOpen && (
        <AdminCreateEditModal
          variant="student"
          mode={modalMode}
          initialData={selectedStudent}
          handleCloseModal={() => setModalOpen(false)}
          onSuccess={fetchStudents}
        />
      )}

      {deleteModalOpen && (
        <DeleteConfirmModal
          title="Remover aluno"
          description="Tem certeza que deseja remover este aluno?"
          itemName={selectedStudent?.name}
          loading={loadingDelete}
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}