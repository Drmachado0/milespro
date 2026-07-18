# Feature Landscape — MilesPro

**Domain:** SaaS de gestão de milhas e pontos no Brasil
**Researched:** 2026-05-11
**Milestone context:** brownfield, primeiros 10 pagantes
**Overall confidence:** MEDIUM-HIGH (Brazilian competitor websites and reviews give consistent signal; pricing data is partial)

---

## Overview

O mercado brasileiro de gestão de milhas/pontos é dominado por programas locais (Livelo, Smiles, TudoAzul, Esfera, LATAM Pass) que **não expõem APIs públicas estáveis**. Toda a categoria opera, na prática, com **entrada manual de saldos** — ou, no caso de profissionais (consultores/milheiros), com planilhas próprias. Os "líderes" se dividem em duas tribos:

1. **Apps de pessoa física (PF)** — Oktoplus, AwardWallet, Iddas Milhas (vertical PF), HotMilhas, Smiles/TudoAzul/LATAM apps oficiais. Foco: saldo, vencimento, alerta de promoção.
2. **Sistemas de profissional / milheiro** — SisMilhas, GeMilhas, Iddas Milhas (modo gestor), Control Milhas, SimpliMilhas. Foco: multi-CPF, custo médio do milheiro (CPM), gestão de clientes, comissões, fluxo de caixa.

**MilesPro mira o sweet-spot raro:** PF Free/Pro com qualidade de UX de Oktoplus + porta de entrada VIP que rouba o consultor iniciante de SisMilhas/GeMilhas (sem o overhead financeiro/contábil deles). Isso casa direto com o tier model Free / Pro / VIP do `PROJECT.md`.

**Implicação central para v1:** ninguém vai cobrar com credibilidade no Brasil sem (a) cobertura completa dos 4 programas core, (b) alerta de vencimento confiável, (c) calculadora de "vale a pena" (CPM) e (d) algum diferencial defensável. Para o tier VIP, o diferencial é **multi-CPF sem upcharge por conta** — exatamente como SisMilhas/GeMilhas se posicionam.

---

## Competitor Scan

| Player | Tipo | Tier free? | Preço pago | Ponto forte | Ponto fraco | Onde MilesPro ganha |
|--------|------|------------|-----------|-------------|-------------|---------------------|
| **Oktoplus** | App PF (BR) | Sim, robusto | ~R$ 14,90/mês Premium | Notificação push, alerta de vencimento por equipe humana no Premium, marketplace de venda de milhas, app maduro iOS/Android | UX legada, foco grande em "vender milhas" (afasta usuário casual), monetização fragmentada | UX moderna shadcn, foco em decisão (não em revenda), tier VIP claro |
| **AwardWallet** | App global, suporta BR | Sim, mas alerta de vencimento limitado a 3 programas | US$ 30/ano (Plus) | Cobertura de 700+ programas, exporta Excel, gerencia múltiplas pessoas, agrega itinerário de viagem | UX gringa, programas BR às vezes quebram (depende de scraping não oficial), preço em USD desencoraja | Localização total BR, planos em BRL, UX otimizada para os 4 programas core |
| **Iddas Milhas** | Sistema profissional | 15 dias trial | Não público | Cashflow, emissão de orçamento, multi-CPF ilimitado, alertas de vencimento | Visualmente datado, posicionado pra milheiro pro (intimida PF) | MilesPro Free/Pro entra antes do usuário virar profissional |
| **SisMilhas** | Sistema profissional | Garantia 7 dias | Anual (não público; estimado R$ 50-80/mês) | Multi-CPF/cartão/clube ilimitado sem custo por conta, CPM automático, relatórios fiscais | Foco 100% profissional, sem versão "consumer" | Ponte natural: usuário Pro do MilesPro vira VIP quando quiser virar consultor |
| **GeMilhas** | Sistema profissional | Não claro | "Faturável de R$ 1-2k/cliente em 1 mês" segundo marketing | Painel de comissão para gestor + cedente, controle de lucro, dashboard pro consultor | Linguagem 100% B2B, exclui usuário comum | MilesPro VIP cobre 80% do valor do GeMilhas a fração do preço |
| **Control Milhas / SimpliMilhas** | Sistema profissional nicho | Trial 3 dias (Simpli) | Não público | 18 calculadoras, 10 relatórios (Control); foco agência (Simpli) | Marca pequena, sem app mobile robusto | Mobile + Web nativo do MilesPro |
| **HotMilhas** (app) | App de revenda | Sim | Grátis (revenue via venda) | Estimativa de valor das milhas, dashboard de pontos a expirar | É um broker, não um gestor — conflito de interesse | MilesPro neutro em conselhos |
| **Smiles app, TudoAzul app, LATAM Pass app, Livelo app, Esfera app** | Apps oficiais dos programas | Grátis | — | Dado verdadeiro em tempo real, push de promoção do próprio programa | Cada um é um silo; usuário precisa abrir 4 apps; cada um quer empurrar SEU produto | Visão unificada, sem viés comercial |
| **Mobills calc, calculadora apps avulsos** | Calculadoras isoladas | Grátis | — | Simples, viral | Não persistem dado, sem alerta, sem histórico | MilesPro junta a calculadora ao saldo real do usuário |

