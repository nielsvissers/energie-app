import React from 'react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value?: Date | string | null;
  onChange?: (date: Date | null, dateString: string) => void;
  error?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error,
  name,
  required = false,
  className = '',
  ...restProps
}) => {
  // Converteer Date object naar 'YYYY-MM-DD' string voor de HTML input
  const getStringValue = (): string => {
    if (!value) return '';
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return value.toISOString().split('T')[0];
    }
    return value; // Als het al een string is
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strVal = e.target.value;
    if (!onChange) return;

    if (!strVal) {
      onChange(null, '');
    } else {
      const parsedDate = new Date(strVal);
      onChange(isNaN(parsedDate.getTime()) ? null : parsedDate, strVal);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs text-slate-400 mb-1">
        {label}
        {required && <span className="text-emerald-500 ml-0.5">*</span>}
      </label>
      <input
        {...restProps}
        type="date"
        name={name}
        required={required}
        value={getStringValue()}
        onChange={handleChange}
        className={`w-full bg-slate-950 border rounded p-2 text-sm text-white focus:border-emerald-500 outline-none ${
          error ? 'border-red-500' : 'border-slate-700'
        } ${className}`}
      />
      {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
    </div>
  );
};