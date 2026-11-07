import React, { useState, useEffect } from 'react';

interface DecimalInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number) => void;
  onBlur: (value: number) => void;
  step?: string;
  placeholder?: string;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  step = '0.000001',
  placeholder = '0.0000',
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== null && value !== undefined ? String(value) : ''
  );

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue('');
    } else {
      const parsedDisplay = parseFloat(displayValue.replace(',', '.'));
      if (isNaN(parsedDisplay) || parsedDisplay !== value) {
        setDisplayValue(String(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Sta enkel cijfers, minteken en 1 komma of punt toe
    if (!/^-?\d*[,.]?\d*$/.test(inputValue)) return;

    setDisplayValue(inputValue);

    const parsed = parseFloat(inputValue.replace(',', '.'));
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayValue('');
    } else {
      setDisplayValue(String(value));
    }
    
    const parsed = parseFloat(inputValue.replace(',', '.'));
    onBlur(isNaN(parsed) ? 0 : parsed)
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        step={step}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
      />
    </div>
    
  );
};