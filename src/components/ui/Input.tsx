import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  helperText?: string;
  className?: string;
  type?: string;
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function Input({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  type = 'text',
  value,
  onChange,
  required,
  placeholder,
  disabled,
  ...props
}: InputProps) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-xs font-bold text-slate-300 block">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl bg-slate-900 border text-slate-100 placeholder-slate-500 text-xs font-medium py-2.5 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-rose-500/60 focus:border-rose-500'
              : 'border-slate-800 focus:border-indigo-500'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-rose-400 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
