interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

export default function DataTable<T extends { id: string }>({ columns, rows, emptyText }: { columns: Column<T>[]; rows: T[]; emptyText?: string }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c, i) => (
              <td key={i}>{c.render(row)}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="text-center text-gray-400 py-4">
              {emptyText ?? "لا توجد بيانات"}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
