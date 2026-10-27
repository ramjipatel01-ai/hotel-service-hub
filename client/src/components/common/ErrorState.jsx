import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  retryText = 'Try Again',
  className = '',
}) {
  return (
    <div
      className={`
        bg-rose-50/50 rounded-2xl border border-rose-200 p-8 sm:p-10
        text-center flex flex-col items-center justify-center
        ${className}
      `}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-700 max-w-md mx-auto">{message}</p>

      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            icon={RefreshCw}
            className="border-rose-300 text-rose-800 hover:bg-rose-100/50"
          >
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
}
