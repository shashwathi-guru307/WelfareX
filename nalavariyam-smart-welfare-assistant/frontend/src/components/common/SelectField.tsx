import DarkSelect from './DarkSelect';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  className = '',
  name,
  disabled = false,
  required = false,
  error,
}: SelectFieldProps) {
  // Detect if options are plain strings or objects with value/label
  const isStringArray = options.length > 0 && typeof options[0] === 'string';

  if (isStringArray) {
    return (
      <DarkSelect
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        stringOptions={options as string[]}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={error}
        className={className}
      />
    );
  }

  return (
    <DarkSelect
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      options={options as SelectOption[]}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      error={error}
      className={className}
    />
  );
}
