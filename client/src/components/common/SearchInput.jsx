import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  id = 'search-input',
  ...rest
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative rounded-xl shadow-sm w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          block w-full rounded-xl text-sm text-slate-900 bg-white
          border border-slate-300 pl-10 pr-9 py-2
          placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
          focus:outline-none transition-all
        "
        {...rest}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
