import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'program';
  align?: 'left' | 'center' | 'right';
}

interface ReportTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  emptyMessage?: string;
}

export function ReportTable({ columns, data, emptyMessage = 'Nenhum dado encontrado' }: ReportTableProps) {
  const { formatCurrency, formatNumber } = useLocalization();

  const formatValue = (value: unknown, type?: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'currency':
        return formatCurrency(Number(value));
      case 'number':
        return formatNumber(Number(value));
      default:
        return String(value);
    }
  };

  const getAlignment = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead key={col.key} className={getAlignment(col.align)}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <TableCell key={col.key} className={getAlignment(col.align)}>
                  {col.type === 'program' ? (
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={String(row[col.key])} size="sm" />
                      <span>{String(row[col.key])}</span>
                    </div>
                  ) : (
                    formatValue(row[col.key], col.type)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
