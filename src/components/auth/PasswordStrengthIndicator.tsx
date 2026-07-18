import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: '8+ caracteres', test: (p) => p.length >= 8 },
  { label: 'Maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Número', test: (p) => /[0-9]/.test(p) },
  { label: 'Símbolo', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const passedCount = requirements.filter((req) => req.test(password)).length;
  const strengthPercent = (passedCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercent <= 20) return 'bg-destructive';
    if (strengthPercent <= 40) return 'bg-primary';
    if (strengthPercent <= 60) return 'bg-warning';
    if (strengthPercent <= 80) return 'bg-lime-500';
    return 'bg-success';
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', getStrengthColor())}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>

      {/* Requirements grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <div
              key={req.label}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                passed ? 'text-success dark:text-success' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
