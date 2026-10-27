import React from 'react';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

export default function ResponsiveTable({
  columns = [],
  data = [],
  keyExtractor = (item, index) => item._id || item.id || index,
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display.',
  emptyAction,
  striped = false,
  className = '',
  onRowClick,
}) {
  if (isLoading) {
    return <SkeletonLoader type="table" count={5} className={className} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div
      className={`
        bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden
        ${className}
      `}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-bold text-slate-700 tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  className={`px-5 py-3.5 ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIdx) => {
              const key = keyExtractor(row, rowIdx);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`
                    transition-colors
                    ${striped && rowIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}
                    ${onRowClick ? 'hover:bg-slate-50/80 cursor-pointer' : 'hover:bg-slate-50/50'}
                  `}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-5 py-4 whitespace-nowrap text-xs sm:text-sm ${
                        col.cellClassName || ''
                      }`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
