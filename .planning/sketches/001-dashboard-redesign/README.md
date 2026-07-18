---
sketch: 001
name: dashboard-redesign
question: "Qual estrutura comunica 'portfólio profissional de milhas' sem cansar a vista?"
winner: "A"
tags: [dashboard, layout, hierarchy]
---

# Sketch 001: Dashboard Redesign

## Design Question
Qual estrutura comunica "portfólio profissional de milhas" sem cansar a vista, com hero metric claro, oportunidades acionáveis e saldos por programa em hierarquia correta?

## How to View
```bash
open .planning/sketches/001-dashboard-redesign/index.html
```
(Windows: abra o arquivo no Brave/Chrome.)

## Variants
- **A: Executive Cockpit** — hero gigante de valor patrimonial em R$ com sparkline integrada; KPIs secundários em chips horizontais; sidebar direita colapsável com alertas prioritários; tabela densa de programas abaixo.
- **B: Opportunity-First** — banner full-width com a *single top opportunity* do momento (CTA grande); linha compacta de oportunidades secundárias; programas transformados em chips horizontais; gráfico de evolução no footer.
- **C: Portfolio Desk** — inspirado em painéis de corretora (Avenue/Mercury): 2 colunas — esquerda com saldo consolidado + linha histórica grande; direita com watchlist de programas em linha compacta (como ações); alertas em feed no lateral.

## What to Look For
1. **Hero metric:** qual variante comunica mais rápido "quanto vale meu portfólio hoje"?
2. **Alertas vs ruído:** em qual delas você sente urgência sem ficar sufocado por cards coloridos?
3. **Densidade:** a tabela/cards de programa — compacta (C), cards padrão (A) ou chips horizontais (B)?
4. **Ações rápidas:** reduzidas a 2-3 CTAs contextuais (A, C) ou nenhuma (B, a oportunidade vira a ação)?
5. **Dark mode:** leitura confortável em uso prolongado? Cor primária aparece demais ou está equilibrada?

## Decisões implícitas em todas as 3
- Dark mode default
- Laranja primary só em 2-3 lugares por tela (CTA, destaque e accent)
- Números em JetBrains Mono para os valores grandes (sensação de "trading desk")
- Bordas subtis ao invés de stripes coloridas nas laterais dos cards
- Empty state de "Tarefas Pendentes" não ocupa coluna inteira
