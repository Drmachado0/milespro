import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useNavigate } from 'react-router-dom';

interface ProgramHeaderProps {
  program: string;
  lastUpdate?: string;
  onRefresh?: () => void;
}

export function ProgramHeader({ program, lastUpdate, onRefresh }: ProgramHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
          <ProgramLogo program={program} size="lg" className="w-16 h-16" />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.55)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Programa
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{program}</h1>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Última atualização: <span className="font-mono tabular-nums">{lastUpdate}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      )}
    </div>
  );
}
