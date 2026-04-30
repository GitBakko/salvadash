import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-surface-base hover:bg-brand-hover active:scale-[0.97] glow-brand',
  secondary:
    'bg-surface-elevated text-text-primary border border-border-default hover:border-brand/40',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50',
  danger: 'bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-sm',
  md: 'px-4 py-2.5 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2
          active:scale-[0.97]
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:active:scale-100
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
