const EVENT_TYPE_LABELS = {
  contract_created: "Contrato criado",
  invoice_created: "Fatura criada",
  due_date_changed: "Vencimento alterado",
  amount_changed: "Valor alterado",
  payment_registered: "Pagamento registrado",
  manual_payment_registered:
    "Pagamento manual registrado",
  invoice_cancelled: "Fatura cancelada",
  payment_refunded: "Pagamento reembolsado",
  contract_completed: "Contrato concluído",
  contract_cancelled: "Contrato cancelado",
  status_changed: "Status alterado",
};

const SOURCE_LABELS = {
  system: "Sistema",
  admin: "Administrador",
  gateway: "Gateway",
  student: "Aluno",
};

function formatDateTime(value) {
  if (!value) {
    return "Data não informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatEventType(eventType) {
  if (!eventType) {
    return "Evento financeiro";
  }

  return (
    EVENT_TYPE_LABELS[eventType] ||
    eventType
      .replaceAll("_", " ")
      .replace(/^\w/, (letter) =>
        letter.toUpperCase()
      )
  );
}

function formatSource(source) {
  return SOURCE_LABELS[source] || source || "Origem desconhecida";
}

function formatPrimitiveValue(value) {
  if (value === null || value === undefined) {
    return "Não informado";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value);
}

function ValueBlock({ title, value }) {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return (
      <div className="rounded-lg bg-slate-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>

        <p className="mt-1 break-words text-sm text-slate-700">
          {formatPrimitiveValue(value)}
        </p>
      </div>
    );
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </span>

      <dl className="mt-2 space-y-2">
        {entries.map(([key, entryValue]) => (
          <div
            key={key}
            className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4"
          >
            <dt className="text-xs font-medium text-slate-500">
              {key.replaceAll("_", " ")}
            </dt>

            <dd className="break-words text-sm text-slate-700 sm:text-right">
              {formatPrimitiveValue(entryValue)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyTimelineState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-500">
        ↻
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        Nenhum evento registrado
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        As alterações e operações realizadas neste contrato
        aparecerão aqui.
      </p>
    </div>
  );
}

export default function FinancialEventsTimeline({
  events = [],
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return <EmptyTimelineState />;
  }

  return (
    <ol className="divide-y divide-slate-100">
      {events.map((event, index) => (
        <li
          key={event.id ?? `${event.eventType}-${index}`}
          className="relative px-5 py-5"
        >
          <div className="flex gap-4">
            <div className="relative flex shrink-0 flex-col items-center">
              <span className="mt-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />

              {index < events.length - 1 && (
                <span className="absolute top-5 h-[calc(100%+24px)] w-px bg-slate-200" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {formatEventType(
                      event.eventType ??
                        event.event_type
                    )}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatSource(event.source)}
                    {event.actorUserId ||
                    event.actor_user_id
                      ? ` · Usuário #${
                          event.actorUserId ??
                          event.actor_user_id
                        }`
                      : ""}
                  </p>
                </div>

                <time className="whitespace-nowrap text-xs text-slate-500">
                  {formatDateTime(
                    event.createdAt ??
                      event.created_at
                  )}
                </time>
              </div>

              {event.reason && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-500">
                    Motivo
                  </span>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {event.reason}
                  </p>
                </div>
              )}

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <ValueBlock
                  title="Valor anterior"
                  value={
                    event.previousValue ??
                    event.previous_value
                  }
                />

                <ValueBlock
                  title="Novo valor"
                  value={
                    event.newValue ??
                    event.new_value
                  }
                />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}