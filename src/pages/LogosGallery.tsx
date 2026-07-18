import { useMemo, useState } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Auto-import all logos from assets folders
const programModules = import.meta.glob('@/assets/programs/*.{png,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const bankModules = import.meta.glob('@/assets/banks/*.{png,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

type LogoEntry = { name: string; src: string; ext: string };

function buildEntries(modules: Record<string, string>): LogoEntry[] {
  const map = new Map<string, LogoEntry>();
  Object.entries(modules).forEach(([path, src]) => {
    const file = path.split('/').pop() ?? path;
    const dot = file.lastIndexOf('.');
    const name = file.slice(0, dot);
    const ext = file.slice(dot + 1);
    // Prefer SVG when both exist
    const existing = map.get(name);
    if (!existing || (existing.ext !== 'svg' && ext === 'svg')) {
      map.set(name, { name, src, ext });
    }
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const SIZES = [
  { key: 'xs', label: 'XS · 24', px: 24 },
  { key: 'sm', label: 'SM · 32', px: 32 },
  { key: 'md', label: 'MD · 48', px: 48 },
  { key: 'lg', label: 'LG · 64', px: 64 },
  { key: 'xl', label: 'XL · 96', px: 96 },
] as const;

function LogoCard({ entry, theme }: { entry: LogoEntry; theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
        isDark ? 'border-border bg-card text-foreground' : 'border-border bg-card text-foreground',
      )}
    >
      <div className="flex items-end justify-between gap-2">
        {SIZES.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-1.5">
            <div
              className="grid place-items-center overflow-hidden rounded-lg border border-border bg-muted/40"
              style={{ width: s.px, height: s.px }}
            >
              <img
                src={entry.src}
                alt={entry.name}
                style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
                loading="lazy"
              />
            </div>
            <span className="font-mono tabular-nums text-[9px] uppercase tracking-wider text-muted-foreground">
              {s.px}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className="truncate text-sm font-semibold">{entry.name}</span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
            entry.ext === 'svg'
              ? 'bg-success/15 text-success'
              : 'bg-info/15 text-info',
          )}
        >
          {entry.ext}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  entries,
  theme,
  query,
}: {
  title: string;
  entries: LogoEntry[];
  theme: 'light' | 'dark';
  query: string;
}) {
  const filtered = useMemo(
    () =>
      entries.filter((e) => e.name.toLowerCase().includes(query.toLowerCase().trim())),
    [entries, query],
  );

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        <span className="font-mono tabular-nums text-xs text-muted-foreground">
          {filtered.length} / {entries.length}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum logo encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((e) => (
            <LogoCard key={e.name} entry={e} theme={theme} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function LogosGallery() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [query, setQuery] = useState('');

  const programs = useMemo(() => buildEntries(programModules), []);
  const banks = useMemo(() => buildEntries(bankModules), []);

  const isDark = theme === 'dark';

  return (
    <div
      className={cn('min-h-screen transition-colors bg-background text-foreground', !isDark && 'light')}
    >
      <header className="sticky top-0 z-10 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Design system
              </span>
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Galeria de Logos
            </h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{programs.length}</span> programas ·{' '}
              <span className="font-mono tabular-nums">{banks.length}</span> bancos ·{' '}
              <span className="font-mono tabular-nums">5</span> tamanhos
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar logo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-64 pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Alternar tema"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <Section title="Programas de fidelidade" entries={programs} theme={theme} query={query} />
        <Section title="Bancos & cartões" entries={banks} theme={theme} query={query} />
      </main>
    </div>
  );
}
