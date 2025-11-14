import React from 'react';

const cellClass = 'px-4 py-3 text-sm text-gray-700 whitespace-nowrap';
const headerClass =
  'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left';

export default function DataTable({
  columns,
  data = [],
  rowKey = '_id',
  loading = false,
  emptyMessage = 'No records found.',
  rowActions,
  onRowClick,
  className = '',
}) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${headerClass} ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {rowActions && (
                <th className={`${headerClass} text-right`}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <LoadingRows columnCount={columns.length + (rowActions ? 1 : 0)} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key =
                  typeof rowKey === 'function'
                    ? rowKey(row, index)
                    : row[rowKey] || index;

                const isClickable = typeof onRowClick === 'function';

                return (
                  <tr
                    key={key}
                    className={isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''}
                    onClick={
                      isClickable
                        ? () => {
                            onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {columns.map((column) => {
                      const value = column.render
                        ? column.render(row, index)
                        : column.accessor
                        ? column.accessor(row)
                        : row[column.key];

                      return (
                        <td
                          key={column.key}
                          className={`${cellClass} ${column.className || ''}`}
                        >
                          {value}
                        </td>
                      );
                    })}
                    {rowActions && (
                      <td className="px-4 py-3 text-right text-sm">
                        {rowActions(row, index)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingRows({ columnCount }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIdx) => (
        <tr key={`loading-${rowIdx}`} className="animate-pulse">
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
