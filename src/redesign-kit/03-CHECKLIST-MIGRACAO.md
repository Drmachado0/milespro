# Checklist de Migração

Use pra ir validando página por página. Marca o que passou.

---

## Setup global

- [ ] `tokens.css` copiado / mesclado em `src/index.css`
- [ ] `tailwind.config.ts` atualizado com tokens novos (surface, brand, status, fonts, shadows, gradients)
- [ ] Fontes carregadas no `index.html` (DM Sans + Inter + JetBrains Mono)
- [ ] `npm run typecheck` limpo
- [ ] `npm run lint` limpo (0 errors, idealmente 0 warnings)
- [ ] `npm run build` limpo

---

## Shell do app

- [ ] Canvas `.mp-app-shell` aplicado no container raiz logado
- [ ] Header com `h-14 md:h-16 bg-background/70 backdrop-blur-xl`
- [ ] Logo no header alinhado verticalmente com o logo da sidebar
- [ ] Sidebar com background `bg-sidebar` ou `bg-surface-sunken`
- [ ] Item ativo da sidebar com inset rail laranja + glow
- [ ] `<MobileBottomNav>` renderizado e visível só em mobile
- [ ] `<MobileFAB>` renderizado e visível só em mobile
- [ ] `<main>` com padding-bottom pra não ficar atrás da bottom-nav

---

## PageHeader em todas as páginas

Confirma uma a uma:

- [ ] `Dashboard` / página inicial logada — eyebrow `Visão geral`
- [ ] Páginas de listagem (operações, transações, etc.) — eyebrow contextual
- [ ] Páginas de detalhe — eyebrow do segmento (`Programa`, `Cartão`, etc.)
- [ ] Páginas analíticas — eyebrow `Análise`
- [ ] Configurações / sistema — eyebrow `Sistema`
- [ ] Auth (`/login`, `/signup`) — não precisa de PageHeader (layout próprio)
- [ ] 404 — eyebrow `Erro`

Todos os títulos sem "Página de ..." (imperativo curto).

---

## Numerais em mono

Audita por busca:

- [ ] Hero card principal — valor em `font-mono tabular-nums tracking-tight`
- [ ] Todos os KPI cards — valor em mono
- [ ] Tabelas com valores monetários — célula em mono
- [ ] Tabelas com datas formatadas — célula em mono
- [ ] Contadores/badges com número — número em mono
- [ ] Modais de pagamento/checkout — total em mono
- [ ] Forms de input financeiro — display value em mono

**Comando útil pra auditar:**

```bash
grep -rE "(text-(xl|2xl|3xl|4xl|5xl)\s+font-bold)" src/ | grep -v "font-mono"
```

Cada hit é um candidato a virar `font-mono`.

---

## Literais de cor → tokens

Roda regex no repo destino:

```bash
grep -rE "(bg|text|border)-(red|green|blue|yellow|amber|emerald|rose|slate|zinc|gray)-(50|100|200|300|400|500|600|700|800|900)" src/ --include="*.tsx" --include="*.ts"
```

Cada hit é candidato a substituir:

- `green/emerald` → `success`
- `red/rose` → `destructive`
- `amber/yellow` → `warning`
- `blue` → `info`
- `orange` → `primary`
- `slate/zinc/gray` (surfaces) → `bg-card`, `bg-background`, `border-border`, `text-muted-foreground`, `text-foreground`

Audita até retornar zero ou só ocorrências justificadas (chart colors via `chart-1..5`, logos externos de programa/banco).

---

## Empty states

Procura por `text-center py-12` ou `Nenhum X encontrado` no repo:

- [ ] Listas vazias usam `<EmptyState>` (não div inline)
- [ ] `actionLabel + onAction` definidos quando há ação possível
- [ ] Ícone via Lucide (não emoji nem SVG inline)
- [ ] Eyebrow opcional pra empty states de feature gating ou estado especial

---

## Master/detail

Para cada tela que tem "lista + detalhe":

- [ ] Adota `<TabletSplitPane>`
- [ ] Em mobile (`<lg`), stack vertical
- [ ] Detail tem `<EmptyState>` quando nada selecionado
- [ ] masterHeader (filtros/busca) sticky

---

## Tema claro

- [ ] Toggle Sun/Moon no header funciona
- [ ] Light mode swap em **todos** os tokens (não tem "ilhas" de dark sobrando)
- [ ] Charts respeitam tokens (`hsl(var(--mp-success))` etc., não hex literal)
- [ ] Tabelas legíveis em light (sem texto branco sobre branco)
- [ ] Glass surfaces (header, modal) funcionam em ambos os temas
- [ ] Transição entre temas suave (200ms ease), não corte seco
- [ ] Print stylesheet força light + brand orange (Ctrl+P)

---

## Mobile/responsivo

Abre DevTools → Ctrl+Shift+M → iPhone 14 Pro / Pixel 7:

- [ ] Nenhuma página tem scroll horizontal em 360px
- [ ] Tabelas viram card list em mobile (ou têm scroll horizontal explícito com hint visual)
- [ ] Hit targets ≥ 44px em mobile
- [ ] Modais viram bottom sheets (ou ocupam tela cheia com botão close óbvio)
- [ ] Forms com `type="email/tel/number"` (teclado correto)
- [ ] Safe-area-inset honrado (bottom-nav não fica atrás do home indicator)

---

## Acessibilidade básica

- [ ] Focus ring visível em todos os elementos focáveis (`ring-2 ring-primary`)
- [ ] Botões com `aria-label` quando só icon
- [ ] Modal/dialog com `aria-modal` e focus trap
- [ ] Toggle de tema acessível via teclado
- [ ] `prefers-reduced-motion` honrado (transições e animações desabilitam)
- [ ] Contraste AA em todo texto sobre background

---

## Performance

- [ ] Build < 30s
- [ ] Bundle gzip < 500KB inicial (com lazy load de rotas)
- [ ] LCP < 2.5s em 3G simulado
- [ ] CLS < 0.1
- [ ] Sem renders desnecessários (React DevTools Profiler)

---

## QA visual final

Tenta fazer:

- [ ] Login em uma conta nova → onboarding/dashboard limpo
- [ ] Toggle dark → light → dark (3 vezes) sem regressão
- [ ] Resize: 1920px → 1366px → 1024px → 768px → 414px → 360px (cada um tem hierarquia adequada)
- [ ] Ctrl+P de uma página com tabela financeira → impressão legível
- [ ] DevTools Network → throttle "Slow 3G" → app carrega skeletons antes de conteúdo

Se tudo passou, **PR aberto.** 🎯
