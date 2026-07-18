# Anti-Patterns

O que NÃO fazer. Lista exaustiva com motivos.

---

## Cores

### ❌ Gradiente roxo agressivo

```tsx
// ❌
className="bg-gradient-to-br from-purple-500 to-pink-500"
className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500"
```

**Por quê:** virou tropo universal de "AI app genérico". Não comunica nada da marca.

**Em vez disso:**
- Brand orange usado com restrição
- `bg-gradient-hero` (token do design system, laranja → magenta brand)
- Radial wash sutil ao invés de gradiente diagonal

---

### ❌ Literais de cor sem token

```tsx
// ❌
<Badge className="bg-green-500 text-white">Ativo</Badge>
<div className="border-l-4 border-l-blue-500">Info</div>
className="text-orange-600"
```

**Por quê:** quebra em tema claro, não respeita branding, impossível de mudar globalmente.

**Em vez disso:**
```tsx
<Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>
className="text-primary"
```

---

### ❌ Warm beige / peach / pink canvas

```tsx
// ❌
className="bg-stone-50"
className="bg-orange-50/30"
className="bg-rose-50"
```

**Por quê:** vira o "AI canvas" — qualquer pessoa que viu 3 prompts do Claude reconhece. Não é fintech.

**Em vez disso:** `bg-background` (dark ou light según tema), `bg-card`, `bg-surface-1`.

**Exceção:** se a brand for explicitamente editorial/lifestyle (Airbnb, hotelaria, cozinha). Para fintech/SaaS/dashboard: **nunca**.

---

### ❌ Cor de status hardcoded em chart

```tsx
// ❌
<Cell fill="#22c55e" />
<Bar fill="hsl(142, 71%, 45%)" />
<Pie fill="#3b82f6" />
```

**Por quê:** não respeita tema, hex magic numbers, impossível de redesenhar globalmente.

**Em vez disso:**
```tsx
<Cell fill="hsl(var(--mp-success))" />
<Bar fill="hsl(var(--mp-info))" />
<Pie fill="hsl(var(--primary))" />
```

---

## Tipografia

### ❌ Inter em corpo de texto longo

```tsx
// ❌
<p className="font-display">{paragrafoLongo}</p>
```

**Por quê:** Inter foi otimizado pra UI/display, não pra leitura corrida. Cansa.

**Em vez disso:** `DM Sans` (font-sans, default) em prose; Inter só em headers/labels.

---

### ❌ Mono em texto narrativo

```tsx
// ❌
<p className="font-mono">Bem-vindo de volta, João.</p>
```

**Por quê:** mono é pra dados/números/código. Em prose vira "terminal aesthetic" deslocado.

**Em vez disso:** mono SÓ em valores numéricos, código, IDs, datas formatadas.

---

### ❌ Múltiplos display fonts na mesma tela

```tsx
// ❌
<h1 className="font-display">Título</h1>
<h2 className="font-serif">Subtítulo</h2>
```

**Por quê:** ruído. Sem hierarquia clara.

**Em vez disso:** um display + um body. Variação por peso/tamanho, não por família.

---

## Componentes

### ❌ Card com left-border accent rounded

```tsx
// ❌
<div className="rounded-2xl border-l-4 border-l-orange-500 bg-card p-4">
  ...
</div>
```

**Por quê:** estética de 2018, padrão de "alert box do Stripe". Já cansou.

**Em vez disso:** badge no topo do card OU eyebrow OU ícone colorido + título.

---

### ❌ Emoji em UI

```tsx
// ❌
<button>✅ Confirmar</button>
<div>🎉 Parabéns!</div>
<span>⚠️ Atenção</span>
```

**Por quê:** emoji é uma escolha de marca (e Apple/Google/MS renderizam DIFERENTE). Inconsistente, infantil em produto sério.

**Em vez disso:**
```tsx
<Button><Check className="h-4 w-4 mr-2" /> Confirmar</Button>
<div><PartyPopper className="h-5 w-5 text-warning" /> Parabéns!</div>
<AlertCircle className="h-4 w-4 text-warning" />
```

**Exceção:** emoji em conteúdo gerado pelo usuário (mensagens, posts, nicknames) — passa direto. Apenas em UI/chrome que não.

---

### ❌ Skeleton loader feito à mão

```tsx
// ❌
<div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
```

**Por quê:** não respeita tema, não tem shimmer, não é reutilizável.

**Em vez disso:** componente `<Skeleton>` do shadcn (já tem shimmer + dark/light) ou variantes específicas em `skeleton-cards.tsx`.

---

### ❌ Confirm com `window.confirm`

```tsx
// ❌
if (window.confirm('Deletar?')) {
  delete()
}
```

**Por quê:** UI nativa do browser, ignorável, quebra em mobile, sem branding.

**Em vez disso:** `<AlertDialog>` (shadcn) ou `<DeleteConfirmDialog>` (custom).

---

### ❌ Toast genérico

```tsx
// ❌
alert('Salvo!')
toast('Salvo!')
```

**Por quê:** sem hierarquia, sem ícone semântico, sem ação.

