# Playbook de Migração

Passo a passo pra aplicar o design system em um repo React + Tailwind + shadcn/ui.

---

## Fase 0 — Antes de começar

Roda no repo destino:

```bash
git checkout -b redesign/design-system-v2
npm run typecheck    # baseline limpo?
npm run lint         # baseline limpo?
npm run build        # baseline limpo?
```

Se algum estiver quebrado, **conserta primeiro**. Não dá pra distinguir regressão sua de coisa que já tava ruim.

---

## Fase 1 — Tokens + Tailwind config

### 1.1. Substituir `src/index.css`

Pega o `tokens.css` do kit e substitui o `src/index.css` do repo destino. Se o repo tem CSS custom além de tokens (animations específicas, etc.), preserva ESSAS partes e troca só o bloco `@layer base { :root { ... } .light { ... } }`.

### 1.2. Atualizar `tailwind.config.ts`

Mescla o conteúdo de `tailwind.config.snippet.ts` no `tailwind.config.ts` do repo destino. Pontos críticos:

- `theme.extend.colors` ganha `surface.*`, `brand.*`, `success`, `warning`, `danger`, `info`
- `theme.extend.boxShadow` ganha `flat/raised/floating/overlay-token/modal/glow-orange/glow-magenta/glow-emerald/glow-sky/glow-violet`
- `theme.extend.fontFamily` define `sans` (DM Sans), `display` (Inter), `mono` (JetBrains Mono)
- `theme.extend.backgroundImage` ganha `gradient-hero/orange-magenta/orange-amber/surface/spotlight`

### 1.3. Carregar fontes

No `index.html` do repo destino:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### 1.4. Validar

```bash
npm run typecheck && npm run build
```

Abre o app no navegador. **Deve carregar sem crashes.** Visualmente vai estar híbrido (canvas novo, componentes antigos) — normal.

---

## Fase 2 — Shell do app (layout, header, sidebar)

### 2.1. Canvas

No componente raiz do app logado (algo tipo `DashboardLayout.tsx`):

```tsx
<div className="mp-app-shell min-h-screen">
  {/* sidebar */}
  {/* header */}
  <main>...</main>
</div>
```

A classe `mp-app-shell` já vem definida no `tokens.css` (canvas dark com duplo-spot brand + ruído sutil; em light vira papel limpo).

### 2.2. Header

Substituir surface do header pra glass:

```tsx
<header className="sticky top-0 z-30 h-14 md:h-16 border-b border-border bg-background/70 backdrop-blur-xl md:px-6">
  ...
</header>
```

- `h-14` mobile / `h-16` desktop (64px alinha com logo da sidebar)
- `bg-background/70` + `backdrop-blur-xl` → glass surface universal do app

### 2.3. Sidebar — estado ativo

No item de nav ativo, adiciona inset rail laranja:

```tsx
<NavLink
  className={({ isActive }) => cn(
    "relative flex items-center gap-3 rounded-md px-3 py-2",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
  )}
>
  {({ isActive }) => (
    <>
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary shadow-[0_0_10px_1px_hsl(var(--primary)/0.45)]" />
      )}
      {/* icon + label */}
    </>
  )}
</NavLink>
```

### 2.4. Mobile nav

Copia `components/MobileBottomNav.tsx` e `components/MobileFAB.tsx`. Renderiza ambos no fim do `DashboardLayout`:

```tsx
<MobileBottomNav />
<MobileFAB />
```

Ajusta o padding do `<main>` pra conteúdo não ficar atrás:

```tsx
<main className="pb-[calc(1rem+72px+var(--safe-area-inset-bottom))] md:pb-4">
  ...
</main>
```

### 2.5. Validar

Toggle de tema dark/light deve funcionar (se o repo tem `ThemeProvider` configurado com `attribute="class"`). Sidebar mobile aparece, FAB também. Build limpo.

---

## Fase 3 — PageHeader em todas as páginas

### 3.1. Copiar componente

Copia `components/PageHeader.tsx` pra `src/components/layout/PageHeader.tsx` (ou onde fizer sentido) no repo destino.

### 3.2. Adotar página por página

Em cada `src/pages/*.tsx`, substitui o cabeçalho existente por:

```tsx
import { PageHeader } from '@/components/layout/PageHeader';
import { TrendingUp } from 'lucide-react';

<PageHeader
  eyebrow="Análise"             // contexto curto, UPPER-CASE no render
  title="Resultados"
  subtitle="Performance dos últimos 30 dias"
  icon={<TrendingUp className="h-4 w-4" />}
  actions={<Button>Exportar</Button>}
/>
```

**Convenção de eyebrows** (escolhe o que se aplica à página):

| Contexto | Eyebrow |
|---|---|
| Lista/dashboard principal | `Visão geral` |
| Análise de dados | `Análise` |
| Gamificação/badges | `Gamificação` |
| Notificações/alertas | `Central` |
| Promoções/oportunidades | `Oportunidades` |
| Plano/billing | `Plano` |
| Configurações | `Sistema` |
| Pessoas/usuários | `Pessoas` |
| Conteúdo/blog | `Conteúdo` |
| Admin | `Admin` |
| Erro 404 | `Erro` |
| Módulo B2B/cliente | `Agência` (ou nome do segmento) |