> **Nota sobre "Mileslog" e "Pontos pra Voar":** A pesquisa não confirmou "Mileslog" como produto ativo no Brasil em 2026 (provavelmente nome confundido com Iddas Milhas / SisMilhas / Iddas Log). "Pontos pra Voar" é portal editorial (notícias e dicas), não app de gestão — concorre por atenção de leitor mas não por feature.

---

## Features by Category

### 1. Account & Programs (entrada de dados)

**O que é:** Como o usuário cadastra programas, contas, e atualiza saldos.

**Realidade do mercado BR:** Todos os concorrentes sérios usam **entrada manual** como base. Oktoplus tem "conexão" com programas mas, na prática, é screen-scraping/login delegado — instável e juridicamente cinza. Os 4 programas alvo (Livelo, Smiles, TudoAzul, Esfera) **não têm API pública para terceiros**. APIs B2B existem (Moblix), mas são caras e voltadas a busca de passagens, não a leitura de saldo de cliente.

**Pitfall confirmado:** O `PROJECT.md` já decide corretamente: *"Importação automática via scraping dos programas — Risco legal e técnico alto"*. Isso é validado pelo mercado: Oktoplus relata constantemente saldos desatualizados quando os programas mudam o front-end de login.

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Cadastro manual de saldo por programa (Livelo, Smiles, TudoAzul, Esfera) | **Free** | Table stake absoluto. Sem isso o produto não existe. Todos competidores oferecem. |
| Adicionar mais programas além dos 4 core (LATAM Pass, Iberia Plus, ALL Accor, Multiplus residual, etc) | **Free** | Diferencial barato — codebase já modela "programa genérico" no DB. Não custa nada habilitar. |
| Edição de saldo a qualquer momento, com data do registro | **Free** | Confiança no dado do usuário > pretensão de dado mágico. Espelha planilha que ele já usa. |
| **Limite de N programas/contas no Free** (TIER-02 do PROJECT) | **Free** com cap | Recomendação: cap em **3 programas + 5 contas** total. Menos que isso parece mesquinho; mais que isso não cria pressão para upgrade. Validar com primeiros 10 pagantes. |
| Histórico de movimentação (entrada/saída de pontos) | **Pro** | Diferencia do "só ver saldo agora". Espelha o extrato dos apps oficiais mas unificado. |
| Cadastro de cartões de crédito acumuladores | **Pro** | Conexão com origem dos pontos — útil pra consultor PF e fundamental pra VIP. |
| Cadastro de clubes (Clube Smiles, Clube TudoAzul, Clube Livelo, Esfera Mais) | **Pro** | Permite alertar sobre renovação de mensalidade vs valor recebido em pontos. |
| Importação via OFX / CSV | **DEFERRED** | Programas não exportam OFX. Excel manual de planilha legada do usuário é nicho. Reavaliar v2 só se >30% dos primeiros pagantes pedirem. |
| Conexão "automática" via Plaid/Belvo/Pluggy | **DEFERRED** | Belvo/Pluggy cobrem cartões e contas bancárias, **não programas de fidelidade**. Não existe equivalente brasileiro pra fidelidade. v2+. |

### 2. Saldos (visualização)

**O que é:** Como o usuário vê tudo que tem, somado, comparável.

**Realidade do mercado BR:** Dashboards similares em todos os apps. Oktoplus mostra valor estimado em R$ usando CPM de mercado. AwardWallet mostra saldo bruto. Apps oficiais dos programas mostram só seu próprio silo. **O diferencial real é "valor consolidado em R$"** — isso é o que faz o usuário largar a planilha.

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Dashboard com saldo de todos os programas | **Free** | Já existe no codebase. Table stake. |
| Conversão em R$ usando CPM médio de mercado (atualizado mensalmente) | **Free** | Diferencial vs apps oficiais, baixo custo (tabela manualmente atualizada). HotMilhas e Oktoplus já fazem. |
| Gráfico de evolução do patrimônio em pontos (últimos 12 meses) | **Pro** | Move da "foto" para "filme". Diferencial Pro óbvio. |
| Distribuição por programa (pizza, %) | **Free** | Trivial de implementar, alto impacto visual no onboarding. |
| Comparativo "se eu vendesse hoje" vs "se eu usasse em passagem" (CPM venda vs CPM resgate) | **Pro** | Decisão #1 do usuário avançado. Diferencial defensável. |