**Em vez disso:**
```tsx
toast.success('Operação salva', {
  description: '12.500 milhas adicionadas ao Livelo',
  action: { label: 'Desfazer', onClick: undo },
})
```

---

## Layout

### ❌ Tabela larga em mobile sem fallback

```tsx
// ❌
<table>
  <thead><tr>{10.columns.map(...)}</tr></thead>
  <tbody>...</tbody>
</table>
```

**Por quê:** vira scroll horizontal infame, hierarquia se perde.

**Em vez disso:**
```tsx
<div className="md:hidden">{cardList}</div>
<table className="hidden md:table">{...}</table>
```

Ou scroll horizontal explícito com gradient hint nas bordas + colunas sticky.

---

### ❌ Modal full-screen genérico em desktop

```tsx
// ❌
<Modal className="w-screen h-screen">
  <form>...</form>
</Modal>
```

**Por quê:** desperdiça contexto. Usuário perde a tela anterior.

**Em vez disso:** modal centralizado com `max-w-md/lg/xl` quando é confirmação/form pequeno. Sheet lateral quando é detalhe. Drawer bottom só em mobile.

---

### ❌ Hit target < 44px em mobile

```tsx
// ❌ (mobile)
<button className="h-8 w-8"><X className="h-4 w-4" /></button>
```

**Por quê:** Apple HIG e Material recomendam ≥44px (iOS) / ≥48dp (Android). Frustração de toque.

**Em vez disso:**
```tsx
<button className="h-11 w-11 grid place-items-center"><X className="h-4 w-4" /></button>
```

Mantém ícone pequeno, hit area grande.

---

## Copy

### ❌ Filler / stat-slop

```tsx
// ❌
<h2>10× mais rápido</h2>
<p>99.9% de uptime</p>
<p>Recomendado por milhões de usuários</p>
```

**Por quê:** invenção. Quebra confiança. Se for verdade, cita a fonte.

**Em vez disso:**
- Mostra dados reais com qualificador honesto
- Substitui por placeholder cinza se ainda não tem o número
- "Em média X (varia por programa)"

---

### ❌ Lorem ipsum em tela visível pro usuário

```tsx
// ❌
<p>Lorem ipsum dolor sit amet...</p>
<p>Feature One: Lorem ipsum</p>
```

**Por quê:** se chegou em prod, o time não testou a tela.

**Em vez disso:** copy real OU placeholder honesto ("—", "Sem dados ainda", `<EmptyState>`).

---

### ❌ "Página de ..." nos títulos

```tsx
// ❌
<PageHeader title="Página de Configurações" />
<PageHeader title="Tela de Operações" />
```

**Por quê:** redundante. O usuário já tá numa página.

**Em vez disso:** imperativo curto.

```tsx
<PageHeader title="Configurações" />
<PageHeader title="Operações" />
```

---

## Animação

### ❌ Animação em loop sem propósito

```tsx
// ❌
<div className="animate-pulse">Logo</div>
<Icon className="animate-spin" />  // <- sem ser loading
```

**Por quê:** distrai, cansa, parece broken.

**Em vez disso:** animar só em eventos (hover, focus, mount, state change). Loop animation só em loading state.

---

### ❌ Transição de cor em todo elemento

```tsx
// ❌
* {
  transition: all 200ms;
}
```

**Por quê:** custo de paint enorme, animações indesejadas em hovers/clicks.

**Em vez disso:** transição só em propriedades específicas:

```css
transition:
  background-color 200ms ease,
  color 200ms ease,
  border-color 200ms ease;
```

E só onde faz sentido. Honrar `prefers-reduced-motion: reduce`.

---

## Geral

### ❌ Mistura de design systems

```tsx
// ❌ (chakra + shadcn + mui no mesmo projeto)
import { Box } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'
import { TextField } from '@mui/material'
```

**Por quê:** estilo conflitante, bundle pesado, manutenção infernal.

**Em vez disso:** **um único** design system base (shadcn/Radix recomendado). Tudo composto em cima.

---

### ❌ Branding inconsistente entre páginas

Página A usa `bg-orange-500`, página B usa `bg-primary`, página C usa um hex. **Mesmo significado, três jeitos.**

**Em vez disso:** TODA cor de marca vem de `--primary` (token). Mudar a marca = mudar 1 valor.

---

### ❌ Acessibilidade depois ("vou ajustar no final")

```tsx
// ❌
<div onClick={fn}>...</div>  // sem role, sem tabindex
<button>{icon}</button>      // sem aria-label
<input />                    // sem label associado
```

**Por quê:** acessibilidade não é polish, é estrutura. Adicionar depois exige refazer.

**Em vez disso:** semântica desde o primeiro draft. `<button>` (não div clicável). `<label>` (não placeholder como label). `aria-label` em ícones puros. `role="dialog"` em modais.

---

## TL;DR

Se você tá pensando em fazer uma dessas, **pausa e pergunta:**

1. Existe um token / componente que já resolve isso?
2. Isso vai funcionar em tema claro?
3. Isso vai funcionar em mobile?
4. Isso vai funcionar com teclado / screen reader?
5. Daqui a 6 meses, vai ser fácil mudar globalmente?

Se a resposta de QUALQUER uma é "não", refaz o approach.
