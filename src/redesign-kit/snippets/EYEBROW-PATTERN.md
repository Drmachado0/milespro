# Eyebrow Pattern — código pronto

A assinatura visual mais reconhecível do design system. Copia e cola onde precisar.

---

## Standard (em PageHeader)

```tsx
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.55)]" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    Análise
  </span>
</div>
```

---

## Hero (em hero card grande)

```tsx
<div className="flex items-center gap-2 mb-3">
  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
    Total acumulado
  </span>
</div>
```

Diferença: glow maior (`10px 2px` em vez de `8px 1px`), texto `text-xs` (em vez de `[10px]`), tracking `0.2em` (em vez de `0.18em`).

---

## Compact (em cards pequenos / sidebar / sheet)

```tsx
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.55)]" />
  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
    Menu
  </span>
</div>
```

Diferença: tracking menor (`0.16em`), peso menor (`font-medium`).

---

## Pulsing variant (em estado especial / loading / live)

```tsx
<div className="flex items-center gap-2">
  <span className="relative inline-flex h-1.5 w-1.5">
    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 blur-[3px] animate-pulse" />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
  </span>
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    Ao vivo
  </span>
</div>
```

Diferença: glow é via `blur(3px)` em camada separada, com `animate-pulse`.

---

## Status variant (em vez de brand, usa cor semântica)

```tsx
{/* Success */}
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_1px_hsl(var(--success)/0.55)]" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success">
    Sincronizado
  </span>
</div>

{/* Warning */}
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-warning shadow-[0_0_8px_1px_hsl(var(--warning)/0.55)]" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warning">
    Atenção
  </span>
</div>

{/* Destructive */}
<div className="flex items-center gap-2">
  <span className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_1px_hsl(var(--destructive)/0.55)]" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
    Erro
  </span>
</div>
```

---

## Quando usar

✅ Acima de títulos de página
✅ Em hero cards
✅ Em landing sections como kicker
✅ Em empty states (prop `eyebrow`)
✅ Em modais de destaque (upgrade, success message)
✅ Em sheets/drawers como contexto

❌ Em cards genéricos (vira ruído)
❌ Mais de 1 visível por viewport
❌ Em texto corrido / dentro de prose
❌ Em botões (use ícone)
