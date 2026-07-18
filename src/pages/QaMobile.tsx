import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  BarChart3,
  List,
  Bell,
  MoreHorizontal,
  Plus,
  ShoppingCart,
  TrendingDown,
  ArrowLeftRight,
  Repeat,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";

// ---------- shared chrome ----------

const StatusBar = ({ time = "9:41", isAndroid = false }: { time?: string; isAndroid?: boolean }) => (
  <div
    className={`flex h-11 items-center justify-between px-5 text-[13px] font-semibold ${
      isAndroid ? "" : "pt-2"
    }`}
  >
    <span className="font-mono tabular-nums">{time}</span>
    <div className="flex items-center gap-1.5">
      {/* Cell signal */}
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
        <rect x="0" y="7" width="3" height="4" rx="0.5" />
        <rect x="4" y="5" width="3" height="6" rx="0.5" />
        <rect x="8" y="2.5" width="3" height="8.5" rx="0.5" />
        <rect x="12" y="0" width="3" height="11" rx="0.5" />
      </svg>
      {/* Wifi */}
      <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
        <path d="M7.5 0a11 11 0 0 1 7.5 3l-1.4 1.5a9 9 0 0 0-12.2 0L0 3a11 11 0 0 1 7.5-3z" />
        <path d="M7.5 4a7 7 0 0 1 4.7 1.8L10.8 7.3a5 5 0 0 0-6.6 0L2.8 5.8A7 7 0 0 1 7.5 4z" />
        <circle cx="7.5" cy="9" r="1.6" />
      </svg>
      {/* Battery */}
      <svg width="25" height="11" viewBox="0 0 25 11" fill="none">
        <rect
          x="0.5"
          y="0.5"
          width="21"
          height="10"
          rx="2.5"
          stroke="currentColor"
          strokeOpacity="0.4"
        />
        <rect x="2" y="2" width="18" height="7" rx="1" fill="currentColor" />
        <rect x="22.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  </div>
);

// iPhone 15 Pro device frame — 393×852, Dynamic Island
const IPhoneFrame = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </div>
    <div className="relative">
      {/* Outer chassis */}
      <div
        className="relative overflow-hidden rounded-[58px] border border-zinc-700 bg-zinc-900 p-[14px] shadow-[0_28px_60px_-12px_rgba(0,0,0,0.6)]"
        style={{ width: 393, height: 852 }}
      >
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[46px] bg-background text-foreground">
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-[11px] z-50 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative flex h-full flex-col">{children}</div>
        </div>
      </div>
    </div>
  </div>
);

// Pixel 8 device frame — 412×900, punch-hole
const PixelFrame = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </div>
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[44px] border border-zinc-700 bg-zinc-900 p-[10px] shadow-[0_28px_60px_-12px_rgba(0,0,0,0.6)]"
        style={{ width: 412, height: 900 }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-background text-foreground">
          {/* Punch-hole camera */}
          <div className="pointer-events-none absolute left-1/2 top-[14px] z-50 h-[12px] w-[12px] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative flex h-full flex-col">{children}</div>
        </div>
      </div>
    </div>
  </div>
);

// ---------- screen content ----------