### 3. Vencimentos & Alertas

**O que é:** O motivo #1 pelo qual usuário busca app de gestão de milhas. Reclame Aqui está cheio de "perdi 80.000 pontos sem aviso".

**Realidade do mercado BR:** Programas oficiais avisam **mal** (e-mail entra em spam, sem push robusto). Esse é literalmente o trauma que move o mercado. Oktoplus Premium oferece "atendente humano alertando" como upsell. AwardWallet limita alerta a 3 programas no free — o paywall mais agressivo deles é exatamente esse.

**Decisão de monetização:** O `PROJECT.md` já marca **TIER-03**: alertas de vencimento e simulações reservados para Pro+. **Recomendação ajustada:** alerta de vencimento mais óbvio (>90d) deve ser Free; alertas inteligentes (multi-canal, antecipação configurável, agrupados) ficam Pro+. Alerta de vencimento totalmente paywallado vai gerar review ruim e contar contra LGPD ("vocês sabiam e não me avisaram").

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Cadastro de data de vencimento por lote de pontos | **Free** | Sem isso nenhum alerta funciona. Modelo de dado básico. |
| Alerta in-app de vencimento próximo (>30 dias) | **Free** | Hygiene. Não cobrar disso evita churn ruim e review negativa. |
| Notificação push (mobile) e e-mail de vencimento | **Pro** | Multi-canal é o pulo. Custa infra (transactional email + push backend). |
| Alerta antecipado configurável (60/90/180 dias) | **Pro** | Personalização = valor de assinatura. Imita Oktoplus Premium. |
| **Alerta de promoção de transferência** (Livelo→Smiles, Esfera→LATAM Pass etc) com bônus | **Pro** | Killer feature. Mercado tem essas promos QUASE TODO MÊS (até 90% de bônus). Oportunidade de centavos no milheiro. **Maior justificativa de assinar Pro.** |
| Alerta de promoção integrado ao saldo do usuário ("você tem 40k Livelo, transfere agora pra Smiles e vira 72k") | **Pro** | Personalização da promoção = MilesPro vs blogs (Melhores Destinos, Passageiro de Primeira). |
| Integração com Google Calendar para vencimentos | **Pro** | Já existe no codebase (edge function). Move pra Pro como diferencial. |
| Alerta humano / "concierge" (atendente confirma) | **DEFERRED** | Oktoplus faz. Custo operacional alto, não escala com 1 dev. v2+ se houver demanda VIP. |
| Alerta de promoção via WhatsApp | **DEFERRED** | Oportunidade real, mas WhatsApp Business API é custo + compliance Meta. Email + push cobre 90%. v1.x. |

### 4. Decision Tools

**O que é:** O que faz o usuário sentir que o app é "inteligente" e justifica preço.

**Realidade do mercado BR:** Calculadoras avulsas são abundantes (Mobills, e-Milhas, TopCalcNow, app "Calculadora de Milhas" da Play Store). Mas **nenhuma é integrada ao saldo real do usuário em um app único**. Esse é o sweet-spot.

