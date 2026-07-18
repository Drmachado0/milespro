import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AlertCircle, Check } from 'lucide-react';
import type { FieldValidation } from '@/hooks/useFormValidation';

interface ValidatedInputProps extends React.ComponentProps<'input'> {
  validation?: FieldValidation;
  onFieldBlur?: () => void;
  showSuccessState?: boolean;
  currencyPrefix?: string;
  currencySuffix?: string;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      validation,
      onFieldBlur,
      showSuccessState = true,
      currencyPrefix,
      currencySuffix,
      className,
      onBlur,
      ...props
    },
    ref
  ) => {
    const hasError = validation?.isTouched && !validation?.isValid;
    const isValidAndTouched = validation?.isTouched && validation?.isValid;

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onFieldBlur?.();
      onBlur?.(e);
    };

    const inputElement = (
      <Input
        ref={ref}
        className={cn(
          className,
          hasError && 'border-destructive focus-visible:ring-destructive pr-10',
          showSuccessState && isValidAndTouched && 'border-success focus-visible:ring-success pr-10'
        )}
        onBlur={handleBlur}
        {...props}
      />
    );

    // Adjust icon position based on prefix/suffix
    const hasPrefix = !!currencyPrefix;
    const hasSuffix = !!currencySuffix;

    return (
      <div className="space-y-1">
        <div className="relative">
          {hasPrefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {currencyPrefix}
            </span>
          )}
          <Input
            ref={ref}
            className={cn(
              hasPrefix && 'pl-10',
              hasSuffix && 'pr-10',
              hasError && 'border-destructive focus-visible:ring-destructive',
              showSuccessState && isValidAndTouched && 'border-success focus-visible:ring-success',
              (hasError || (showSuccessState && isValidAndTouched)) && !hasSuffix && 'pr-10',
              className
            )}
            onBlur={handleBlur}
            {...props}
          />
          {hasSuffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {currencySuffix}
            </span>
          )}
          {hasError && !hasSuffix && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
          {showSuccessState && isValidAndTouched && !hasSuffix && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
          )}
        </div>
        {hasError && validation?.error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validation.error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
