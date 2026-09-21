import { useRef } from 'react';

interface DarkSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface DarkSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options?: DarkSelectOption[];
  placeholder?: string;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  stringOptions?: string[];
}

/**
 * DarkSelect — A native <select> element styled for dark mode.
 * Uses the browser's native dropdown which always renders on top,
 * never has z-index issues, and always responds to clicks.
 */
export default function DarkSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  label,
  name,
  required = false,
  disabled = false,
  error,
  className = '',
  stringOptions,
}: DarkSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  const allOptions: DarkSelectOption[] = stringOptions
    ? stringOptions.map(s => ({ value: s, label: s }))
    : (options || []);

  return (
    <div className={className}>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        ref={selectRef}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 text-sm rounded-lg border appearance-none
          bg-gray-50 dark:bg-[#0a1a1e] text-gray-900 dark:text-gray-100
          ${error
            ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400'
            : 'border-gray-200 dark:border-[#1a3a40] focus:ring-accent/30 focus:border-accent'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 transition-colors`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1rem',
        }}
      >
        {/* Placeholder option */}
        <option value="" disabled>
          — {placeholder} —
        </option>
        {allOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