**Conceito-âncora:** "vale a pena" é a frase que o usuário brasileiro digita no Google. CPM (custo por milheiro) é a métrica de mercado. R$ 21/milheiro é o "preço justo" comum.

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Calculadora "vale a pena emitir com milhas?" (preço da passagem em R$ vs custo em milhas + taxas) → CPM | **Free** | É calculadora pública. Cobrar disso é absurdo e bloqueia viralidade ("usei a calculadora do MilesPro"). |
| Calculadora integrada ao saldo do usuário ("você tem 80k Smiles, esta passagem custa 60k → você tem ✓") | **Pro** | Integração com dado do usuário é o que escala da calculadora pública pro app pago. |
| **Transfer Optimizer** — "você quer 60k Smiles, melhor caminho: 30k Livelo + bônus 80% = 54k + 6k transferência" | **Pro** | Killer pro tier Pro. Concorrentes globais têm (NerdWallet, Travel-on-Points). No BR, ninguém faz bem. Defensável tecnicamente, baixo custo de implementação (tabela de razões + bônus ativo). |
| Simulador "se eu transferir X pontos com promoção atual, viro Y milhas" | **Pro** | Subset do transfer optimizer. Standalone também tem valor. |
| Comparador "vender milhas vs usar em passagem" — usando CPM de mercado de revenda | **Pro** | Específico Brasil (mercado de revenda é maduro: HotMilhas, MaxMilhas, 123Milhas[fechado], Cash Milhas). |
| "Custo médio das minhas milhas" (CPM de aquisição) | **VIP** | Métrica do milheiro/consultor — quanto custou pra ele acumular cada milheiro vs quanto vende/usa. SisMilhas faz disso a feature central. |
| Sugestão automática de uso ("você tem 50k Smiles vencendo em 60d, sugestões de destinos:") | **Pro** | Engagement diário, não só "abro pra ver saldo". Pode usar API pública de busca de passagens (Moblix paga; alternativa: scraping leve do site Smiles ou cobrar do usuário a busca manual). Simplificar v1: lista de destinos populares por preço médio em milhas. |
| Recomendação de destino baseada em valor por milha | **DEFERRED** | Requer feed de preços de passagens em tempo real → custo de API ou risco de scraping. v1.x. |
| Calculadora de "antecipação de vencimento" (vale pagar pra estender milhas Smiles?) | **Pro** | Smiles oferece reativação paga. Ninguém calcula se vale. Diferencial pequeno mas defensável. |

### 5. Multi-CPF & VIP (consultor / família)

**O que é:** O motivo de existir o tier VIP. `PROJECT.md` é categórico (`TIER-04`, `TIER-05`, decisão "Multi-CPF / afiliados são exclusivos VIP no v1").

**Realidade do mercado BR:** É exatamente AQUI que SisMilhas/GeMilhas/Iddas vencem. Eles cobram entre R$ 50-150/mês com pitch direto: "gerencie milhas de N clientes/familiares sem pagar por conta extra". O segmento é real e está disposto a pagar. **MilesPro VIP é a porta de entrada para esse segmento** — antes que o usuário escale pra ferramenta profissional pesada.

**Crítico:** Multi-CPF sem upcharge por conta é o que fecha venda. SisMilhas faz disso ponto central de marketing. Cobrar por CPF adicional = perder pra eles instantaneamente.

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Múltiplos CPFs/perfis no mesmo login (mãe, pai, filhos; ou clientes do consultor) | **VIP** | Diferencial central VIP. Sem isso o tier não justifica preço. |
| Quantidade ilimitada de CPFs/contas dentro do VIP | **VIP** | SisMilhas/GeMilhas usam isso como anti-friction. MilesPro precisa igualar. |
| Switcher rápido entre perfis (UI) | **VIP** | UX. Sem isso multi-CPF vira inferno. |
| Visão consolidada cross-CPF (saldo total da família) | **VIP** | Diferencial de "gestor familiar" do `PROJECT.md`. Útil pra mãe que gerencia milhas dos filhos. |
| Tags/labels de cliente (consultor identifica "João Silva — cliente desde 03/2026") | **VIP** | Espelha CRM leve do GeMilhas. Necessário pra consultor profissional iniciante. |
| Notas privadas por CPF/conta (ex: "senha do programa", "estratégia: acumular pra família ir pra Disney 2027") | **VIP** | Função de "caderno do consultor". Diferencial barato. |
| Permissão de visualização "view only" pra cliente do consultor | **VIP** | "Cliente do consultor abre app e vê só seu painel" — diferencial pesado, mas ATENÇÃO: requer convite/auth dedicada. **Recomendação: deferir pro v1.1.** Versão v1: consultor exporta PDF e manda. |
| Painel de comissão por cliente | **DEFERRED** | GeMilhas faz disso bandeira. v1: deferido. Razão: requer modelagem de transação financeira que vira buraco sem fim. v1.1+ se VIPs pedirem. |
| Área de afiliados MilesPro (`TIER-05` do PROJECT) | **VIP** | Indicação rastreável. Modelagem simples (cupom + tracking link). Cabe no v1 se for MVP de cupom; tracking refinado é v1.1. |
| White-label (consultor com a própria marca) | **OUT-OF-SCOPE** | Já decidido em `PROJECT.md`. v2+. |

### 6. Reports / Export

**O que é:** Materializar valor em algo "tangível" que o usuário leva pra fora do app.

