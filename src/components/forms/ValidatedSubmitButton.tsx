import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';

interface ValidatedSubmitButtonProps {
  isFormValid: boolean;
  isLoading?: boolean;
  invalidFieldsLabels: string[];
  onDisabledClick?: () => void;
  children?: React.ReactNode;
  validLabel?: string;
  invalidLabel?: string;
}

export function ValidatedSubmitButton({
  isFormValid,
  isLoading = false,
  invalidFieldsLabels,
  onDisabledClick,
  children,
  validLabel = 'REGISTRAR',
  invalidLabel,
}: ValidatedSubmitButtonProps) {
  // Default the disabled-state label to the same text as the active one so
  // the button reads as the action ("Salvar") rather than an angry imperative
  // ("PREENCHA OS DADOS!"). The tooltip already enumerates the missing
  // fields, so the loud copy was redundant + abrasive. sas.txt P1 / Bug 13.
  const disabledLabel = invalidLabel ?? validLabel;
  const isDisabled = isLoading || !isFormValid;

  const tooltipContent = invalidFieldsLabels.length > 0
    ? `Preencha os campos obrigatórios: ${invalidFieldsLabels.join(', ')}`
    : '';

  const buttonContent = (
    <>
      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children || (isFormValid ? validLabel : disabledLabel)}
    </>
  );

  if (!isDisabled) {
    return (
      <Button type="submit">
        {buttonContent}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-block"
            onClick={(e) => {
              e.preventDefault();
              onDisabledClick?.();
            }}
          >
            <Button
              type="button"
              disabled
              className="pointer-events-none"
            >
              {buttonContent}
            </Button>
          </div>
        </TooltipTrigger>
        {tooltipContent && (
          <TooltipContent side="top" className="max-w-xs">
            <p>{tooltipContent}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
