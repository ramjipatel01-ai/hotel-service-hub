import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    id,
    name,
    value,
    onChange,
    placeholder,
    error,
    helperText,
    rows = 3,
    disabled = false,
    required = false,
    className = '',
    textareaClassName = '',
    ...rest
  },
  ref
) {
  const textareaId = id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            block w-full rounded-lg text-sm text-slate-900 bg-white
            border transition-all px-3.5 py-2.5 resize-y
            ${
              error
                ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-300 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20'
            }
            ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
            focus:outline-none focus:ring-2
            ${textareaClassName}
          `}
          {...rest}
        />
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-rose-600 flex items-center">
          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1 text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;