**Realidade do mercado BR:** PDF é universal. Excel é demanda do consultor. Compartilhamento social ainda nascente.

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Exportação PDF de saldos atuais | **Free** | Já existe no codebase (lazy-loaded). Manter free aumenta percebimento de qualidade. |
| Exportação PDF detalhada (por programa, com vencimentos, gráficos) | **Pro** | Versão "rica" justifica o tier. |
| Exportação Excel/CSV | **Pro** | Demanda do power-user. AwardWallet faz no Plus. |
| Relatório mensal automático por e-mail (resumo do mês) | **Pro** | Engagement passivo. Email transacional é barato. |
| Relatório consolidado multi-CPF (família/clientes) | **VIP** | Pré-requisito pra consultor. Espelha SisMilhas. |
| Relatório fiscal (movimentações com data, valor, programa — útil pra IR de quem vende milhas) | **VIP** | SisMilhas faz disso ponto de venda. Diferencial técnico pequeno; valor percebido alto. |
| Relatório com logo/branding do consultor (versão básica) | **DEFERRED** | Beira white-label. v1.1+. |

### 7. Mobile-Specific

**O que é:** Razões pra usuário ter app instalado e não só usar web. `PROJECT.md` decide explicitamente: web + iOS + Android no v1.

**Realidade do mercado BR:** Push notification é o motivo central pra app existir nesse domínio. Widget é nice-to-have. Apps oficiais (Smiles, Latam Pass) já fazem push das suas próprias promoções; MilesPro precisa fazer push do que importa pro USUÁRIO (não pro programa).

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Push notification de vencimento | **Pro** | Junto com alertas Pro. Mobile sem push é só uma webview. |
| Push notification de promoção de transferência | **Pro** | Killer pra Pro. Dispara quando promo Livelo→Smiles ativa. |
| Login biométrico (Face ID / impressão digital) | **Free** | Hygiene moderna. Capacitor já suporta nativo. |
| Modo offline (visualizar último saldo conhecido sem internet) | **Free** | Trivial com cache local. UX melhor. |
| Widget iOS/Android (saldo total na home) | **Pro** | Engagement. Capacitor não suporta widgets nativos out-of-box; requer plugin nativo customizado. **Considerar deferir pro v1.1**, mas mencionar no marketing como roadmap. |
| Apple Wallet pass para passagens emitidas com milhas | **DEFERRED** | Requer integração com cias aéreas (não temos). v2+. |
| Quick action de "atualizar saldo" via 3D Touch / long press no ícone | **DEFERRED** | Marginal. v1.x. |

### 8. Outros (auth / hygiene / monetização)

| Feature | Tier | Justificativa |
|---------|------|---------------|
| Login email/senha | **Free** | Já existe (Supabase). |
| Login Google / Apple OAuth | **Free** | Reduz fricção de signup mobile. Recomendação: incluir no v1 (Supabase suporta). |
| 2FA (TOTP) | **Pro** | Diferencial de segurança. Compliance LGPD. Atrai usuário que perdeu milhas em fraude (existe no Reclame Aqui). |
| Trial 7d Pro automático no signup | **n/a** | Já planejado em `PAY-06`. Padrão SaaS. |
| Dark mode | **Free** | shadcn já suporta. Só ligar. Efeito UX desproporcional ao custo. |
| Onboarding guiado (cadastro dos 4 programas core em <2min) | **Free** | Critical para conversão. Já existe no codebase. Polir. |

---

## Tier Matrix (resumo executivo)

Mapeamento concreto pra alimentar TIER-01 do `PROJECT.md`.

