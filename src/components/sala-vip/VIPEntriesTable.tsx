import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Download, Search, Trash2, AlertTriangle, X, Crown } from 'lucide-react';
import { useVIPEntries, useDeleteVIPEntry, VIPFilters, useVIPLocations } from '@/hooks/useVIPEntries';
import { useVIPCardsWithQuota } from '@/hooks/useVIPCounters';
import { cn } from '@/lib/utils';
import { startOfYear } from 'date-fns';

const ITEMS_PER_PAGE = 20;

export function VIPEntriesTable() {
  // Default filter is year-to-date so the list reflects the same scope as the
  // "Entradas Este Ano" KPI above. Previously the default was last-30-days,
  // which left the user staring at "0 registros" while the KPI claimed 3
  // entries existed (sas.txt Bug 10 / P1).
  const [filters, setFilters] = useState<VIPFilters>({
    startDate: startOfYear(new Date()),
    endDate: new Date(),
  });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: entries, isLoading } = useVIPEntries({
    ...filters,
    search: search || undefined,
  });
  const { data: cards } = useVIPCardsWithQuota();
  const { data: locations } = useVIPLocations();
  const deleteMutation = useDeleteVIPEntry();

  // Pagination
  const totalPages = Math.ceil((entries?.length || 0) / ITEMS_PER_PAGE);
  const paginatedEntries = entries?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) return;

    const headers = ['Data/Hora', 'Pessoa', 'Vínculo', 'Local', 'Cartão', 'Observação'];
    const rows = entries.map(entry => [
      format(new Date(entry.access_date), 'dd/MM/yyyy HH:mm'),
      entry.person_name,
      entry.relationship === 'titular' ? 'Titular' : 'Convidado',
      entry.location,
      `${entry.credit_cards?.card_name} (**** ${entry.credit_cards?.last_four_digits || '0000'})`,
      entry.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entradas-vip-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setFilters({
      startDate: startOfYear(new Date()),
      endDate: new Date(),
    });
    setSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.cardId || filters.location || filters.relationship || search;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.cardId || 'all'}
          onValueChange={(value) => setFilters(f => ({ ...f, cardId: value === 'all' ? undefined : value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os cartões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cartões</SelectItem>
            {cards?.map((card) => (
              <SelectItem key={card.id} value={card.id}>
                {card.card_name} (**** {card.last_four_digits || '0000'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {filters.startDate && filters.endDate ? (
                <>
                  {format(filters.startDate, 'dd/MM')} - {format(filters.endDate, 'dd/MM')}
                </>
              ) : (
                'Período'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: filters.startDate,
                to: filters.endDate,
              }}
              onSelect={(range) => {
                setFilters(f => ({
                  ...f,
                  startDate: range?.from,
                  endDate: range?.to,
                }));
              }}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={filters.location || 'all'}
          onValueChange={(value) => setFilters(f => ({ ...f, location: value === 'all' ? undefined : value }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os locais</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.relationship || 'all'}
          onValueChange={(value) => setFilters(f => ({ ...f, relationship: value === 'all' ? undefined : value as 'titular' | 'convidado' }))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Vínculo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="titular">Titular</SelectItem>
            <SelectItem value="convidado">Convidado</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Limpar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}

        <Button variant="outline" onClick={handleExportCSV} disabled={!entries?.length}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {entries?.length || 0} registro(s) encontrado(s)
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead className="text-center">Vínculo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !paginatedEntries || paginatedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Crown className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhuma entrada registrada</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">Cadastre a primeira entrada neste cartão</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(entry.access_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.person_name}
                      {entry.override && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.relationship === 'titular' ? 'default' : 'secondary'}>
                      {entry.relationship === 'titular' ? 'Titular' : 'Convidado'}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.location}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{entry.credit_cards?.card_name}</p>
                      <p className="text-muted-foreground text-xs">
                        **** {entry.credit_cards?.last_four_digits || '0000'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        title="Excluir Entrada"
        description="Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
