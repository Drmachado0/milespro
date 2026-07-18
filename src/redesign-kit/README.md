# MilesPro Design Kit

Kit portável com tudo que você precisa pra aplicar o design system do MilesPro em qualquer outro repositório React + Tailwind + shadcn/ui.

---

## O que tem aqui

```
redesign-kit/
├── README.md                       ← você está aqui
├── 01-PLAYBOOK.md                  ← passo-a-passo de migração (leia primeiro)
├── 02-PADROES-VISUAIS.md           ← padrões reutilizáveis (eyebrow, mono, tokens)
├── 03-CHECKLIST-MIGRACAO.md        ← checklist pra ir conferindo
├── 04-ANTI-PATTERNS.md             ← o que NÃO fazer (AI slop, literais, etc)
├── tokens.css                      ← CSS tokens completos (dark + light + print)
├── tailwind.config.snippet.ts      ← additions pro Tailwind config
├── components/
│   ├── PageHeader.tsx              ← header padrão com eyebrow dot+glow
│   ├── EmptyState.tsx              ← empty state padronizado
│   ├── TabletSplitPane.tsx         ← layout master/detail responsivo
│   ├── MobileBottomNav.tsx         ← bottom-nav Android Material 3
│   └── MobileFAB.tsx               ← FAB speed-dial 4 ações
└── snippets/
    ├── EYEBROW-PATTERN.md          ← código pronto da assinatura visual
    └── PROMPT-CLAUDE.md            ← prompt pronto pra dar ao Claude Code num repo novo
```

---

## Fluxo rápido pra usar em outro repo

### 1. Pré-requisitos no repo destino

- React 18+
- Tailwind CSS 3+
- shadcn/ui já instalado (`Button`, `Card`, etc.)
- `lucide-react` instalado
- `clsx` + `tailwind-merge` (pro `cn()` util)

### 2. Aplicar tokens

1. Copia `tokens.css` pro repo destino (substitui ou estende `src/index.css`)
2. Mescla `tailwind.config.snippet.ts` com o `tailwind.config.ts` do repo destino
3. Garante que as fontes estão carregadas no `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### 3. Aplicar componentes

Copia os 5 arquivos de `components/` pra `src/components/layout/` e `src/components/ui/` do repo destino.

### 4. Aplicar padrões

Lê `02-PADROES-VISUAIS.md` e aplica o eyebrow + font-mono em headers e KPIs do repo destino.

### 5. Validar

Roda o checklist de `03-CHECKLIST-MIGRACAO.md` página por página.

---

## Forma mais rápida: deixar o Claude Code fazer

Abre `snippets/PROMPT-CLAUDE.md`, copia o prompt inteiro, abre o Claude Code no repo destino com permissão de escrita e cola. Ele vai aplicar tudo automaticamente.

---

## Filosofia do design

- **Dark-first.** Tokens definidos em `:root` (dark), espelhados em `.light`.
- **Brand orange (`#FF6A1A`) só em CTAs e acentos.** Nunca no chrome. Cores de status (`success/warning/destructive/info`) usadas com restrição.
- **Tipografia bipartida.** `DM Sans` body, `Inter` display, `JetBrains Mono` em 100% dos números financeiros com `tabular-nums`.
- **Eyebrow dot+glow é a assinatura visual.** Dot laranja 6px com box-shadow glow + label uppercase tracking-[0.18em]. Aparece em todo PageHeader, hero card, empty state.
- **Sem AI slop.** Sem gradiente roxo agressivo, sem emoji em UI, sem `bg-card rounded-2xl border-l-4 border-primary`, sem stat-slop inventado, sem warm beige/peach canvas.
- **Surfaces em escala numerada** (`surface.base/sunken/1-5/overlay`) — usa profundidade pra criar hierarquia, não shadow pesada.

---

## Suporte

Se precisar adaptar pra um stack diferente (Next.js, Vue, etc.), os tokens CSS funcionam direto. Só os componentes React precisam ser reescritos.
