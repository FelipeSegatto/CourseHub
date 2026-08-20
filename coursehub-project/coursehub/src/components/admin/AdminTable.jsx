const ALIGN_CLASSES = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Cabeçalho compacto e denso: text-xs/semibold/uppercase discreto em
 * vez de text-sm sem padding horizontal (o que colava as colunas
 * umas nas outras). `column.align`/`column.headerClassName` são
 * opcionais e retrocompatíveis -- colunas existentes que só passam
 * {key, label} continuam funcionando exatamente como antes, só
 * herdam o novo espaçamento/tipografia do cabeçalho. O corpo da
 * tabela continua 100% controlado por `renderRow` de cada página
 * (não force uma API de célula que não bate com como as linhas já
 * são montadas).
 */
function AdminTable({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = "Nenhum registro encontrado.",
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[750px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                  ALIGN_CLASSES[column.align] || ALIGN_CLASSES.left
                } ${column.headerClassName || ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTable;