# Padrões Visuais

Os 8 padrões reutilizáveis que dão coesão visual ao design system.

---

## 1. Eyebrow dot + glow (a assinatura)

A coisa mais reconhecível do design. Aparece em **todo** PageHeader, hero card, empty state, modal title de destaque.

```tsx
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.55)]" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    Contexto
  </span>
</div>
```

**Variações:**

- **Compact** (em cards pequenos): `text-[10px] tracking-[0.16em]`
- **Standard** (em PageHeader): `text-[10px] tracking-[0.18em]`
- **Hero** (em landing/hero card): `text-xs tracking-[0.2em]` + glow maior `shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]`

**Quando usar:**

- ✅ Acima de títulos de página (`<PageHeader>` já faz)
- ✅ Em hero cards (HeroValueCard, HeroBlock)
- ✅ Em landing sections como kicker
- ✅ Em empty states (prop `eyebrow` do componente)
- ❌ Em cards genéricos (vira ruído)
- ❌ Mais de 1 por seção visível

---

## 2. Numerais financeiros em mono

100% de números financeiros (preços, saldos, milhas, percentuais, contagens) usam JetBrains Mono com `tabular-nums`.

```tsx
<span className="font-mono tabular-nums tracking-tight">
  {formatCurrency(value)}
</span>
```

**Sempre aplica:**

- `font-mono` — força JetBrains Mono
- `tabular-nums` — todos os dígitos têm a mesma largura (alinhamento em colunas)
- `tracking-tight` — fecha kerning, mais legível em valores grandes

**Hot zones obrigatórias:**

- Hero card de saldo principal (display 28-64px)
- KPI cards (valor 20-32px)
- Células de valor em tabelas
- Total/subtotal de checkout/pagamento
- Datas formatadas em tabelas (`dd/mm/yyyy` ou `hh:mm`)
- Contagens (`12 itens`, `3 ativos`)
- Telefone / CPF / cartão (`**** 1234`, `(11) 9 9999-9999`)

**Quando NÃO usar mono:**

- ❌ Texto corrido (prose)
- ❌ Labels de KPI (esses são `uppercase tracking-wide`)
- ❌ Numerais dentro de copy descritivo (ex: "tem 5 promoções ativas" — fica estranho)

---

## 3. KPI tile (cartão de número)

Pattern uniforme pra qualquer cartão de KPI:

```tsx
<div className="rounded-xl border border-border bg-card p-4 space-y-2">
  {/* Label uppercase eyebrow */}
  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
    Total de milhas
  </div>
  {/* Valor mono grande */}
  <div className="font-mono text-2xl font-bold tabular-nums tracking-tight">
    {formatNumber(totalMiles)}
  </div>
  {/* Hint/delta */}
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <TrendingUp className="h-3 w-3 text-success" />
    <span className="text-success">+12,4%</span>
    <span>vs. mês anterior</span>
  </div>
</div>
```

**Variações de tamanho:**

- **Compact** (4 ou mais por linha): `p-3`, valor `text-lg`
- **Standard** (3 por linha): `p-4`, valor `text-2xl`
- **Hero** (1-2 por linha em destaque): `p-5`, valor `text-4xl`

---

## 4. Hero card (radial wash brand)

Pattern do hero patrimonial — usa em telas onde existe UMA métrica dominante:

```tsx
<div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
  {/* Radial wash brand orange + magenta */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 opacity-50"
    style={{
      background:
        'radial-gradient(120% 80% at 20% 0%, hsl(var(--primary) / 0.18) 0%, hsl(330 100% 56% / 0.06) 40%, transparent 70%)',
    }}
  />
  <div className="relative">
    {/* Eyebrow */}
    <div className="flex items-center gap-2 mb-3">
      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Total acumulado
      </span>
    </div>
    {/* Valor display */}
    <div className="font-mono text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
      {formatCurrency(total)}
    </div>
    {/* Hint */}
    <div className="mt-2 text-sm text-muted-foreground">
      Em <span className="font-mono tabular-nums">{programs}</span> programas ativos
    </div>
  </div>
</div>
```

---

## 5. Surface scale (escala de profundidade)

Em vez de shadows pesadas, o design usa **profundidade por tonalidade**. Tokens em `tailwind.config`:

| Token | Quando usar |
|---|---|
| `surface.base` | Background do app (`bg-surface-base`) |
| `surface.sunken` | Sidebar, footer, áreas mais escuras que o canvas |
| `surface.1` | Container interno do dashboard, list rows |
| `surface.2` | **Card padrão** (≡ `bg-card`) |
| `surface.3` | Hover state de cards |
| `surface.4` | **Input** background (≡ `bg-input`) |
| `surface.5` | **Popover/menu** background (≡ `bg-popover`) |
| `surface.overlay` | Modal background |

**Regra:** uma camada por nível de aninhamento. Card dentro de card → outer `surface.2`, inner `surface.3`.

---

## 6. Status badges semânticos

Toda badge de status usa tokens, nunca literais:

```tsx
// Success
<Badge className="bg-success/10 text-success border-success/20">Confirmado</Badge>

// Warning
<Badge className="bg-warning/10 text-warning border-warning/20">Pendente</Badge>

// Destructive
<Badge className="bg-destructive/10 text-destructive border-destructive/20">Falhou</Badge>

// Info
<Badge className="bg-info/10 text-info border-info/20">Em análise</Badge>

// Brand
<Badge className="bg-primary/10 text-primary border-primary/20">Pro</Badge>

// Neutro
<Badge variant="outline">Rascunho</Badge>
```

**Padrão de opacidade:**

- `/10` — background tonal sutil
- `/20` — border tonal
- Texto puro — usar o token diretamente (`text-success`, sem `/`)

---

## 7. Glass surface (header, modal scrim)

```tsx
<header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
  ...
</header>
```

Aparece em:

- Header do app logado
- Header da landing
- Header de páginas de QA (`/qa-design`, `/qa-mobile`)
- Backdrop de modal/sheet (`bg-background/80 backdrop-blur-md`)
- Bottom-nav mobile (`bg-background/85 backdrop-blur-xl`)

---

## 8. Master/detail responsivo

Para qualquer tela com "lista + visualização":

```tsx
<TabletSplitPane
  master={<Lista />}
  detail={<Detalhe />}
  masterHeader={<Filtros />}     // opcional
  detailHeader={<Ações />}        // opcional
/>
```

- **≥1024px** → 360px master sticky + flex-1 detail rolável
- **<1024px** → stack vertical, lista vira lista cheia
- Cada coluna rola independente (`max-h-[calc(100vh-12rem)]`)

---

## Antipatterns (NUNCA usa)

- ❌ Gradiente roxo `from-purple-500 to-pink-500` (AI slop universal)
- ❌ Card com `border-l-4 border-l-primary` (rounded card com left border accent — visual de feature flag de 2018)
- ❌ Emoji em UI (`✅ ⚠️ 🚀 ✨ 🎯 💰`) — usa Lucide icons
- ❌ Cor literal sem tema (`bg-green-500`, `text-blue-600`, `bg-orange-500`)
- ❌ `text-white` em qualquer lugar exceto sobre cor garantida (e mesmo aí, prefere `text-primary-foreground`)
- ❌ `Inter` como display font de marca primária (usa só em UI/body); pra display de produto pode, pra display editorial não
- ❌ Stat-slop inventado ("10× mais rápido", "99,9% de uptime") sem fonte real
- ❌ Warm beige / peach / pink canvas (`bg-stone-50`, `bg-orange-50`, `bg-rose-50`) — é AI canvas, não fintech
- ❌ Hand-drawn SVG humans ou ilustrações genéricas
- ❌ Glass surface com `backdrop-blur-sm` (fica feio) — sempre `-md` ou `-xl`

Lista completa em `04-ANTI-PATTERNS.md`.
