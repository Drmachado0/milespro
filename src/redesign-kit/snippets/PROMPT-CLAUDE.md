# Prompt pronto pra Claude Code

Copia o bloco abaixo, abre o Claude Code num repo novo (com permissão de escrita) e cola. Ele aplica todo o design system automaticamente.

---

## Pré-requisitos no repo destino

Antes de rodar o prompt, garante que o repo destino:
- ✅ É React 18+ com TypeScript
- ✅ Usa Tailwind CSS 3+
- ✅ Tem shadcn/ui instalado (`Button`, `Card`, `Dialog`, etc.)
- ✅ Tem `lucide-react` instalado
- ✅ `clsx` + `tailwind-merge` (pro `cn()` util)
- ✅ Existe `src/lib/utils.ts` exportando `cn`

E que o kit (`redesign-kit/`) está acessível — copia ele pra raiz do repo destino, ou pra um diretório irmão.

---

## Prompt (copia tudo daqui pra baixo)

```
Vou te dar um design system completo pra aplicar nesse repo.

CONTEXTO:
- O kit está em ./redesign-kit/ (ou no caminho que eu vou apontar)
- O design é MilesPro v2: dark-first, brand orange (#FF6A1A), JetBrains Mono em números financeiros
- Foco fintech sério (tipo Linear, Nubank, Mercury)
- 100% tokens (sem literais de cor)
- shadcn/ui como base de componentes
- Suporta light/dark theme via class on <html>

CONVENÇÕES OBRIGATÓRIAS:
1. Eyebrow dot+glow é a assinatura visual — vai em todo PageHeader, hero card, empty state
2. Todos os números financeiros (preços, saldos, milhas, percentuais) usam font-mono tabular-nums tracking-tight
3. Cores via tokens semânticos (success/warning/destructive/info/primary) — NUNCA literais (bg-green-500, text-blue-600, bg-orange-500 estão proibidos)
4. Surface scale: surface.base (canvas) → surface.2 (card) → surface.5 (popover)
5. Empty states usam <EmptyState> consistente
6. Master/detail usa <TabletSplitPane> responsivo
7. Mobile usa <MobileBottomNav> + <MobileFAB>
8. Page headers usam <PageHeader eyebrow="Contexto" title="..." />
9. Sem emoji em UI — usa Lucide icons
10. Sem gradiente roxo, sem warm beige/peach canvas, sem rounded card com left-border accent

PASSO A PASSO:

FASE 1 — Tokens (~5min):
- Lê redesign-kit/tokens.css e substitui o conteúdo de src/index.css com isso
- Lê redesign-kit/tailwind.config.snippet.ts e mescla no tailwind.config.ts (preserva config existente, só adiciona o que falta em theme.extend)
- Garante que as fontes estão carregadas no index.html: DM Sans, Inter, JetBrains Mono via Google Fonts
- Roda `npm run typecheck && npm run build` pra validar

FASE 2 — Componentes (~10min):
- Copia redesign-kit/components/PageHeader.tsx pra src/components/layout/PageHeader.tsx
- Copia redesign-kit/components/EmptyState.tsx pra src/components/ui/empty-state.tsx
- Copia redesign-kit/components/TabletSplitPane.tsx pra src/components/layout/TabletSplitPane.tsx
- Copia redesign-kit/components/MobileBottomNav.tsx pra src/components/layout/MobileBottomNav.tsx (edita os arrays primaryItems e overflowItems pras rotas reais desse repo)
- Copia redesign-kit/components/MobileFAB.tsx pra src/components/layout/MobileFAB.tsx (edita o array actions)
- Se o repo não tem haptics, cria src/lib/haptics.ts com no-ops:
    export const hapticSelection = () => {};
    export const hapticImpact = () => {};

FASE 3 — Shell (~10min):
- No layout principal (Layout/DashboardLayout/RootLayout), aplica className="mp-app-shell" no container raiz
- Header: ajusta pra `h-14 md:h-16 bg-background/70 backdrop-blur-xl border-b border-border`
- Sidebar: surface.sunken como background, item ativo com inset rail laranja + glow
- Renderiza <MobileBottomNav /> e <MobileFAB /> no fim do layout
- Padding bottom do <main>: `pb-[calc(1rem+72px+var(--safe-area-inset-bottom))] md:pb-4`

FASE 4 — Page headers (~15-30min, depende do número de páginas):
- Em cada src/pages/*.tsx, substitui o cabeçalho existente por <PageHeader eyebrow="..." title="..." subtitle="..." icon={<Icon />} actions={...} />
- Convenção de eyebrows:
    Dashboard/Visão geral, Análise (para analíticos), Sistema (config), Gamificação (badges/level), Central (alertas), Oportunidades (promos), Plano (billing), Pessoas (users), Conteúdo (blog), Admin, Erro (404), nome do segmento B2B (Agência, etc.)

FASE 5 — Numerais em mono (~10-20min):
- Procura no repo por `text-(xl|2xl|3xl|4xl)\s+font-bold` (regex)
- Cada hit que tem número é candidato a virar `font-mono text-X font-bold tabular-nums tracking-tight`
- Hot zones: hero cards, KPI tiles, tabelas com valores monetários, dates formatadas em tabelas, totais de checkout, contadores, displays de input financeiro

FASE 6 — Tokens vs literais (~10min):
- Procura por regex `(bg|text|border)-(red|green|blue|yellow|amber|emerald|rose|orange|slate|zinc|gray)-(50|100|200|300|400|500|600|700|800|900)`
- Substitui:
    green/emerald → success
    red/rose → destructive
    amber/yellow → warning
    blue → info
    orange → primary
    slate/zinc/gray (surface) → bg-card / bg-background / border-border / text-muted-foreground / text-foreground

FASE 7 — Empty states (~10min):
- Procura por "Nenhum X encontrado" ou divs centralizadas com `py-12 text-center` ou ícones grandes em prose
- Converte pra <EmptyState icon={...} title="..." description="..." actionLabel="..." onAction={...} />

FASE 8 — Validação final:
- npm run typecheck (precisa estar limpo)
- npm run lint (0 errors, idealmente 0 warnings)
- npm run build (limpo)
- npm run dev e teste visual em desktop + mobile (DevTools Ctrl+Shift+M iPhone 14 Pro)
- Toggle tema dark/light (se já tiver) deve funcionar com transição suave

ENTREGÁVEIS ESPERADOS:
- 1 ou 2 commits, mensagens descritivas
- typecheck + lint + build verdes
- Resumo final com lista de páginas/componentes tocados

INÍCIO:
Quando estiver pronto, começa pela FASE 1 (tokens) e me confirma quando o build estiver verde antes de avançar pra FASE 2.
```

---

## Como rodar

1. Copia o prompt acima (tudo dentro do bloco de código)
2. Abre o Claude Code no repo destino com permissão de escrita
3. Cola o prompt
4. Espera ele rodar fase a fase, validando entre cada uma
5. No fim, ele te entrega um PR pronto

---

## Variações

### Se quiser SÓ os tokens (sem componentes/páginas):

Edita o prompt pra incluir só a FASE 1.

### Se quiser SÓ adoção em páginas (já tem tokens):

Edita o prompt pra começar na FASE 4.

### Se quiser modo conservador (1 página de cada vez):

No fim da FASE 4, adiciona:

```
IMPORTANTE: aplica em UMA página por vez e me mostra o resultado antes de seguir pra próxima. Não faz batch.
```