const BottomNavDemo = ({ active = "home" }: { active?: string }) => {
  const items = [
    { id: "home", icon: Home, label: "Início" },
    { id: "programs", icon: BarChart3, label: "Programas" },
    { id: "ops", icon: List, label: "Operações" },
    { id: "alerts", icon: Bell, label: "Alertas" },
    { id: "more", icon: MoreHorizontal, label: "Mais" },
  ];
  return (
    <nav
      className="border-t border-border bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: 8 }}
    >
      <ul className="flex h-[68px] items-center">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = id === active;
          return (
            <li key={id} className="flex-1">
              <div
                className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid h-8 w-16 place-items-center rounded-2xl transition-all duration-200 ${
                    isActive ? "bg-primary/16" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const FabDemo = ({ expanded = false }: { expanded?: boolean }) => {
  const actions = [
    { icon: ShoppingCart, label: "Compra" },
    { icon: Repeat, label: "Bumerangue" },
    { icon: ArrowLeftRight, label: "Transferência" },
    { icon: TrendingDown, label: "Venda" },
  ];
  return (
    <div className="pointer-events-none absolute bottom-[140px] right-6 z-30 flex flex-col items-end gap-3">
      {expanded &&
        actions.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium">
              {label}
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-lg">
              <Icon className="h-4 w-4" />
            </span>
          </div>
        ))}
      <div
        className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(335_85%_55%)] text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.6)] transition-transform ${
          expanded ? "rotate-45" : ""
        }`}
      >
        <Plus className="h-6 w-6" />
      </div>
    </div>
  );
};

const HomeScreen = () => (
  <>
    <div className="mb-4 flex items-center gap-2">
      <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Patrimônio
      </span>
    </div>
    <h1 className="font-mono text-3xl font-bold tabular-nums tracking-tight">R$ 134.820,50</h1>
    <p className="mt-1 text-xs text-muted-foreground">
      <span className="font-mono tabular-nums text-success">+8,4%</span> · últimos 30 dias
    </p>

    <div className="mt-5 grid grid-cols-2 gap-3">
      {[
        { k: "Milhas", v: "1.247.300" },
        { k: "Pontos", v: "486.120" },
        { k: "CM médio", v: "R$ 18,40" },
        { k: "Programas", v: "11" },
      ].map(({ k, v }) => (
        <div key={k} className="rounded-xl border border-border bg-card p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {k}
          </div>
          <div className="mt-1 font-mono text-base font-bold tabular-nums tracking-tight">{v}</div>
        </div>
      ))}
    </div>

    <h2 className="mt-6 mb-2 text-sm font-semibold">Programas</h2>
    <div className="space-y-2">
      {[
        { name: "Livelo", saldo: "428.500", color: "#FF0066" },
        { name: "Smiles", saldo: "312.180", color: "#FF6A00" },
        { name: "Latam Pass", saldo: "187.900", color: "#E11E2C" },
      ].map((p) => (
        <div
          key={p.name}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-7 w-7 rounded-md"
              style={{ background: p.color }}
            />
            <span className="text-sm font-medium">{p.name}</span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums tracking-tight">
            {p.saldo}
          </span>
        </div>
      ))}
    </div>
  </>
);

// Top app bar (mobile)
const AppBar = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl">
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-sm font-bold">M</span>
      </span>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
          MilesPro
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
    </div>
    <div className="flex gap-2">
      <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
        <Search className="h-4 w-4" />
      </button>
      <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
        <SettingsIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);

// ---------- safe area visualization ----------

const SafeAreaOverlay = () => (
  <div className="pointer-events-none absolute inset-0 z-40">
    {/* top inset */}
    <div className="absolute inset-x-0 top-0 h-[59px] border-b border-dashed border-warning/40 bg-warning/5">
      <span className="absolute right-3 top-1 font-mono text-[9px] uppercase tracking-[0.14em] text-warning">
        Safe area top · 59px
      </span>
    </div>
    {/* bottom inset (gestural nav) */}
    <div className="absolute inset-x-0 bottom-0 h-[34px] border-t border-dashed border-warning/40 bg-warning/5">
      <span className="absolute right-3 bottom-1 font-mono text-[9px] uppercase tracking-[0.14em] text-warning">
        Safe area bottom · 34px
      </span>
    </div>
  </div>
);

// ---------- page ----------

const SectionHead = ({ title, hint }: { title: string; hint: string }) => (
  <div className="mb-5 flex items-baseline justify-between border-b border-border/60 pb-3">
    <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {hint}
    </span>
  </div>
);

export default function QaMobile() {
  const [fabOpen, setFabOpen] = useState(false);
  const [showSafe, setShowSafe] = useState(false);

  const navLinks = [
    { id: "frames", label: "Frames" },
    { id: "bottom-nav", label: "Bottom nav" },
    { id: "fab", label: "FAB" },
    { id: "gestures", label: "Gestos" },
    { id: "safe-area", label: "Safe area" },
  ];

  return (
    <div className="min-h-screen bg-background mp-app-shell text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/qa-design"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
              aria-label="Voltar ao QA Design"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  QA mobile
                </span>
              </div>
              <h1 className="text-base font-semibold leading-tight">
                Frames iPhone + Pixel · bottom-nav, FAB, gestos, safe-area
              </h1>
            </div>
          </div>
          <nav className="hidden gap-1 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className="rounded-full border border-transparent px-3 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-10 lg:px-6">
        {/* 1. Frames */}
        <section id="frames" className="mb-16">
          <SectionHead title="Frames" hint="iPhone 15 Pro · Pixel 8" />
          <p className="mb-8 max-w-3xl text-sm text-muted-foreground">
            Mesma tela renderizada em dois aparelhos físicos. Note como o iPhone deixa
            espaço para a Dynamic Island enquanto o Pixel só desconta o punch-hole.
            Bottom-nav respeita gestural inset em ambos.
          </p>
          <div className="flex flex-wrap items-start justify-center gap-12">
            <IPhoneFrame label="iPhone 15 Pro · 393 × 852">
              <StatusBar />
              <AppBar title="Dashboard" />
              <div className="flex-1 overflow-hidden px-5 py-6">
                <HomeScreen />
              </div>
              <BottomNavDemo active="home" />
            </IPhoneFrame>

            <PixelFrame label="Pixel 8 · 412 × 900">
              <StatusBar isAndroid />
              <AppBar title="Dashboard" />
              <div className="flex-1 overflow-hidden px-5 py-6">
                <HomeScreen />
              </div>
              <BottomNavDemo active="home" />
              {/* Android gestural nav indicator */}
              <div className="grid place-items-center pb-1.5">
                <span className="h-1 w-32 rounded-full bg-foreground/40" />
              </div>
            </PixelFrame>
          </div>
        </section>

        {/* 2. Bottom nav states */}
        <section id="bottom-nav" className="mb-16">
          <SectionHead title="Bottom navigation" hint="Material 3 · 5 slots · 68px" />
          <p className="mb-8 max-w-3xl text-sm text-muted-foreground">
            Pill ativo (laranja) com radius-2xl em vez do underline Material 2. 4
            destinos fixos + "Mais" (overflow sheet). Hit-target ≥ 48dp em cada item.
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Início ativo", active: "home" },
              { label: "Programas ativo", active: "programs" },
              { label: "Operações ativo", active: "ops" },
              { label: "Mais ativo", active: "more" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <BottomNavDemo active={s.active} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. FAB */}
        <section id="fab" className="mb-16">
          <SectionHead title="Floating Action Button" hint="56×56 · speed-dial" />
          <p className="mb-8 max-w-3xl text-sm text-muted-foreground">
            FAB com gradient brand. Tap expande 4 quick actions (Compra / Bumerangue
            / Transferência / Venda). Backdrop blur ao abrir, rotação 45° (Plus → X),
            haptic impact no toggle.
          </p>
          <div className="flex flex-wrap items-start justify-center gap-12">
            <div className="flex flex-col items-center gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Fechado
              </div>
              <div
                className="relative overflow-hidden rounded-[40px] border border-border bg-background"
                style={{ width: 320, height: 380 }}
              >
                <FabDemo expanded={false} />
                <BottomNavDemo />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Expandido
              </div>
              <div
                className="relative overflow-hidden rounded-[40px] border border-border bg-background"
                style={{ width: 320, height: 380 }}
              >
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                <FabDemo expanded />
                <BottomNavDemo />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Interativo
              </div>
              <div
                className="relative overflow-hidden rounded-[40px] border border-border bg-background"
                style={{ width: 320, height: 380 }}
              >
                {fabOpen && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />}
                <button
                  type="button"
                  onClick={() => setFabOpen((v) => !v)}
                  className="absolute inset-0 cursor-pointer"
                  aria-label={fabOpen ? "Fechar quick actions" : "Abrir quick actions"}
                />
                <FabDemo expanded={fabOpen} />
                <BottomNavDemo />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Gestures */}
        <section id="gestures" className="mb-16">
          <SectionHead title="Gestos" hint="Swipe · long-press · pull-to-refresh" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Swipe-right edge",
                hint: "30px da borda esquerda",
                desc: "Abre a sidebar mobile a partir de qualquer tela do app. Threshold de 50px horizontal, vertical ignorado.",
              },
              {
                title: "Swipe-left sidebar",
                hint: "Em qualquer x",
                desc: "Fecha a sidebar mobile quando ela está aberta. Mesmo threshold de 50px.",
              },
              {
                title: "Pull-to-refresh",
                hint: "Top-of-list",
                desc: "Disponível em listas (operações, alertas). Hapticseletion ao confirmar, hapticImpact ao reiniciar.",
              },
            ].map((g) => (
              <div key={g.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {g.hint}
                </div>
                <div className="mt-1 text-sm font-semibold">{g.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Safe area */}
        <section id="safe-area" className="mb-16">
          <SectionHead title="Safe area" hint="env(safe-area-inset-*) · iOS 17+" />
          <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
            Toggle a sobreposição amarela para ver os insets que respeitamos
            automaticamente: 59px topo (Dynamic Island), 34px embaixo (gestural nav).
            Bottom-nav e FAB já incorporam `var(--safe-area-inset-bottom)`.
          </p>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSafe((v) => !v)}
              className={`rounded-full border border-border px-4 py-1.5 text-xs font-medium ${
                showSafe ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {showSafe ? "Ocultar overlay" : "Mostrar overlay"}
            </button>
          </div>
          <div className="flex justify-center">
            <IPhoneFrame label="iPhone 15 Pro · safe-area visíveis">
              <StatusBar />
              {showSafe && <SafeAreaOverlay />}
              <AppBar title="Operações" />
              <div className="flex-1 overflow-hidden px-5 py-6">
                <HomeScreen />
              </div>
              <BottomNavDemo active="ops" />
            </IPhoneFrame>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/40 py-6 text-center text-xs text-muted-foreground">
        QA Mobile · construído sobre os mesmos componentes que rodam no app
        (Capacitor iOS + Android).
      </footer>
    </div>
  );
}
