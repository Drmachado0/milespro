import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/hooks/useLocalization';
import { EmptyState } from '@/components/ui/empty-state';
import { Receipt } from 'lucide-react';

type DatabaseOperation = Database['public']['Tables']['operations']['Row'];

interface OperationsTableProps {
  operations: DatabaseOperation[];
  title?: string;
  showAll?: boolean;
}

const statusStyles: Record<string, string> = {
  confirmado: 'bg-success/10 text-success border-success/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  recebido: 'bg-info/10 text-info border-info/20',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const typeLabels: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  transferencia: 'Transferência',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
  compra_turbinada: 'Compra Turbinada',
  resgate: 'Resgate',
};

const typeStyles: Record<string, string> = {
  compra: 'bg-primary/10 text-primary',
  venda: 'bg-success/10 text-success',
  transferencia: 'bg-violet-500/10 text-violet-500',
  bumerangue: 'bg-warning/10 text-warning',
  entrada_manual: 'bg-info/10 text-info',
  compra_turbinada: 'bg-primary/10 text-primary',
  resgate: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

export function OperationsTable({ operations, title = 'Operações Recentes', showAll = false }: OperationsTableProps) {
  const displayOperations = showAll ? operations : operations.slice(0, 5);
  const { formatCurrency, formatNumber, formatDateShort } = useLocalization();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">$/mil</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOperations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      compact
                      icon={Receipt}
                      title="Nenhuma operação registrada"
                      description="As operações registradas aparecerão aqui."
                      className="border-0 bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                displayOperations.map((op) => (
                  <TableRow key={op.id} className="cursor-pointer">
                    <TableCell className="pl-6 font-mono font-medium tabular-nums">
                      {formatDateShort(op.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('font-medium', typeStyles[op.type])}>
                        {typeLabels[op.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgramLogo program={op.program} size="sm" />
                        <span className="font-medium">{op.program}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {op.holder_name ? (
                        op.holder_name
                      ) : (
                        <span className="italic text-muted-foreground/70">Sem titular</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatNumber(op.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {op.total_cost && op.total_cost > 0
                        ? formatCurrency(Number(op.total_cost))
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {op.cost_per_thousand && op.cost_per_thousand > 0
                        ? formatCurrency(Number(op.cost_per_thousand))
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge variant="outline" className={cn(statusStyles[op.status])}>
                        {statusLabels[op.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