| Feature | Free | Pro | VIP |
|---------|:----:|:---:|:---:|
| **ENTRADA DE DADOS** |
| Cadastro manual saldo (4 programas core) | ✓ | ✓ | ✓ |
| Programas além dos 4 core (LATAM Pass, Iberia, Accor etc) | ✓ | ✓ | ✓ |
| Limite de programas/contas | 3 prog / 5 contas | ilimitado | ilimitado |
| Histórico de movimentação | — | ✓ | ✓ |
| Cadastro de cartões + clubes | — | ✓ | ✓ |
| **SALDOS** |
| Dashboard consolidado | ✓ | ✓ | ✓ |
| Conversão em R$ (CPM mercado) | ✓ | ✓ | ✓ |
| Gráfico evolução 12 meses | — | ✓ | ✓ |
| Comparativo CPM venda vs CPM resgate | — | ✓ | ✓ |
| **VENCIMENTOS / ALERTAS** |
| Alerta in-app vencimento >30d | ✓ | ✓ | ✓ |
| Push + email vencimento | — | ✓ | ✓ |
| Antecipação configurável (60/90/180d) | — | ✓ | ✓ |
| Alerta promoção transferência personalizado | — | ✓ | ✓ |
| Integração Google Calendar | — | ✓ | ✓ |
| **DECISION TOOLS** |
| Calculadora "vale a pena" pública | ✓ | ✓ | ✓ |
| Calculadora integrada ao saldo | — | ✓ | ✓ |
| Transfer Optimizer | — | ✓ | ✓ |
| Comparador vender vs usar | — | ✓ | ✓ |
| CPM de aquisição (custo médio) | — | — | ✓ |
| Sugestão automática de uso | — | ✓ | ✓ |
| **MULTI-CPF / VIP** |
| Múltiplos CPFs (ilimitado) | — | — | ✓ |
| Switcher de perfil + visão consolidada | — | — | ✓ |
| Tags + notas por cliente | — | — | ✓ |
| Área de afiliados (cupom MVP) | — | — | ✓ |
| **REPORTS** |
| PDF saldo atual | ✓ | ✓ | ✓ |
| PDF detalhado | — | ✓ | ✓ |
| Excel/CSV | — | ✓ | ✓ |
| Relatório mensal por email | — | ✓ | ✓ |
| Relatório consolidado multi-CPF | — | — | ✓ |
| Relatório fiscal | — | — | ✓ |
| **MOBILE** |
| Login biométrico | ✓ | ✓ | ✓ |
| Modo offline (cache) | ✓ | ✓ | ✓ |
| Push notifications | — | ✓ | ✓ |
| Widget home (se viável v1) | — | ✓ | ✓ |
| **HYGIENE** |
| Email + Google + Apple login | ✓ | ✓ | ✓ |
| 2FA | — | ✓ | ✓ |
| Dark mode | ✓ | ✓ | ✓ |

**Pricing benchmark sugerido (validar com primeiros 10 pagantes):**
- Free: R$ 0 (com cap de 3 programas / 5 contas)
- Pro: R$ 19,90/mês ou R$ 199/ano (sweet-spot entre Oktoplus R$ 14,90 e AwardWallet ~R$ 15/mês equivalente; +R$ 5 pagam o "transfer optimizer + multi-canal alerts")
- VIP: R$ 49,90/mês ou R$ 499/ano (40-60% do que SisMilhas/GeMilhas cobram, posicionado como "consultor iniciante / família grande")
- Trial 7d Pro automático no signup (já planejado em `PAY-06`)

---

## Anti-Features (NÃO construir no v1, com razão)

| Anti-Feature | Por que NÃO | O que fazer no lugar |
|--------------|-------------|---------------------|
| **Scraping/login delegado nos programas** | Risco legal (programas proíbem em ToS), risco técnico (quebra mensalmente), risco de marca (vazamento = "vou processar a MilesPro"). Já decidido em `PROJECT.md`. | Entrada manual + lembretes inteligentes. Esperar APIs oficiais. |
| **Marketplace de venda de milhas (broker)** | Já decidido em `PROJECT.md`. HotMilhas/MaxMilhas/Cash Milhas dominam, requer compliance financeiro (custódia), e introduz conflito de interesse. | Integrar como info ("CPM de mercado hoje em HotMilhas: X") sem custodiar transação. |
| **Busca/compra de passagens** | Fora do core value (`PROJECT.md`). API Moblix custa, mercado é dominado por agências. | Linkar pra busca dos próprios programas. |
| **Programa de loyalty próprio do MilesPro** | Já decidido. Meta-camada não precisa ter sua própria moeda. | Foco em afiliados (cupom de indicação Pro/VIP). |
| **White-label total / multi-tenant empresa** | Já decidido. Mudaria modelo de negócio. | Manter foco PF + consultor individual VIP. |
| **Social feed / compartilhamento de viagens** | Já decidido. Diluiria foco. | Compartilhamento simples (link de PDF) basta. |
| **Suporte multi-moeda (USD, EUR)** | Já decidido. Mercado-alvo BR. | BRL puro v1; USD opcional só na visualização (v1.1). |
| **Cobrar por número de CPFs no VIP** | SisMilhas vende exatamente "ilimitado sem upcharge". Cobrar por CPF = perder o pitch. | VIP fixo, ilimitado dentro de uso razoável (rate limit anti-abuso). |
| **Concierge humano (atendente avisa de vencimento)** | Não escala com 1 dev. Oktoplus faz, mas é o único upsell deles e tem equipe. | Automação inteligente (multi-canal + antecipação configurável) cobre 95% do valor percebido. |
| **WhatsApp Business para alertas** | Custo Meta + compliance. Push + email cobre 90%. | v1.x se houver demanda repetida. |
| **Integração com cias aéreas pra emitir bilhete dentro do app** | Sem parceria oficial (e nenhum app de gestão tem). | Linkar pro site do programa quando user clica "emitir". |

