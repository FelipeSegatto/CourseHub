export default function StudentTable({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = "Nenhum registro encontrado.",
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                className="pb-4 text-sm font-semibold text-gray-500"
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
                className="py-6 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => renderRow(item))
          )}
        </tbody>
      </table>
    </div>
  );
}