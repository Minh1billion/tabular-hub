import { cn } from '@/shared/lib/cn'

interface DataTableProps {
  rows: Record<string, unknown>[]
  offset?: number
}

function renderCell(value: unknown) {
  if (value === null || value === undefined) return <span className="dt-null">null</span>
  if (typeof value === 'boolean') return <span className={cn('dt-bool', value && 't')}>{String(value)}</span>
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function DataTable({ rows, offset = 0 }: DataTableProps) {
  const columns = rows[0] ? Object.keys(rows[0]) : []

  return (
    <table className="dt">
      <thead>
        <tr>
          <th className="dt-idx">#</th>
          {columns.map((column) => (
            <th key={column} className={cn(typeof rows[0][column] === 'number' && 'dt-num')}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td className="dt-idx">{offset + index + 1}</td>
            {columns.map((column) => {
              const value = row[column]
              const text = value === null || value === undefined || typeof value === 'boolean' ? undefined : String(typeof value === 'object' ? JSON.stringify(value) : value)
              return (
                <td key={column} title={text} className={cn(typeof value === 'number' && 'dt-num')}>
                  {renderCell(value)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