---

## Deferred (boas ideias, NÃO no v1, com razão clara)

| Feature | Tier-alvo | Por que NÃO v1 | Quando reavaliar |
|---------|-----------|----------------|------------------|
| Importação OFX/CSV | Pro | Programas BR não exportam OFX; uso real seria importar planilha legada (nicho pequeno). | Se >30% dos primeiros 10 pagantes pedirem |
| Conexão automática via Belvo/Pluggy | Pro | Não cobrem programas de fidelidade BR (só bancos). | v2+ se Belvo/Pluggy expandir |
| Recomendação de destino com preço real | Pro | Requer API paga (Moblix) ou scraping. Custo $/risco alto pra MVP. | v1.1 com Moblix se LTV justificar |
| Permissão "view only" pra cliente do consultor | VIP | Requer modelagem de auth dedicada (auth multi-papel). | v1.1 quando primeiros VIPs reclamarem |
| Painel de comissão por cliente (gestor) | VIP | Modelagem financeira complexa, vira buraco sem fim no v1. | v1.1+ se 3+ VIPs pedirem |
| Widget iOS/Android home | Pro | Capacitor não suporta widgets nativos out-of-box. | v1.1 com plugin nativo |
| Concierge humano | VIP | Requer equipe. Não cabe solo dev. | Pós-50 pagantes VIP |
| Alerta via WhatsApp | Pro | WhatsApp Business API tem custo + compliance Meta. | v1.x se push+email não converter |
| Apple Wallet pass de passagens | Pro | Requer integração com cias. | v2+ |
| Versão multi-moeda (USD) | Pro | Mercado BR primeiro. | v2+ |

---

## Recomendações para o Roadmap

1. **Fase "credibilidade pra cobrar"** (alinha com PAY-* e SEC-*): Free funcional + Pro com **alerta de promoção de transferência** + **transfer optimizer** = razão #1 pra assinar Pro. Sem isso, cobrar R$ 19,90 vira "porque sim".

2. **Fase "VIP defensável"** (alinha com TIER-04, TIER-05): multi-CPF ilimitado + relatório consolidado familiar + relatório fiscal + área de afiliados (cupom MVP). Suficiente pra cobrar R$ 49,90 sem competir de frente com SisMilhas no preço deles.

3. **Fase "mobile vale a pena"** (alinha com LAUNCH-02, LAUNCH-03): push notifications no Pro são pré-requisito pro mobile fazer sentido. Sem push, app é webview cara.

4. **Anti-pattern a evitar**: paywallar o alerta básico de vencimento. Vai gerar review 1-estrela e contrariar a expectativa do usuário ("o programa não me avisou e o app cobrou pra avisar"). Manter alerta in-app >30d no Free; cobrar só pelo extra (multi-canal + antecipação configurável + promoção).

5. **Validação com primeiros 10 pagantes**: medir conversão Free→Pro especificamente quando usuário (a) bate o cap de 3 programas, (b) recebe primeira notificação Free de vencimento e (c) primeiro alerta de promoção de transferência ativa (paywall preview). Esses três triggers viram a base do funil.

---

## Sources

