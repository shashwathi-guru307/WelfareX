interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
  className = '',
}: SelectFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
