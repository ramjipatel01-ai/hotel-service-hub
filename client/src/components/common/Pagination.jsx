import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 10,
  totalItems = 0,
  className = '',
}) {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`
        bg-white px-4 py-3 sm:px-6 rounded-2xl border border-slate-200/90 shadow-sm
        flex flex-col sm:flex-row items-center justify-between gap-3
        ${className}
      `}
      aria-label="Pagination"
    >
      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> results
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={ChevronLeft}
          aria-label="Previous Page"
        >
          Previous
        </Button>

        <div className="text-xs font-semibold px-2 text-slate-700">
          Page {currentPage} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon={ChevronRight}
          iconPosition="right"
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
