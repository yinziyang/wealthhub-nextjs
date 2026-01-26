'use client';

import React from 'react';

interface FormFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  active?: boolean;
  onClick?: () => void;
  onChange?: (value: string) => void;
  type?: 'numeric' | 'text';
  readOnly?: boolean;
  suffix?: string;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  placeholder,
  active = false,
  onClick,
  onChange,
  type = 'numeric',
  readOnly = false,
  suffix,
  className,
}) => {
  const inputClass = `
    w-full bg-slate-50 dark:bg-surface-dark border rounded-xl px-4 py-3 
    text-slate-900 dark:text-white font-mono transition-colors caret-primary
    ${active 
      ? 'border-primary ring-1 ring-primary' 
      : 'border-slate-200 dark:border-white/10'
    }
  `;

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode={type === 'numeric' ? 'none' : 'text'}
          readOnly={type === 'numeric' || readOnly}
          value={value}
          onClick={onClick}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={inputClass}
          placeholder={placeholder}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export default FormField;
