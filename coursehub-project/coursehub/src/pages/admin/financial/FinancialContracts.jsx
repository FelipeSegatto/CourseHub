import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { listFinancialContracts } from "../../../services/FinancialService";

import FinancialContractsTable from "../../../components/financial/FinancialContractsTable";

const INITIAL_FILTERS = {
  status: "",
  billingType: "",
  search: "",
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function extractResponseData(response) {
  return response?.data ?? response ?? {};
}

function getErrorMessage(error) {
  return (
    error?.message ||
    "Não foi possível carregar os contratos financeiros."
  );
}

function SummaryCard({
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </article>
  );
}

function LoadingState() {
  return (
    <div
      className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 py-12"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
      />

      <p className="text-sm font-medium text-slate-500">
        Carregando contratos financeiros...
      </p>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
        $
      </div>

      <h2 className="mt-5 text-lg font-semibold text-slate-900">
        Nenhum contrato encontrado
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Não existem contratos financeiros que
        correspondam aos filtros selecionados.
      </p>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className={[
            "mt-5 inline-flex min-h-10 items-center justify-center",
            "rounded-lg bg-blue-600 px-4",
            "text-sm font-semibold text-white",
            "transition hover:bg-blue-700",
            "focus:outline-none focus:ring-2",
            "focus:ring-blue-500 focus:ring-offset-2",
          ].join(" ")}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

export default function FinancialContracts() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);

  const [pagination, setPagination] = useState(
    INITIAL_PAGINATION
  );

  const [filters, setFilters] = useState(
    INITIAL_FILTERS
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters.search]);

  const loadContracts = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response =
          await listFinancialContracts({
            page,
            limit,
            status: filters.status || undefined,
            billingType:
              filters.billingType || undefined,
            search: debouncedSearch || undefined,
          });

        if (signal.aborted) {
          return;
        }

        const result =
          extractResponseData(response);

        setContracts(
          Array.isArray(result.contracts)
            ? result.contracts
            : []
        );

        setPagination({
          page:
            Number(result.pagination?.page) ||
            page,

          limit:
            Number(result.pagination?.limit) ||
            limit,

          total:
            Number(result.pagination?.total) ||
            0,

          totalPages:
            Number(
              result.pagination?.totalPages
            ) || 0,
        });
      } catch (requestError) {
        if (signal.aborted) {
          return;
        }

        setContracts([]);
        setError(
          getErrorMessage(requestError)
        );
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [
      page,
      limit,
      filters.status,
      filters.billingType,
      debouncedSearch,
    ]
  );

  useEffect(() => {
    const controller =
      new AbortController();

    loadContracts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadContracts, reloadKey]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.status ||
        filters.billingType ||
        filters.search.trim()
    );
  }, [
    filters.status,
    filters.billingType,
    filters.search,
  ]);

  const firstVisibleItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.limit +
        1;

  const lastVisibleItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));

    if (name !== "search") {
      setPage(1);
    }
  }

  function handleLimitChange(event) {
    const nextLimit =
      Number(event.target.value) || 20;

    setLimit(nextLimit);
    setPage(1);
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  }

  function retryRequest() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  function openContractDetails(contractId) {
    navigate(
      `/admin/financeiro/contratos/${contractId}`
    );
  }

  function goToPreviousPage() {
    setPage((currentPage) =>
      Math.max(currentPage - 1, 1)
    );
  }

  function goToNextPage() {
    setPage((currentPage) =>
      Math.min(
        currentPage + 1,
        pagination.totalPages
      )
    );
  }

  return (
    <main className="min-h-full w-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Financeiro
            </span>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Contratos financeiros
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consulte contratos, valores
              recebidos, pendências e cobranças
              em atraso.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/financial")
            }
            className={[
              "inline-flex min-h-10 items-center justify-center",
              "rounded-lg border border-slate-300",
              "bg-white px-4",
              "text-sm font-semibold text-slate-700",
              "shadow-sm transition",
              "hover:border-slate-400 hover:bg-slate-50",
              "focus:outline-none focus:ring-2",
              "focus:ring-blue-500 focus:ring-offset-2",
            ].join(" ")}
          >
            Voltar ao dashboard
          </button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total encontrado"
            value={pagination.total}
            description="Contratos correspondentes aos filtros"
          />

          <SummaryCard
            label="Página atual"
            value={
              pagination.totalPages > 0
                ? `${pagination.page} de ${pagination.totalPages}`
                : "0 de 0"
            }
            description={`${pagination.limit} registros por página`}
          />

          <SummaryCard
            label="Exibindo"
            value={
              pagination.total > 0
                ? `${firstVisibleItem}–${lastVisibleItem}`
                : "0"
            }
            description="Intervalo atual de resultados"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_minmax(160px,1fr)_minmax(190px,1fr)_120px_auto] xl:items-end">
              <div className="md:col-span-2 xl:col-span-1">
                <label
                  htmlFor="financial-contract-search"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Buscar
                </label>

                <input
                  id="financial-contract-search"
                  type="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Plano, contrato ou matrícula"
                  className={[
                    "min-h-11 w-full rounded-lg",
                    "border border-slate-300 bg-white",
                    "px-3 text-sm text-slate-900",
                    "placeholder:text-slate-400",
                    "transition",
                    "focus:border-blue-500",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-blue-500/20",
                  ].join(" ")}
                />
              </div>

              <div>
                <label
                  htmlFor="financial-contract-status"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Status
                </label>

                <select
                  id="financial-contract-status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className={[
                    "min-h-11 w-full rounded-lg",
                    "border border-slate-300 bg-white",
                    "px-3 text-sm text-slate-900",
                    "transition",
                    "focus:border-blue-500",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-blue-500/20",
                  ].join(" ")}
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="active">
                    Ativo
                  </option>

                  <option value="overdue">
                    Em atraso
                  </option>

                  <option value="completed">
                    Concluído
                  </option>

                  <option value="cancelled">
                    Cancelado
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="financial-contract-billing-type"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Tipo de cobrança
                </label>

                <select
                  id="financial-contract-billing-type"
                  name="billingType"
                  value={filters.billingType}
                  onChange={handleFilterChange}
                  className={[
                    "min-h-11 w-full rounded-lg",
                    "border border-slate-300 bg-white",
                    "px-3 text-sm text-slate-900",
                    "transition",
                    "focus:border-blue-500",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-blue-500/20",
                  ].join(" ")}
                >
                  <option value="">
                    Todos os tipos
                  </option>

                  <option value="one_time">
                    Pagamento único
                  </option>

                  <option value="installments">
                    Parcelado
                  </option>

                  <option value="monthly_plan">
                    Plano mensal
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="financial-contract-limit"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Por página
                </label>

                <select
                  id="financial-contract-limit"
                  value={limit}
                  onChange={handleLimitChange}
                  className={[
                    "min-h-11 w-full rounded-lg",
                    "border border-slate-300 bg-white",
                    "px-3 text-sm text-slate-900",
                    "transition",
                    "focus:border-blue-500",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-blue-500/20",
                  ].join(" ")}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex min-h-11 items-center xl:justify-end">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="m-4 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:m-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-red-800">
                  Erro ao carregar contratos
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={retryRequest}
                className={[
                  "inline-flex min-h-10 shrink-0 items-center",
                  "justify-center rounded-lg",
                  "border border-red-300 bg-white px-4",
                  "text-sm font-semibold text-red-700",
                  "transition hover:bg-red-100",
                  "focus:outline-none focus:ring-2",
                  "focus:ring-red-500 focus:ring-offset-2",
                ].join(" ")}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <LoadingState />
          ) : contracts.length === 0 ? (
            <EmptyState
              hasActiveFilters={
                hasActiveFilters
              }
              onClearFilters={clearFilters}
            />
          ) : (
            <>
              <FinancialContractsTable
                contracts={contracts}
                onOpenContract={
                  openContractDetails
                }
              />

              <footer className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-slate-500">
                  Mostrando{" "}
                  <strong className="font-semibold text-slate-700">
                    {firstVisibleItem}
                  </strong>{" "}
                  até{" "}
                  <strong className="font-semibold text-slate-700">
                    {lastVisibleItem}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-slate-700">
                    {pagination.total}
                  </strong>{" "}
                  contratos.
                </p>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={
                      pagination.page <= 1
                    }
                    className={[
                      "inline-flex min-h-10 items-center justify-center",
                      "rounded-lg border border-slate-300",
                      "bg-white px-4",
                      "text-sm font-semibold text-slate-700",
                      "transition",
                      "hover:border-slate-400 hover:bg-slate-50",
                      "disabled:cursor-not-allowed",
                      "disabled:opacity-40",
                      "focus:outline-none focus:ring-2",
                      "focus:ring-blue-500 focus:ring-offset-2",
                    ].join(" ")}
                  >
                    Anterior
                  </button>

                  <span className="whitespace-nowrap text-sm text-slate-500">
                    Página{" "}
                    <strong className="font-semibold text-slate-700">
                      {pagination.page}
                    </strong>{" "}
                    de{" "}
                    <strong className="font-semibold text-slate-700">
                      {pagination.totalPages}
                    </strong>
                  </span>

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={
                      pagination.page >=
                      pagination.totalPages
                    }
                    className={[
                      "inline-flex min-h-10 items-center justify-center",
                      "rounded-lg border border-slate-300",
                      "bg-white px-4",
                      "text-sm font-semibold text-slate-700",
                      "transition",
                      "hover:border-slate-400 hover:bg-slate-50",
                      "disabled:cursor-not-allowed",
                      "disabled:opacity-40",
                      "focus:outline-none focus:ring-2",
                      "focus:ring-blue-500 focus:ring-offset-2",
                    ].join(" ")}
                  >
                    Próxima
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}