---

## Fase 4 — Numerais financeiros em mono

Procura no repo destino todos os lugares onde existem valores numéricos (preços, saldos, KPIs, contagens, datas formatadas) e aplica:

```tsx
<span className="font-mono tabular-nums tracking-tight">
  {formatCurrency(value)}
</span>
```

Hot zones típicas:

- KPI cards do dashboard
- Tabelas de transações/operações
- Hero card de saldo principal
- Modais de checkout/pagamento
- Linhas de detalhe (subtotal, total, impostos, frete)

**Atalho regex** (pra usar em busca global):

```regex
text-(xl|2xl|3xl|4xl)\s+font-bold
```

Quase todos os hits precisam virar `font-mono text-X font-bold tabular-nums tracking-tight`.

---

## Fase 5 — Substituir literais de cor por tokens

Caça e substitui:

| ❌ Literal | ✅ Token |
|---|---|
| `bg-green-500` | `bg-success` |
| `text-green-600` | `text-success` |
| `border-green-500` | `border-success` |
| `bg-red-500` / `bg-red-600` | `bg-destructive` |
| `text-red-500` | `text-destructive` |
| `bg-amber-500` / `bg-yellow-500` | `bg-warning` |
| `text-yellow-600` | `text-warning` |
| `bg-blue-500` | `bg-info` |
| `text-blue-600` | `text-info` |
| `bg-purple-500` / `bg-violet-500` | `bg-violet-500` (mantém tailwind padrão) |
| `bg-orange-500` | `bg-primary` |
| `text-white` (sem dark:) | `text-foreground` |
| `bg-slate-900` / `bg-zinc-900` | `bg-card` ou `bg-background` |
| `border-gray-200` / `border-zinc-800` | `border-border` |
| `text-gray-500` / `text-zinc-400` | `text-muted-foreground` |

**Atalho regex pra encontrar literais:**

```regex
(bg|text|border)-(red|green|blue|yellow|amber|orange|purple|violet|emerald|rose|slate|zinc|gray|neutral)-(50|100|200|300|400|500|600|700|800|900)
```

---

## Fase 6 — Empty states padronizados

### 6.1. Copiar componente

Copia `components/EmptyState.tsx` pra `src/components/ui/empty-state.tsx`.

### 6.2. Substituir empties inline

Procura no repo destino `divs` com texto "Nenhum X encontrado" e converte:

```tsx
// Antes
<div className="text-center py-12">
  <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
  <p className="mt-4 text-muted-foreground">Nenhum alerta cadastrado</p>
</div>

// Depois
<EmptyState
  icon={Inbox}
  title="Nenhum alerta cadastrado"
  description="Crie seu primeiro alerta pra acompanhar oportunidades em tempo real."
  actionLabel="Criar alerta"
  onAction={() => setOpen(true)}
/>
```

---

## Fase 7 — Master/detail em telas com lista + detalhe

Para telas tipo "lista de mensagens + visualização" ou "lista de orçamentos + briefing":

```tsx
import { TabletSplitPane } from '@/components/layout/TabletSplitPane';

<TabletSplitPane
  master={<ListaItems items={items} selected={selected} onSelect={setSelected} />}
  detail={selected ? <Detalhe item={selected} /> : <EmptyState ... />}
  masterHeader={<Filtros />}
/>
```

Funciona automaticamente em ≥1024px (split horizontal), <1024px (stack vertical).

---

## Fase 8 — Tema claro

Se o repo destino já tem `ThemeProvider` configurado (next-themes ou similar com `attribute="class"`), o toggle já funciona — basta um botão Sun/Moon no header.

Se NÃO tem, instala:

```bash
npm i next-themes
```

E adiciona no `App.tsx`:

```tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="dark">
  <App />
</ThemeProvider>
```

O botão de toggle:

```tsx
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const { theme, setTheme } = useTheme();

<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
>
  {theme === 'dark' ? <Sun /> : <Moon />}
</Button>
```

---

## Fase 9 — Validação final

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Roda o checklist de `03-CHECKLIST-MIGRACAO.md` página por página. Toggle de tema, mobile preview, focus states, hover states.

Se passar, commita:

```bash
git add -A
git commit -m "feat(design): migrate to MilesPro design system v2"
git push -u origin redesign/design-system-v2
```

Abre PR.

---

## Ordem recomendada de adoção

Se for migrar tela por tela em vez de tudo de uma vez, segue a ordem por impacto visual:

1. Shell (Layout, Header, Sidebar) — destrava tudo
2. Dashboard principal — primeira tela vista pelo usuário logado
3. Lista densa principal (operações, transações, etc.)
4. Página de detalhe principal
5. Simulador / calculadora / ferramenta core
6. Landing page
7. Telas de gestão (cartões, planos, configurações)
8. Formulários de criação/edição
9. Telas administrativas
10. Telas raras (404, auth, sobre, termos)
