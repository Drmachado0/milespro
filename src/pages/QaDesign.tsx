import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Settings,
  Filter,
  Plus,
  ExternalLink,
  Search,
  MoreHorizontal,
  Check,
  X,
  Trash2,
  CheckCircle2,
  Info,
  Crown,
  ClipboardList,
  SearchX,
  BellOff,
  Home,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ---------- helpers ----------

const SectionHead = ({ title, override }: { title: string; override: string }) => (
  <div className="mb-4 flex items-baseline justify-between border-b border-border/60 pb-3">
    <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {override}
    </span>
  </div>
);

const Frame = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mb-3 rounded-lg border border-border bg-card p-6 ${className}`}>{children}</div>
);

const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

const Label = ({ children }: { children: ReactNode }) => (
  <span className="min-w-[112px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
    {children}
  </span>
);

const Swatch = ({ color, label, glow = false }: { color: string; label: string; glow?: boolean }) => (
  <div
    className="relative aspect-square cursor-pointer overflow-hidden rounded-md border border-border transition-transform hover:-translate-y-0.5"
    style={{
      background: color,
      boxShadow: glow ? "0 0 24px rgba(255,106,26,0.4)" : undefined,
    }}
  >
    <span className="absolute inset-x-1 bottom-1 rounded-[3px] bg-black/55 px-1.5 py-[3px] text-center font-mono text-[9.5px] text-white">
      {label}
    </span>
  </div>
);

const TypeSpec = ({ meta, children }: { meta: string; children: ReactNode }) => (
  <div className="flex items-baseline gap-5 border-b border-border/60 py-3.5 last:border-0">
    <div className="min-w-[130px] font-mono text-[10.5px] tracking-wide text-muted-foreground">
      {meta}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const SpaceRow = ({ key_, px }: { key_: string; px: number }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="min-w-[80px] font-mono text-[11px] text-muted-foreground">{key_}</span>
    <div className="h-3.5 rounded-sm bg-primary" style={{ width: `${px}px` }} />
    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{px}px</span>
  </div>
);

const RadiusCell = ({ value, name }: { value: string; name: string }) => (
  <div
    className="grid h-20 w-20 place-items-end bg-primary p-2 text-right font-mono text-[10.5px] text-primary-foreground"
    style={{ borderRadius: value }}
  >
    <div>
      {value}
      <br />
      <span className="opacity-70">{name}</span>
    </div>
  </div>
);

const ShadowCell = ({ name, shadowVar }: { name: string; shadowVar: string }) => (
  <div
    className="flex flex-col gap-2 rounded-lg bg-card p-5"
    style={{ boxShadow: `var(${shadowVar})` }}
  >
    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {name}
    </span>
    <div className="h-15 w-full rounded-md bg-muted" style={{ height: 60 }} />
  </div>
);

// ---------- page ----------

const QaDesign = () => {
  return (
    <div className="mp-app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-8 py-3.5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_2px_hsl(var(--primary)/0.6)]"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              QA · Design system
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-8 pb-16 pt-8">
        {/* Head */}
        <div className="mb-8 flex items-end justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_2px_hsl(var(--primary)/0.6)]"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Design system v1.0
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Componentes MilesPro
            </h1>
            <p className="mt-2 max-w-[720px] text-sm text-muted-foreground">
              Tokens, primitivas e padrões repetidos do produto. Dark-first com tema claro
              opcional, laranja como acento exclusivo, JetBrains Mono em todos os valores
              financeiros.
            </p>
          </div>
          <nav className="hidden gap-4 text-xs text-muted-foreground md:flex md:flex-wrap md:max-w-[420px] md:justify-end">
            {[
              ["#cores", "Cores"],
              ["#tipografia", "Tipografia"],
              ["#espacamento", "Espaçamento"],
              ["#raios", "Raios"],
              ["#sombras", "Sombras"],
              ["#botoes", "Botões"],
              ["#inputs", "Inputs"],
              ["#badges", "Badges"],
              ["#cards", "Cards"],
              ["#tables", "Tabelas"],
              ["#dialogs", "Diálogos"],
              ["#empty", "Empty"],
              ["#skeletons", "Skeletons"],
              ["#err", "404"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-primary">
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* ---------- CORES ---------- */}
        <section id="cores" className="mb-10">
          <SectionHead title="Cores" override="Foundations + Brand + Status + Programas" />

          <Frame>
            <Label>Surface scale (7 níveis)</Label>
            <div className="mt-3 grid grid-cols-7 gap-2">
              <Swatch color="hsl(var(--mp-surface-base))" label="base" />
              <Swatch color="hsl(var(--mp-surface-sunken))" label="sunken" />
              <Swatch color="hsl(var(--mp-surface-1))" label="s-1" />
              <Swatch color="hsl(var(--mp-surface-2))" label="s-2" />
              <Swatch color="hsl(var(--mp-surface-3))" label="s-3" />
              <Swatch color="hsl(var(--mp-surface-4))" label="s-4" />
              <Swatch color="hsl(var(--mp-surface-5))" label="s-5" />
            </div>
          </Frame>

          <Frame>
            <Label>Brand · orange + magenta</Label>
            <div className="mt-3 grid grid-cols-6 gap-2">
              <Swatch color="hsl(var(--mp-orange-300))" label="300" />
              <Swatch color="hsl(var(--mp-orange-400))" label="400" />
              <Swatch color="hsl(var(--mp-orange-500))" label="500 *" glow />
              <Swatch color="hsl(var(--mp-orange-600))" label="600" />
              <Swatch color="hsl(var(--mp-orange-700))" label="700" />
              <Swatch color="hsl(var(--mp-magenta))" label="magenta" />
            </div>
          </Frame>

          <Frame>
            <Label>Status semântico</Label>
            <div className="mt-3 grid grid-cols-5 gap-2">
              <Swatch color="hsl(var(--mp-success))" label="success" />
              <Swatch color="hsl(var(--mp-warning))" label="warning" />
              <Swatch color="hsl(var(--mp-danger))" label="danger" />
              <Swatch color="hsl(var(--mp-info))" label="info" />
              <Swatch color="hsl(var(--chart-4))" label="violet" />
            </div>
          </Frame>

          <Frame>
            <Label>Programas brasileiros</Label>
            <div className="mt-3 grid grid-cols-7 gap-2">
              <Swatch color="#FF0066" label="Livelo" />
              <Swatch color="#FF6A00" label="Smiles" />
              <Swatch color="#2BB7F6" label="Azul" />
              <Swatch color="#ED1C24" label="Latam" />
              <Swatch color="#EC7000" label="Itaú" />
              <Swatch color="#6B3FA0" label="Esfera" />
              <Swatch color="#820AD1" label="Nubank" />
            </div>
          </Frame>
        </section>

        {/* ---------- TIPOGRAFIA ---------- */}
        <section id="tipografia" className="mb-10">
          <SectionHead
            title="Tipografia"
            override="Inter (display) · DM Sans (body) · JetBrains Mono (números)"
          />
          <Frame>
            <TypeSpec meta="Display · 72 / -.035">
              <div className="font-mono text-[64px] font-bold tracking-tight tabular-nums">
                R$ 134.820,50
              </div>
            </TypeSpec>
            <TypeSpec meta="H1 · 40 / 700">
              <div className="font-display text-4xl font-bold tracking-tight">
                Patrimônio em milhas
              </div>
            </TypeSpec>
            <TypeSpec meta="H2 · 28 / 600">
              <div className="font-display text-[28px] font-semibold tracking-tight">
                Operações recentes
              </div>
            </TypeSpec>
            <TypeSpec meta="H3 · 20 / 600">
              <div className="text-xl font-semibold">Bumerangue Itaú → Livelo</div>
            </TypeSpec>
            <TypeSpec meta="H4 · 16 / 600">
              <div className="text-base font-semibold">Resumo da operação</div>
            </TypeSpec>
            <TypeSpec meta="Body · 14 / 400">
              <p className="text-sm text-muted-foreground">
                Você economizou R$ 12.840 nos últimos 90 dias comparando seu CM efetivo (R$
                17,60/k) com o preço médio de mercado (R$ 21,80/k).
              </p>
            </TypeSpec>
            <TypeSpec meta="Small · 13 / 400">
              <p className="text-[13px] text-muted-foreground">
                Recomendamos vender 30k pontos Latam nas próximas 48h.
              </p>
            </TypeSpec>
            <TypeSpec meta="Micro · 12 / 400">
              <p className="text-xs text-muted-foreground">
                CPM efetivo nos últimos 90 dias considerando bônus de transferência.
              </p>
            </TypeSpec>
            <TypeSpec meta="Eyebrow · 11 / mono">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)]"
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Patrimônio em milhas
                </span>
              </div>
            </TypeSpec>
            <TypeSpec meta="Money · mono">
              <div className="font-mono text-[28px] font-bold tabular-nums tracking-tight">
                R$ 87.420,50 · 142.860 pts
              </div>
            </TypeSpec>
          </Frame>
        </section>

        {/* ---------- ESPAÇAMENTO ---------- */}
        <section id="espacamento" className="mb-10">
          <SectionHead title="Espaçamento" override="Base 4px · scale 1–24" />
          <Frame>
            {[
              ["s-1", 4],
              ["s-2", 8],
              ["s-3", 12],
              ["s-4", 16],
              ["s-5", 20],
              ["s-6", 24],
              ["s-8", 32],
              ["s-12", 48],
              ["s-16", 64],
              ["s-24", 96],
            ].map(([key, px]) => (
              <SpaceRow key={key as string} key_={key as string} px={px as number} />
            ))}
          </Frame>
        </section>

        {/* ---------- RAIOS ---------- */}
        <section id="raios" className="mb-10">
          <SectionHead title="Border radius" override="7 níveis · xs até pill" />
          <Frame>
            <div className="flex flex-wrap gap-3">
              <RadiusCell value="4px" name="xs" />
              <RadiusCell value="6px" name="sm" />
              <RadiusCell value="8px" name="md" />
              <RadiusCell value="12px" name="lg" />
              <RadiusCell value="16px" name="xl" />
              <RadiusCell value="24px" name="2xl" />
              <RadiusCell value="999px" name="pill" />
            </div>
          </Frame>
        </section>

        {/* ---------- SOMBRAS ---------- */}
        <section id="sombras" className="mb-10">
          <SectionHead title="Elevação" override="4 níveis + glow laranja" />
          <Frame>
            <div className="grid grid-cols-4 gap-4">
              <ShadowCell name="Flat" shadowVar="--shadow-flat" />
              <ShadowCell name="Raised" shadowVar="--shadow-raised" />
              <ShadowCell name="Floating" shadowVar="--shadow-floating" />
              <ShadowCell name="Overlay" shadowVar="--shadow-overlay-token" />
            </div>
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-5 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.45)]">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Glow orange
              </span>
              <div className="mt-2 h-15 w-full rounded-md bg-primary/10" style={{ height: 60 }} />
            </div>
          </Frame>
        </section>

        {/* ---------- BOTÕES ---------- */}
        <section id="botoes" className="mb-10">
          <SectionHead title="Botões" override="5 variants × 3 tamanhos × estados" />
          <Frame>
            <div className="mb-4">
              <Row>
                <Label>Primary</Label>
                <Button size="sm">Pequeno</Button>
                <Button>Default</Button>
                <Button size="lg">Grande</Button>
                <Button disabled>Desabilitado</Button>
                <Button>
                  <Plus className="h-3.5 w-3.5" />
                  Com ícone
                </Button>
              </Row>
            </div>
            <div className="mb-4">
              <Row>
                <Label>Secondary</Label>
                <Button variant="secondary" size="sm">
                  Pequeno
                </Button>
                <Button variant="secondary">Default</Button>
                <Button variant="secondary" size="lg">
                  Grande
                </Button>
              </Row>
            </div>
            <div className="mb-4">
              <Row>
                <Label>Outline</Label>
                <Button variant="outline" size="sm">
                  Pequeno
                </Button>
                <Button variant="outline">Default</Button>
                <Button variant="outline" size="lg">
                  Grande
                </Button>
              </Row>
            </div>
            <div className="mb-4">
              <Row>
                <Label>Ghost</Label>
                <Button variant="ghost" size="sm">
                  Pequeno
                </Button>
                <Button variant="ghost">Default</Button>
                <Button variant="ghost" size="lg">
                  Grande
                </Button>
              </Row>
            </div>
            <div className="mb-4">
              <Row>
                <Label>Link</Label>
                <Button variant="link">Ver tudo →</Button>
                <Button variant="link">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir programa
                </Button>
              </Row>
            </div>
            <Row>
              <Label>Icon</Label>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </Row>
          </Frame>
        </section>

        {/* ---------- INPUTS ---------- */}
        <section id="inputs" className="mb-10">
          <SectionHead title="Inputs" override="Text · search · checkbox · radio · toggle" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Frame>
              <Label>Text inputs</Label>
              <div className="mt-3 flex flex-col gap-2.5">
                <Input placeholder="Digite algo..." />
                <Input
                  defaultValue="25.000 pontos"
                  className="border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.10)]"
                />
                <Input
                  defaultValue="abc"
                  className="border-destructive shadow-[0_0_0_3px_hsl(var(--destructive)/0.10)]"
                />
                <Input placeholder="Desabilitado" disabled />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar..." className="pl-9 pr-16" />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    ⌘ K
                  </span>
                </div>
              </div>
            </Frame>
            <Frame>
              <Label>Controls</Label>
              <div className="mt-3 flex flex-col gap-3.5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked />
                  Notificar quando bônus &gt; 80%
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  Sincronizar com Google Calendar
                </label>
                <RadioGroup defaultValue="weekly" className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="weekly" />
                    Receber semanalmente
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="monthly" />
                    Receber mensalmente
                  </label>
                </RadioGroup>
                <label className="flex items-center gap-2.5 text-sm">
                  <Switch defaultChecked />
                  Dark mode (ativo)
                </label>
              </div>
            </Frame>
          </div>
        </section>

        {/* ---------- BADGES ---------- */}
        <section id="badges" className="mb-10">
          <SectionHead title="Badges & Tags" override="Status · plan · neutral" />
          <Frame>
            <div className="mb-3.5">
              <Row>
                <Label>Status</Label>
                <Badge className="border-success/30 bg-success/15 text-success" variant="outline">
                  Confirmado
                </Badge>
                <Badge className="border-info/30 bg-info/15 text-info" variant="outline">
                  Em dia
                </Badge>
                <Badge className="border-warning/30 bg-warning/15 text-warning" variant="outline">
                  Vencendo
                </Badge>
                <Badge
                  className="border-destructive/30 bg-destructive/15 text-destructive"
                  variant="outline"
                >
                  Vencido
                </Badge>
                <Badge className="border-primary/30 bg-primary/15 text-primary" variant="outline">
                  Bônus +90%
                </Badge>
                <Badge
                  className="border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))]"
                  variant="outline"
                >
                  Bumerangue
                </Badge>
                <Badge variant="secondary">Concluída</Badge>
              </Row>
            </div>
            <div className="mb-3.5">
              <Row>
                <Label>Plan pills</Label>
                <span className="rounded-full bg-gradient-to-br from-primary to-[hsl(var(--mp-magenta))] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                  PRO
                </span>
                <span className="rounded-full bg-gradient-to-br from-[hsl(var(--mp-warning))] to-primary px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                  VIP
                </span>
                <span className="rounded-full bg-gradient-to-br from-muted to-muted-foreground/40 px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground">
                  FREE
                </span>
              </Row>
            </div>
            <Row>
              <Label>Tags</Label>
              <Badge variant="outline">14 noites</Badge>
              <Badge variant="outline">2 pax</Badge>
              <Badge variant="outline">Boleto</Badge>
              <Badge variant="outline">JFK → MIA</Badge>
            </Row>
          </Frame>
        </section>

        {/* ---------- CARDS ---------- */}
        <section id="cards" className="mb-10">
          <SectionHead title="Cards" override="Plain · KPI · Hero · Header" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <Label>.card padrão</Label>
              <p className="mt-2 text-sm text-muted-foreground">
                Card padrão com padding default. Background card, hairline border, sombra flat.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  KPI label
                </span>
              </div>
              <div className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
                R$ 134.820
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="font-mono text-success tabular-nums">+R$ 4.230</span>
                <span className="text-muted-foreground">último mês</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(80% 100% at 100% 0%, hsl(var(--primary) / 0.10), transparent 55%), radial-gradient(60% 80% at 0% 100%, hsl(var(--mp-magenta) / 0.08), transparent 55%)",
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)]"
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    .card-hero
                  </span>
                </div>
                <div className="mt-2 font-mono text-[28px] font-bold tabular-nums tracking-tight">
                  R$ 134.820,50
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  Hero card com glow laranja-magenta nos cantos
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold">Header card</div>
                  <div className="text-xs text-muted-foreground">subtítulo descritivo</div>
                </div>
                <Button variant="link" className="h-auto p-0">
                  Ver →
                </Button>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground">
                  Card com header dedicado para títulos secundários, badges, ou links de ação.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- TABELAS ---------- */}
        <section id="tables" className="mb-10">
          <SectionHead title="Tabelas" override="Hairline rows · tabular-nums · row alta" />
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[36px_1.4fr_1fr_110px_110px_100px_40px] gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              <span />
              <span>Programa</span>
              <span>Tipo</span>
              <span className="text-right">Saldo</span>
              <span className="text-right">Valor BRL</span>
              <span className="text-right">CM</span>
              <span />
            </div>
            {[
              {
                color: "#FF0066",
                logo: "L",
                name: "Livelo",
                tag: null,
                type: "Banco · 24m",
                saldo: "87.420",
                brl: "R$ 24.890",
                cm: "R$ 17,60/k",
              },
              {
                color: "#EC7000",
                logo: "I",
                name: "Itaú Pontos",
                tag: "+90%",
                type: "Banco · ∞",
                saldo: "142.860",
                brl: "R$ 18.500",
                cm: "R$ 12,90/k",
              },
              {
                color: "#ED1C24",
                logo: "L",
                name: "Latam Pass",
                tag: null,
                type: (
                  <>
                    Aérea ·{" "}
                    <span className="text-warning">28k expira em 60d</span>
                  </>
                ),
                saldo: "62.400",
                brl: "R$ 13.420",
                cm: "R$ 21,50/k",
              },
            ].map((row, i, arr) => (
              <div
                key={row.name}
                className={`grid grid-cols-[36px_1.4fr_1fr_110px_110px_100px_40px] items-center gap-3 px-4 py-3 ${
                  i < arr.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div
                  className="grid h-7 w-7 place-items-center rounded-md font-mono text-xs font-bold text-white"
                  style={{ background: row.color }}
                >
                  {row.logo}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {row.name}
                  {row.tag && (
                    <Badge
                      className="border-primary/30 bg-primary/15 text-[9.5px] text-primary"
                      variant="outline"
                    >
                      {row.tag}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{row.type}</div>
                <div className="text-right font-mono tabular-nums">{row.saldo}</div>
                <div className="text-right font-mono tabular-nums">{row.brl}</div>
                <div className="text-right font-mono tabular-nums">{row.cm}</div>
                <div className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- DIALOGS ---------- */}
        <section id="dialogs" className="mb-12">
          <SectionHead
            title="Diálogos & modais"
            override="4 variantes · destrutivo · sucesso · info · upgrade"
          />
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Clique em cada botão para abrir o modal real.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DialogShowcase
              variant="destructive"
              icon={<Trash2 className="h-5 w-5" />}
              trigger="Excluir operação"
              title="Excluir operação?"
              description={
                <>
                  Esta ação não pode ser desfeita. A compra de{" "}
                  <strong>25.000 pts Livelo (R$ 460)</strong> de 10/05/2026 será removida do seu
                  histórico e recalculará seu CM médio.
                </>
              }
              actions={
                <>
                  <Button variant="ghost" size="sm">
                    Cancelar
                  </Button>
                  <Button variant="destructive" size="sm">
                    Excluir definitivamente
                  </Button>
                </>
              }
            />
            <DialogShowcase
              variant="success"
              icon={<CheckCircle2 className="h-5 w-5" />}
              trigger="Bumerangue registrado"
              title="Bumerangue registrado!"
              description="50.000 pts Itaú → 95.000 pts Livelo (bônus +90%). CM efetivo R$ 9,47/k · economia de R$ 845 vs. compra direta. Os pontos chegam ao Livelo em até 48h."
              actions={
                <>
                  <Button variant="ghost" size="sm">
                    Ver operação
                  </Button>
                  <Button size="sm">Continuar</Button>
                </>
              }
            />
            <DialogShowcase
              variant="info"
              icon={<Info className="h-5 w-5" />}
              trigger="Conectar Google"
              title="Sincronizar com Google Calendar?"
              description="Vamos criar eventos no seu Google Agenda para datas de validade dos seus pontos, vencimento de bônus de transferência e check-ins de hotéis. Você pode revogar a qualquer momento."
              actions={
                <>
                  <Button variant="ghost" size="sm">
                    Agora não
                  </Button>
                  <Button size="sm">
                    <Check className="h-3.5 w-3.5" />
                    Conectar Google
                  </Button>
                </>
              }
            />
            <DialogShowcase
              variant="upgrade"
              icon={<Crown className="h-5 w-5" />}
              trigger="Limite Free atingido"
              title="Você atingiu o limite do plano Free"
              description={
                <>
                  O plano Free inclui 3 programas. Para gerenciar os 11 programas que você já tem,
                  faça upgrade para <strong className="text-primary">Pro · R$ 19,90/mês</strong> ou{" "}
                  <strong className="text-warning">VIP · R$ 39,90</strong> (Sala VIP + Multi-CPF).
                </>
              }
              actions={
                <>
                  <Button variant="ghost" size="sm">
                    Talvez mais tarde
                  </Button>
                  <Button size="sm">Ver planos</Button>
                </>
              }
              centered
            />
          </div>
        </section>

        {/* ---------- EMPTY STATES ---------- */}
        <section id="empty" className="mb-12">
          <SectionHead
            title="Empty states"
            override="Lista vazia · sem resultados · feature gating · sem alertas"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EmptyStage
              icon={<ClipboardList className="h-9 w-9" />}
              title="Sem operações ainda"
              description="Cadastre sua primeira compra, venda, transferência ou bumerangue. Vamos calcular seu CM médio e economia automaticamente."
              action={
                <Button>
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar primeira operação
                </Button>
              }
            />
            <EmptyStage
              icon={<SearchX className="h-9 w-9" />}
              title={
                <>
                  Nenhum resultado para{" "}
                  <em className="not-italic text-primary">"smiles veredas"</em>
                </>
              }
              description="Tente buscar por nome do programa, faixa de data, ou tipo de operação. Você também pode limpar os filtros e ver tudo de novo."
              action={
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="sm">
                    Limpar filtros
                  </Button>
                  <Button variant="secondary" size="sm">
                    Ajustar busca
                  </Button>
                </div>
              }
            />
            <EmptyStage
              icon={<Crown className="h-9 w-9" />}
              accent
              title="Sala VIP é exclusivo do plano VIP"
              description="Controle entradas em salas Mastercard Black, GRU, GIG e GRU Premium. Cota anual, comprovantes em PDF e alertas de cota."
              action={
                <Button>
                  <Crown className="h-3.5 w-3.5" />
                  Conhecer VIP
                </Button>
              }
            />
            <EmptyStage
              icon={<BellOff className="h-9 w-9" />}
              title="Sem alertas no momento"
              description="Quando suas milhas estiverem para expirar, surgir uma promoção interessante ou seu CM médio melhorar consideravelmente, você verá aqui."
              action={
                <Button variant="ghost">
                  <Settings className="h-3.5 w-3.5" />
                  Configurar alertas
                </Button>
              }
            />
          </div>
        </section>

        {/* ---------- SKELETONS ---------- */}
        <section id="skeletons" className="mb-12">
          <SectionHead
            title="Loading skeletons"
            override="Pulsing 1.5s · mantém forma do conteúdo"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <Label>KPI cards (skeleton)</Label>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-md border border-border/60 bg-background p-4">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="mt-2.5 h-6 w-4/5" />
                    <Skeleton className="mt-1 h-3 w-3/5" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <Label>Table rows (skeleton)</Label>
              <div className="mt-4 flex flex-col gap-3">
                {[40, 50, 36, 45].map((w, i) => (
                  <div key={i} className="flex items-center gap-3.5 py-2">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-3" style={{ width: `${w}%` }} />
                      <Skeleton className="mt-1.5 h-2.5" style={{ width: `${w - 16}%` }} />
                    </div>
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 404 ---------- */}
        <section id="err" className="mb-4">
          <SectionHead title="Tela 404" override="Voz da marca · navegação clara · sem culpa" />
          <div
            className="relative overflow-hidden rounded-xl border border-border px-12 py-20 text-center"
            style={{
              background:
                "radial-gradient(80% 100% at 50% 30%, hsl(var(--primary) / 0.07) 0%, transparent 55%), radial-gradient(70% 80% at 50% 100%, hsl(var(--mp-magenta) / 0.05) 0%, transparent 55%), hsl(var(--card))",
            }}
          >
            <div
              className="font-display font-extrabold leading-none tracking-tight"
              style={{
                fontSize: "clamp(140px, 18vw, 220px)",
                background:
                  "linear-gradient(135deg, hsl(var(--mp-orange-400)), hsl(var(--mp-magenta)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 8px 64px hsl(var(--primary) / 0.25)",
              }}
            >
              404
            </div>
            <h3 className="font-display text-3xl font-bold tracking-tight">
              Essa tela viajou e não voltou
            </h3>
            <p className="mx-auto mt-3 max-w-[460px] text-base text-muted-foreground">
              Talvez ela esteja num bumerangue Itaú → Livelo, ou esperando bônus de 90% pra
              reaparecer. Enquanto isso, te levo de volta pra um lugar conhecido.
            </p>
            <div className="mt-6 flex justify-center gap-2.5">
              <Button variant="ghost">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
              <Button>
                <Home className="h-3.5 w-3.5" />
                Ir pro dashboard
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------- composed helpers ----------

interface DialogShowcaseProps {
  variant: "destructive" | "success" | "info" | "upgrade";
  icon: ReactNode;
  trigger: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  centered?: boolean;
}

const dialogIconStyles: Record<DialogShowcaseProps["variant"], string> = {
  destructive: "bg-destructive/15 text-destructive",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  upgrade:
    "bg-gradient-to-br from-primary to-[hsl(var(--mp-magenta))] text-primary-foreground",
};

function DialogShowcase({
  variant,
  icon,
  trigger,
  title,
  description,
  actions,
  centered = false,
}: DialogShowcaseProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-[200px] flex-col rounded-xl border border-border bg-card/50 p-5">
      <span className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {variant === "destructive" && "Confirmação destrutiva"}
        {variant === "success" && "Sucesso"}
        {variant === "info" && "Informação"}
        {variant === "upgrade" && "Upgrade gate"}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-auto self-start">
            Abrir: {trigger}
          </Button>
        </DialogTrigger>
        <DialogContent className={centered ? "text-center" : ""}>
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl ${dialogIconStyles[variant]} ${
              centered ? "mx-auto" : ""
            }`}
          >
            {icon}
          </div>
          <DialogHeader className={centered ? "items-center" : ""}>
            <DialogTitle className="font-display text-xl font-bold tracking-tight">
              {title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{description}</p>
          <DialogFooter className={centered ? "justify-center sm:justify-center" : ""}>
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmptyStageProps {
  icon: ReactNode;
  title: ReactNode;
  description: string;
  action: ReactNode;
  accent?: boolean;
}

function EmptyStage({ icon, title, description, action, accent = false }: EmptyStageProps) {
  return (
    <div
      className={`rounded-lg border border-border px-8 py-16 text-center ${
        accent
          ? "bg-gradient-to-b from-primary/[0.04] to-card"
          : "bg-card/60"
      }`}
    >
      <div className="relative mx-auto mb-5 grid h-24 w-24 place-items-center rounded-3xl shadow-[inset_0_0_0_1px_hsl(var(--border))]">
        <div
          className={`absolute inset-0 rounded-3xl ${
            accent ? "bg-primary/10" : "bg-muted"
          }`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1.5 rounded-[28px] border border-dashed border-border opacity-50"
        />
        <span
          className={`relative ${accent ? "text-primary" : "text-muted-foreground"}`}
        >
          {icon}
        </span>
      </div>
      <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-[380px] text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 flex justify-center">{action}</div>
    </div>
  );
}

export default QaDesign;
