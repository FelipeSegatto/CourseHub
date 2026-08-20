import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getAdminDashboard } from "../../services/DashboardService";
import StatCard from "../../components/ui/StatCard";
import QuickActionsCard from "../../components/ui/QuickActionsCard";
import PrintPageButton from "../../components/reports/PrintPageButton";
import { formatDisplayDate } from "../../utils/dateUtils";

function formatShortDate(dateString) {
  if (!dateString) return null;

  return formatDisplayDate(dateString, { day: "2-digit", month: "short" });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

const quickActions = [
  {
    title: "Cadastrar aluno",
    description: "Adicione um novo aluno à plataforma.",
    to: "/admin/alunos",
  },
  {
    title: "Criar curso",
    description: "Cadastre um novo curso.",
    to: "/admin/cursos",
  },
  {
    title: "Cadastrar professor",
    description: "Adicione um novo professor.",
    to: "/admin/professores",
  },
  {
    title: "Emitir certificado",
    description: "Gerencie certificados dos alunos.",
    to: "/admin/emissao",
  },
  {
    title: "Gerenciar materiais",
    description: "Vídeos, PDFs, textos e aulas ao vivo de todos os cursos.",
    to: "/admin/materiais",
  },
];

export default function DashboardAdmin() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminDashboard();

      setDashboard(data);
    } catch (requestError) {
      console.error("[DashboardAdmin] erro:", requestError);

      setError(
        requestError?.message ||
          "Não foi possível carregar o dashboard administrativo."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = dashboard?.summary;
  const financial = dashboard?.financial;
  const academic = dashboard?.academic;
  const upcomingEvents = dashboard?.upcomingEvents ?? [];

  const pendingItems = [
    ...(dashboard?.administrativePendingItems ?? []),
    {
      type: "pending_submissions",
      label: "Envios aguardando correção",
      count: academic?.pendingSubmissions ?? 0,
      deepLink: null,
    },
    {
      type: "overdue_invoices",
      label: "Faturas em atraso",
      count: financial?.overdueInvoices ?? 0,
      deepLink: "/admin/financeiro/cobrancas",
    },
  ].filter((item) => item.count > 0);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="print-area mx-auto max-w-7xl">
        <section className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Área do Administrador
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Painel administrativo
            </h1>

            <p className="mt-3 max-w-3xl text-gray-600">
              Gerencie alunos, cursos, professores e acompanhe os principais
              indicadores da plataforma.
            </p>
          </div>

          <div className="flex gap-3 print-hide">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              Atualizar
            </button>

            <PrintPageButton />
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadDashboard}
              className="print-hide text-sm font-semibold text-red-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading && !dashboard ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Usuários ativos"
                value={summary?.activeUsers ?? 0}
              />

              <StatCard
                title="Alunos ativos"
                value={academic?.activeStudents ?? 0}
                color="green"
              />

              <StatCard
                title="Professores ativos"
                value={academic?.activeTeachers ?? 0}
                color="purple"
              />

              <StatCard
                title="Matrículas ativas"
                value={summary?.activeEnrollments ?? 0}
                color="yellow"
              />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Ações rápidas
                  </h2>

                  <p className="mt-1 text-gray-500">
                    Acesse as principais funções administrativas.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {quickActions.map((action) => (
                    <QuickActionsCard key={action.title} {...action} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Pendências
                </h2>

                {pendingItems.length === 0 ? (
                  <p className="mt-6 text-center text-gray-500">
                    Nenhuma pendência no momento.
                  </p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {pendingItems.map((item) => {
                      const row = (
                        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                          <span className="text-sm font-medium text-gray-700">
                            {item.label}
                          </span>

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                            {item.count}
                          </span>
                        </div>
                      );

                      return item.deepLink ? (
                        <Link
                          key={item.type}
                          to={item.deepLink}
                          className="block transition hover:opacity-80"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div key={item.type}>{row}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Próximos eventos
                </h2>

                {upcomingEvents.length === 0 ? (
                  <p className="mt-6 text-center text-gray-500">
                    Nenhum evento nos próximos 7 dias.
                  </p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-gray-100 p-4 text-sm text-gray-700"
                      >
                        <p className="font-semibold text-gray-900">
                          {event.title}
                        </p>

                        <p className="mt-1 text-gray-500">
                          {event.displaySubtitle || event.courseName || ""}
                          {event.displaySubtitle || event.courseName
                            ? " · "
                            : ""}
                          {formatShortDate(event.startDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Resumo financeiro
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Recebido</p>

                    <p className="mt-1 text-xl font-bold text-green-600">
                      {formatCurrency(financial?.paidAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Em aberto</p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {formatCurrency(financial?.openAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Em atraso</p>

                    <p className="mt-1 text-xl font-bold text-red-600">
                      {formatCurrency(financial?.overdueAmount)}
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/financeiro"
                  className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  Ver painel financeiro completo →
                </Link>
              </div>
            </section>

            <section className="print-hide mt-8 rounded-2xl bg-blue-600 p-8 text-white">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Próximo passo recomendado
                  </h2>

                  <p className="mt-2 max-w-2xl text-blue-100">
                    {pendingItems.length > 0
                      ? `Você tem ${pendingItems.length} pendência(s) administrativa(s) para revisar.`
                      : "Nenhuma pendência crítica no momento."}
                  </p>
                </div>

                <Link
                  to="/admin/financeiro"
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  Ver financeiro
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
