import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'h-10 rounded-sm border px-3 text-base bg-white transition-colors',
            'border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20',
            error && 'border-error bg-error-bg',
            disabled && 'bg-gray-100 text-text-muted cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} role="alert" className="text-xs text-error">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
