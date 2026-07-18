# Sketch Manifest — MilesPro Dashboard

## Design Direction
Dark-mode-first dashboard for milhas management. Tone: professional/finance (think Avenue, Nubank Ultravioleta, Linear), not gamified. Hero metric needs to be the portfolio value (not a vanity miles count). Orange primary (#e8590c) used sparingly as an accent — not tiled across every card. Numbers use tabular font so they line up; a single JetBrains Mono for display numbers sets a "trading desk" mood. Cards rely on subtle borders, not colored left stripes.

## Reference Points
User-referenced apps implied by the domain: Avenue (portfolio), Nubank Ultravioleta (dark finance), Linear (dense + ergonomic), Ramp / Mercury (B2B finance panels).

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|-----------------|--------|------|
| 001 | dashboard-redesign | Qual estrutura comunica "portfólio profissional de milhas" sem cansar a vista? | **A — Executive Cockpit** | dashboard, layout, hierarchy |

## Decisões-chave (vencedora A)
- Hero único: valor patrimonial em R$ (tipografia display 56px) + sparkline integrada na mesma card
- 4 KPIs secundários em linha dentro do mesmo card, separados por divisor sutil — não são cards próprios
- Oportunidades na coluna direita: 1 "featured" com borda laranja + 2-3 dicas compactas; empty-state de tarefas vai pra outro contexto
- Tabela densa de programas (não cards) com coluna de alocação (barra) e ações inline
- Laranja primary só: CTA principal, accent do sparkline, featured alert, barra de alocação do programa líder
- Números em JetBrains Mono para bater "trading desk"
- Sidebar e topbar mantidos essencialmente iguais ao atual, com topbar ganhando "JM" avatar mais polido