**Apps PF brasileiros:**
- [Oktoplus — Controle seus pontos](https://www.oktoplus.com.br/) — base do tier free + alertas
- [Oktoplus Premium (R$ 14,90/mês)](https://blog.oktoplus.com.br/conhecendo-a-conta-oktoplus-premium/) — benchmark de preço Pro
- [Oktoplus análise Pontos pra Voar](https://pontospravoar.com/oktoplus-aplicativo-gerenciamento-milhas/)
- [AwardWallet (PT-BR)](https://awardwallet.com/pt/) — concorrente global
- [AwardWallet análise Plus Milhas](https://plusmilhas.com.br/awardwallet/) — limite 3 programas no free
- [AwardWallet análise Pontos pra Voar](https://pontospravoar.com/awardwallet-aplicativo-gerenciamento-milhas/)
- [HotMilhas app](https://apps.apple.com/br/app/hotmilhas-negocie-suas-milhas/id1544510993) — broker concorrente
- [AceleraPontos](https://acelerapontos.app/) — alerta promoção concorrente

**Sistemas profissionais (referência VIP):**
- [SisMilhas — multi-CPF ilimitado](https://sismilhas.com.br/sismilhas-gestao-eficiente-de-pontos-e-milhas/) — pitch "sem custo por conta"
- [GeMilhas — painel comissão](https://gemilhas.com.br/) — modelo consultor
- [Iddas Milhas](https://milhas.iddas.com.br/) — gestão multi-conta
- [Control Milhas](https://controlmilhas.com) — calculadoras + relatórios
- [SimpliMilhas](https://simplimilhas.com.br) — agências

**Programas oficiais (table stakes):**
- [Smiles app](https://www.smiles.com.br/home), [Radar Smiles](https://www.smiles.com.br/radar-app-smiles)
- [Livelo](https://www.livelo.com.br/milhas)
- [LATAM Pass app](https://latampass.latam.com/pt_br/vem-com-milhas/como-baixar-e-usar-o-app-latam-pass-para-acompanhar-suas-milhas)

**Decision tools / calculadoras:**
- [Mobills calculadora pontos/milhas](https://www.mobills.com.br/calculadoras/calculadora-valor-pontos-milhas/)
- [Mobills calculadora pontos vs dinheiro](https://www.mobills.com.br/calculadoras/calculadora-passagem-pontos-milhas-dinheiro/)
- [Como calcular CPM (FlyPass)](https://flypass.ai/post/como-calcular-valor-milhas-aereas)
- [Entendendo o CPM (EPM)](https://estevampelomundo.com.br/milhas-e-pontos/entendendo-o-cpm-para-maximizar-o-valor-das-milhas/)
- [Transfer Partner Tool global](https://transferpartnertool.com/)
- [NerdWallet airline transfer tool](https://www.nerdwallet.com/article/travel/airline-point-transfers-and-partner-award-bookings-tool)

**Promoções de transferência (validação do alerta como killer feature):**
- [Smiles + Livelo até 90% bônus](https://passageirodeprimeira.com/transfira-livelo-smiles-bonus/)
- [Smiles + Livelo retrospectiva 2025](https://passageirodeprimeira.com/retrospectiva-2025-as-melhores-ofertas-de-transferencia-de-pontos-do-cartao/)
- [Melhores Destinos transferência mensal](https://www.melhoresdestinos.com.br/milhas/pontos-dinheiro-livelo-smiles-bonus-mar26)

**Reclamações de vencimento (validação do alerta como dor):**
- [Reclame Aqui Smiles — vencimento](https://www.reclameaqui.com.br/smiles/preciso-saber-quando-vencem-minhas-milhas-e-nao-encontro-a-opcao-e-nem-com_beqbQCO1g_S8A2_G/)
- [Reclame Aqui TudoAzul — falta de alerta](https://www.reclameaqui.com.br/tudo-azul/descaso-falta-de-alerta-para-vencimento-de-milhas_tQZl8FrJsHlDicAU/)
- [Vazamento de dados em programas de fidelidade — JusBrasil](https://www.jusbrasil.com.br/artigos/programas-de-fidelidade-invasao-de-conta-vazamento-de-dados-e-furto-de-milhas-saiba-o-que-fazer/2034860442)

**Programas comparativo Brasil:**
- [Esfera vs Livelo 2025](https://embarqueprioritario.com/milhas/programas-de-fidelidade/esfera-ou-livelo-onde-acumular-pontos-em-2025/)
- [Programas de pontos no Brasil 2025](https://www.mixvale.com.br/2025/01/17/programas-de-pontos-no-brasil-qual-oferece-mais-vantagens-e-abrange-mais-parceiros/)
- [API Moblix (única opção paga real de busca)](https://suporte.moblix.com.br/hc/pt-br/articles/360037571914-Documenta%C3%A7%C3%A3o-da-API-de-Voos-e-Milhas-Flights-and-Loyalty-Program-API)

**Confidence breakdown:**
- HIGH: identificação dos competidores BR e seus pontos fortes (múltiplas sources independentes), realidade do mercado de entrada manual, table stakes (alerta de vencimento, calculadora CPM)
- MEDIUM: pricing benchmark Pro/VIP (apenas Oktoplus tem preço público; SisMilhas/GeMilhas pediram contato), tier mapping específico (validar com primeiros 10 pagantes)
- LOW: existência de "Mileslog" (não confirmado — provável confusão de nome), demanda exata por widget mobile, conversão real do "transfer optimizer" como killer feature (hipótese fundamentada mas não validada)
