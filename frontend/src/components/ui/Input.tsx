import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span aria-hidden="true" className="text-negative ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={errorId}
            className={`
              w-full bg-surface-elevated/50 text-text-primary
              border border-border-default rounded-[var(--radius-md)]
              px-4 py-2.5 text-sm
              placeholder:text-text-muted
              focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-negative/60 focus:border-negative focus:ring-negative/30' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs text-negative" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
