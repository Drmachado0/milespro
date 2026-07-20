import { memo, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/hooks/useLocalization';
import { ChevronLeft, ChevronRight, Calendar, Coins, User, Receipt, History } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

type DatabaseOperation = Database['public']['Tables']['operations']['Row'];

interface OperationsTableProps {
  operations: DatabaseOperation[];
  title?: string;
  showAll?: boolean;
  pageSize?: number;
}

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;
const ESTIMATED_ROW_HEIGHT = 60;
const VIRTUAL_CONTAINER_HEIGHT = 480; // 8 rows visible

// Moved outside component to avoid recreation on each render
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
  compra: 'bg-primary/10 text-primary border-primary/20',
  venda: 'bg-success/10 text-success border-success/20',
  transferencia: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  bumerangue: 'bg-warning/10 text-warning border-warning/20',
  entrada_manual: 'bg-info/10 text-info border-info/20',
  compra_turbinada: 'bg-primary/10 text-primary border-primary/20',
  resgate: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

// Mobile card component for each operation
const OperationCard = memo(function OperationCard({ 
  op, 
  formatCurrency, 
  formatNumber, 
  formatDateShort
}: { 
  op: DatabaseOperation;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDateShort: (date: string) => string;
}) {
  return (
    <article className="border-b border-white/[0.06] p-4 transition-colors last:border-b-0 hover:bg-white/[0.025]">
      {/* Header: Date, Type, Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateShort(op.date)}
          </span>
          <Badge variant="secondary" className={cn('font-medium text-[10px] h-5', typeStyles[op.type])}>
            {typeLabels[op.type]}
          </Badge>
        </div>
        <Badge variant="outline" className={cn('text-[10px] h-5', statusStyles[op.status])}>
          {statusLabels[op.status]}
        </Badge>
      </div>
      
      {/* Program and holder */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-muted/50">
          <ProgramLogo program={op.program} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{op.program}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <User className="h-2.5 w-2.5 flex-shrink-0" />
            {op.holder_name || <span className="italic text-muted-foreground/70">Sem titular</span>}
          </p>
        </div>
      </div>
      
      {/* Values row */}
      <div className="grid grid-cols-3 gap-2 text-center bg-muted/20 rounded-lg p-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Quantidade</p>
          <p className="text-sm font-mono font-bold tabular-nums tracking-tight text-foreground">{formatNumber(op.quantity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Custo</p>
          <p className="text-sm font-mono font-semibold tabular-nums tracking-tight text-foreground">
            {op.total_cost && op.total_cost > 0 ? formatCurrency(Number(op.total_cost)) : '-'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">$/mil</p>
          <p className={cn(
            'text-sm font-mono font-semibold tabular-nums tracking-tight',
            op.cost_per_thousand && op.cost_per_thousand > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {op.cost_per_thousand && op.cost_per_thousand > 0
              ? formatCurrency(Number(op.cost_per_thousand))
              : '-'
            }
          </p>
        </div>
      </div>
    </article>
  );
});

// Desktop table row component
const OperationRow = memo(function OperationRow({ 
  op, 
  formatCurrency, 
  formatNumber, 
  formatDateShort,
  index,
  style
}: { 
  op: DatabaseOperation;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDateShort: (date: string) => string;
  index: number;
  style?: React.CSSProperties;
}) {
  return (
    <TableRow 
      className={cn(
        'transition-colors duration-200',
        'hover:bg-white/[0.025]',
        index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'
      )}
      style={style}
    >
      <TableCell className="pl-4 lg:pl-6 font-medium">
        <span className="flex items-center gap-2 text-muted-foreground text-xs lg:text-sm font-mono tabular-nums">
          <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5 hidden sm:block" />
          {formatDateShort(op.date)}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('font-medium text-[10px] lg:text-xs', typeStyles[op.type])}>
          {typeLabels[op.type]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <ProgramLogo program={op.program} size="sm" />
          <span className="font-medium text-foreground text-xs lg:text-sm hidden md:inline">{op.program}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground hidden lg:table-cell">
        <span className="flex items-center gap-1.5 text-xs">
          <User className="h-3 w-3" />
          {op.holder_name || <span className="italic text-muted-foreground/70">Sem titular</span>}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono font-semibold text-foreground text-xs lg:text-sm tabular-nums tracking-tight">
          {formatNumber(op.quantity)}
        </span>
      </TableCell>
      <TableCell className="text-right text-muted-foreground text-xs lg:text-sm hidden sm:table-cell font-mono tabular-nums tracking-tight">
        {op.total_cost && op.total_cost > 0
          ? formatCurrency(Number(op.total_cost))
          : '-'
        }
      </TableCell>
      <TableCell className="text-right hidden md:table-cell">
        <span className={cn(
          'font-mono font-medium text-xs lg:text-sm tabular-nums tracking-tight',
          op.cost_per_thousand && op.cost_per_thousand > 0 ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {op.cost_per_thousand && op.cost_per_thousand > 0
            ? formatCurrency(Number(op.cost_per_thousand))
            : '-'
          }
        </span>
      </TableCell>
      <TableCell className="pr-4 lg:pr-6">
        <Badge variant="outline" className={cn('text-[10px] lg:text-xs', statusStyles[op.status])}>
          {statusLabels[op.status]}
        </Badge>
      </TableCell>
    </TableRow>
  );
});

// Virtualized table body component
function VirtualizedTableBody({
  operations,
  formatCurrency,
  formatNumber,
  formatDateShort
}: {
  operations: DatabaseOperation[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDateShort: (date: string) => string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: operations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div 
      ref={parentRef}
      className="overflow-auto"
      style={{ height: VIRTUAL_CONTAINER_HEIGHT }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="hover:bg-transparent bg-muted/20">
            <TableHead className="pl-4 lg:pl-6 font-semibold text-xs lg:text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Data
              </span>
            </TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm">
              <span className="flex items-center gap-1.5">
                <Receipt className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Tipo
              </span>
            </TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm">Programa</TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm hidden lg:table-cell">
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Titular
              </span>
            </TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm">
              <span className="flex items-center justify-end gap-1.5">
                <Coins className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Qtd
              </span>
            </TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm hidden sm:table-cell">Custo</TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm hidden md:table-cell">$/mil</TableHead>
            <TableHead className="pr-4 lg:pr-6 font-semibold text-xs lg:text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: rowVirtualizer.getTotalSize() }}>
            <td colSpan={8} style={{ padding: 0, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const op = operations[virtualRow.index];
                return (
                  <div
                    key={op.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <table className="w-full table-fixed">
                      <tbody>
                        <OperationRow
                          op={op}
                          formatCurrency={formatCurrency}
                          formatNumber={formatNumber}
                          formatDateShort={formatDateShort}
                          index={virtualRow.index}
                        />
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  );
}

// Standard (non-virtualized) table body
function StandardTableBody({
  operations,
  formatCurrency,
  formatNumber,
  formatDateShort
}: {
  operations: DatabaseOperation[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDateShort: (date: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/20">
            <TableHead className="pl-4 lg:pl-6 font-semibold text-xs lg:text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Data
              </span>
            </TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm">
              <span className="flex items-center gap-1.5">
                <Receipt className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Tipo
              </span>
            </TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm">Programa</TableHead>
            <TableHead className="font-semibold text-xs lg:text-sm hidden lg:table-cell">
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Titular
              </span>
            </TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm">
              <span className="flex items-center justify-end gap-1.5">
                <Coins className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                Qtd
              </span>
            </TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm hidden sm:table-cell">Custo</TableHead>
            <TableHead className="text-right font-semibold text-xs lg:text-sm hidden md:table-cell">$/mil</TableHead>
            <TableHead className="pr-4 lg:pr-6 font-semibold text-xs lg:text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.length === 0 ? (
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
            operations.map((op, index) => (
              <OperationRow 
                key={op.id}
                op={op}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatDateShort={formatDateShort}
                index={index}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function OperationsTableBase({ 
  operations, 
  title = 'Operações Recentes', 
  showAll = false,
  pageSize = 10
}: OperationsTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const { formatCurrency, formatNumber, formatDateShort } = useLocalization();

  // Determine if virtualization should be used
  const useVirtualization = operations.length >= VIRTUALIZATION_THRESHOLD;

  // Calculate pagination (only used when not virtualizing)
  const totalPages = useMemo(() => 
    showAll && !useVirtualization ? Math.ceil(operations.length / pageSize) : 1,
    [operations.length, pageSize, showAll, useVirtualization]
  );

  const displayOperations = useMemo(() => {
    // When virtualizing, show all operations
    if (useVirtualization) return operations;
    if (!showAll) return operations.slice(0, 5);
    const start = currentPage * pageSize;
    return operations.slice(start, start + pageSize);
  }, [operations, showAll, currentPage, pageSize, useVirtualization]);

  // Summary stats
  const stats = useMemo(() => {
    const totalQty = operations.reduce((sum, op) => sum + (op.quantity || 0), 0);
    const totalCost = operations.reduce((sum, op) => sum + (op.total_cost || 0), 0);
    return {
      count: operations.length,
      totalQty,
      totalCost,
    };
  }, [operations]);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <Card className="overflow-hidden border-white/[0.07] bg-[hsl(var(--mp-surface-2))] shadow-flat">
      <CardHeader className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">{title}</span>
            {operations.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1 hidden sm:inline-flex">
                {operations.length} ops
              </Badge>
            )}
          </CardTitle>
          {showAll && totalPages > 1 && !useVirtualization && (
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <span className="font-medium text-xs sm:text-sm">
                {currentPage + 1}/{totalPages}
              </span>
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          )}
        </div>
        {/* Summary stats bar */}
        {operations.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              <span className="font-mono font-medium tabular-nums text-foreground">{operations.length}</span> operações
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span className="font-mono font-medium tabular-nums text-foreground">{formatNumber(stats.totalQty)}</span> milhas totais
            </span>
            <span className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              <span className="font-mono font-medium tabular-nums text-foreground">{formatCurrency(stats.totalCost)}</span> custo total
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Card layout (no virtualization for simplicity) */}
        <div className="block sm:hidden">
          {displayOperations.length === 0 ? (
            <EmptyState
              compact
              icon={Receipt}
              title="Nenhuma operação registrada"
              description="As operações registradas aparecerão aqui."
              className="border-0 bg-transparent mx-4"
            />
          ) : (
            <div className={useVirtualization ? 'max-h-96 overflow-y-auto' : ''}>
              {displayOperations.map((op) => (
                <OperationCard 
                  key={op.id}
                  op={op}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                  formatDateShort={formatDateShort}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop/Tablet: Table layout with conditional virtualization */}
        <div className="hidden sm:block">
          {useVirtualization ? (
            <VirtualizedTableBody
              operations={displayOperations}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              formatDateShort={formatDateShort}
            />
          ) : (
            <StandardTableBody
              operations={displayOperations}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              formatDateShort={formatDateShort}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const OperationsTableMemo = memo(OperationsTableBase);
