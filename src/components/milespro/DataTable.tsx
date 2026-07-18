import { ReactNode, useMemo, useState } from 'react';
import { Search, ArrowUp, ArrowDown, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: ReactNode;
  /** Right-aligned numeric column (mono + tabular-nums). */
  numeric?: boolean;
  /** Sortable header. */
  sortable?: boolean;
  /** Custom cell renderer. Falls back to row[column.key]. */
  render?: (row: T, index: number) => ReactNode;
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  title?: string;
  countLabel?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  toolbarRight?: ReactNode;
  pageSize?: number;
  emptyState?: ReactNode;
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export function DataTable<T extends Record<string, unknown>>({
  title,
  countLabel,
  columns,
  rows,
  rowKey,
  searchPlaceholder = 'Buscar…',
  onSearch,
  toolbarRight,
  pageSize = 10,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return rows;
    const out = [...rows].sort((a, b) => {
      const av = a[sort.key as keyof T];
      const bv = b[sort.key as keyof T];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av;
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv), 'pt-BR')
        : String(bv).localeCompare(String(av), 'pt-BR');
    });
    return out;
  }, [rows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-[hsl(var(--mp-surface-1))] shadow-raised',
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-border bg-gradient-to-b from-white/[0.025] to-transparent px-5 py-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          {title && <span className="font-display text-base font-semibold tracking-tight text-foreground">{title}</span>}
          {countLabel && (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground">
              {countLabel}
            </span>
          )}
        </div>

        <div className="flex w-full items-center gap-2.5 md:w-auto">
          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                onSearch?.(e.target.value);
              }}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-[7px] border border-border bg-[hsl(var(--mp-surface-2))] pl-8 pr-3 font-sans text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {toolbarRight}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-sans">
          <thead>
            <tr>
              {columns.map((col) => {
                const key = String(col.key);
                const isSorted = sort?.key === key;
                return (
                  <th
                    key={key}
                    onClick={col.sortable ? () => toggleSort(key) : undefined}
                    className={cn(
                      'sticky top-0 select-none border-b border-border bg-[hsl(var(--mp-surface-1))] px-4 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors',
                      col.numeric && 'text-right',
                      col.sortable && 'cursor-pointer hover:text-foreground/80',
                      isSorted && 'text-primary',
                      col.className,
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && isSorted && (sort?.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-sm text-muted-foreground">
                  {emptyState ?? 'Nenhum registro encontrado.'}
                </td>
              </tr>
            )}
            {pageRows.map((row, idx) => (
              <tr
                key={rowKey(row, idx)}
                className="group transition-colors odd:bg-white/[0.012] hover:bg-primary/[0.04]"
              >
                {columns.map((col) => {
                  const key = String(col.key);
                  const value = col.render ? col.render(row, idx) : (row[key as keyof T] as ReactNode);
                  return (
                    <td
                      key={key}
                      className={cn(
                        'h-[52px] border-b border-border/60 px-4 align-middle text-[13px] text-foreground',
                        col.numeric && 'text-right font-mono tabular-nums',
                        col.className,
                      )}
                    >
                      {value as ReactNode}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / paginator */}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-border bg-white/[0.012] px-5 py-3">
          <span className="font-mono text-[11.5px] tracking-wider text-muted-foreground">
            <b className="font-semibold text-foreground/80">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}
            </b>{' '}
            de <b className="font-semibold text-foreground/80">{sorted.length}</b>
          </span>
          <div className="flex items-center gap-1">
            <PagerButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Anterior">
              <ChevronLeft className="h-3.5 w-3.5" />
            </PagerButton>
            {pagerNumbers(safePage, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`s${i}`} className="px-1 font-mono text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <PagerButton key={n} active={n === safePage} onClick={() => setPage(Number(n))}>
                  {n}
                </PagerButton>
              ),
            )}
            <PagerButton onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Próxima">
              <ChevronRight className="h-3.5 w-3.5" />
            </PagerButton>
          </div>
        </div>
      )}
    </section>
  );
}

function PagerButton({
  children,
  active,
  ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-transparent px-2 font-mono text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        active && 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

function pagerNumbers(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (page >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

export { MoreHorizontal as DataTableActionIcon };
