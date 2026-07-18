import { forwardRef } from 'react';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { cn } from '@/lib/utils';
import { AlertCircle, Check } from 'lucide-react';
import type { FieldValidation } from '@/hooks/useFormValidation';

interface ValidatedProgramSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  validation?: FieldValidation;
  onFieldBlur?: () => void;
  placeholder?: string;
  categories?: ('pontos' | 'bancos' | 'brasil' | 'americas' | 'europa' | 'asia' | 'hotels' | 'outros')[];
  disabled?: boolean;
  showSuccessState?: boolean;
}

export const ValidatedProgramSelect = forwardRef<HTMLDivElement, ValidatedProgramSelectProps>(
  (
    {
      value,
      onValueChange,
      validation,
      onFieldBlur,
      showSuccessState = true,
      ...props
    },
    ref
  ) => {
    const hasError = validation?.isTouched && !validation?.isValid;
    const isValidAndTouched = validation?.isTouched && validation?.isValid;

    const handleValueChange = (newValue: string) => {
      onValueChange(newValue);
      // Touch field when selection changes
      onFieldBlur?.();
    };

    return (
      <div ref={ref} className="space-y-1">
        <div className="relative">
          <div
            className={cn(
              'rounded-md',
              hasError && '[&>button]:border-destructive [&>button]:focus:ring-destructive',
              showSuccessState && isValidAndTouched && '[&>button]:border-success [&>button]:focus:ring-success'
            )}
          >
            <ProgramSelect
              value={value}
              onValueChange={handleValueChange}
              {...props}
            />
          </div>
          {/* Status indicator */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
            {showSuccessState && isValidAndTouched && <Check className="h-4 w-4 text-success" />}
          </div>
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

ValidatedProgramSelect.displayName = 'ValidatedProgramSelect';
