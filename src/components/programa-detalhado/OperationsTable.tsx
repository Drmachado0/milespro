import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Download, Filter, ArrowUpDown } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { cn } from '@/lib/utils';

interface Operation {
  id: string;
  date: string;
  type: string;
  quantity: number;
  totalCost: number;
  costPerThousand: number;
  origin: string;
  notes: string;
  holderName: string;
  status: string;
}

interface OperationsTableProps {
  operations: Operation[];
  marketPrice: number;
}

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  transferencia: 'Transferência',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
  compra_turbinada: 'Compra Turbinada',
  resgate: 'Resgate/Emissão',
};

const TYPE_STYLES: Record<string, string> = {
  compra: 'bg-success/10 text-success',
  venda: 'bg-destructive/10 text-destructive',
  transferencia: 'bg-primary/10 text-primary',
  bumerangue: 'bg-info/10 text-info',
  entrada_manual: 'bg-violet-500/10 text-violet-700',
  compra_turbinada: 'bg-info/10 text-info',
  resgate: 'bg-violet-500/10 text-violet-700',
};

type SortField = 'date' | 'type' | 'quantity' | 'totalCost' | 'costPerThousand';
type SortDirection = 'asc' | 'desc';

export function OperationsDetailTable({ operations, marketPrice }: OperationsTableProps) {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(Object.keys(TYPE_LABELS));
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort operations
  const filteredOperations = useMemo(() => {
    const result = operations.filter((op) => {
      const matchesType = selectedTypes.includes(op.type);
      const matchesSearch = searchTerm === '' || 
        op.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.holderName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'totalCost':
          comparison = a.totalCost - b.totalCost;
          break;
        case 'costPerThousand':
          comparison = a.costPerThousand - b.costPerThousand;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [operations, selectedTypes, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Quantidade', 'Custo Total', 'Custo/Milheiro', 'Valor Atual', 'Origem', 'Notas'];
    const rows = filteredOperations.map((op) => [
      formatDate(op.date),
      TYPE_LABELS[op.type] || op.type,
      op.quantity,
      op.totalCost,
      op.costPerThousand,
      ((op.quantity / 1000) * marketPrice).toFixed(2),
      op.origin,
      op.notes,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `operacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          'h-3 w-3',
          sortField === field ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Histórico de Operações</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 h-8"
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Tipos de Operação</p>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={value}
                      checked={selectedTypes.includes(value)}
                      onCheckedChange={() => handleTypeToggle(value)}
                    />
                    <Label htmlFor={value} className="text-sm">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOperations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma operação encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="date">Data</SortableHeader>
                  <SortableHeader field="type">Tipo</SortableHeader>
                  <SortableHeader field="quantity">Quantidade</SortableHeader>
                  <SortableHeader field="totalCost">Custo Total</SortableHeader>
                  <SortableHeader field="costPerThousand">R$/Mil</SortableHeader>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperations.slice(0, 50).map((op) => {
                  const currentValue = (op.quantity / 1000) * marketPrice;
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">
                        {formatDate(op.date)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          TYPE_STYLES[op.type] || 'bg-muted text-muted-foreground'
                        )}>
                          {TYPE_LABELS[op.type] || op.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(op.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(op.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {op.costPerThousand.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(currentValue)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {op.origin || '—'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                        {op.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredOperations.length > 50 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Mostrando 50 de {filteredOperations.length} operações
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
