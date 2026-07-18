import { Card, CardContent } from '@/components/ui/card';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ProgramBalance } from '@/hooks/useProgramBalances';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
import { ChevronRight } from 'lucide-react';

interface ProgramCardProps {
  program: ProgramBalance;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const navigate = useNavigate();
  const { formatCurrency, formatNumber } = useLocalization();
  
  // Estimate value (assuming R$20/mil average market price)
  const estimatedValue = program.balance * 0.02;

  const handleClick = () => {
    navigate(`/programa/${encodeURIComponent(program.program)}`);
  };

  return (
    <Card 
      className="relative overflow-hidden group card-hover cursor-pointer"
      onClick={handleClick}
    >
      {/* Accent bar on top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-4">
        {/* Header with logo, name and chevron */}
        <div className="flex items-center gap-3 mb-3">
          <ProgramLogo program={program.program} size="lg" />
          <span className="font-semibold text-foreground text-lg flex-1">{program.program}</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Miles count */}
        <div className="mb-3">
          <p className="font-mono text-2xl font-bold text-foreground tabular-nums tracking-tight">
            {formatNumber(program.balance)}
          </p>
          <p className="text-xs text-muted-foreground">milhas</p>
        </div>
        
        {/* Stats section with separator */}
        <div className="space-y-2 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor estimado</span>
            <span className="font-medium text-success dark:text-success tabular-nums">
              {formatCurrency(estimatedValue)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Custo médio</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(program.averageCost)}/mil
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Operações</span>
            <span className="tabular-nums">{program.operationsCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
