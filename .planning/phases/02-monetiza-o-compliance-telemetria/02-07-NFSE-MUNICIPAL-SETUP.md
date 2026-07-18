# NFS-e Municipal Setup — Phase 2 W3 (PAY-08)

Owner: founder + contador. Esse setup é pré-requisito para `invoice: { enabled: true }` em `create-checkout-session` funcionar contra api.asaas.com — sem ele, Asaas rejeita o subscription create com erro de municipal settings ausente.

> Cross-refs: `02-RESEARCH.md §2.7 NFS-e prerequisites`, `02-07-CUTOVER-RUNBOOK.md §6 NFS-e verification`, `02-07-PLAN.md must_haves truth #9`.

---

## Objetivo

Habilitar a emissão automática de NFS-e pelo Asaas a cada cobrança recorrente. O Asaas atua como **emissor terceirizado** — recebe o pagamento, calcula ISS conforme município, emite a NFS-e na prefeitura, envia o PDF/XML por email ao tomador. Sem isso, o founder ficaria com débito fiscal recorrente (uma NFS-e por cliente por mês não emitida = não conformidade ISS).

Decisão estratégica: usar o bundle Asaas no v1 (D-22 do CONTEXT). Plano de saída para v2: avaliar eNotas + emissão própria via API municipal quando MRR > R$ 10K/mês (MED-08).

---

## Por que precisa do contador

Cada município brasileiro tem regras próprias para NFS-e:

| Variável | Onde vem |
|----------|----------|
| Código municipal do serviço (CMC)         | Lei municipal de ISS — contador conhece |
| ID do código no catálogo Asaas            | Consulta `GET /v3/municipalServices` — Asaas mapeia |
| Nome do serviço (texto livre)             | Padronizado por contador — "Software como Serviço (SaaS)" |
| Alíquota ISS                              | Lei municipal — geralmente 2-5% |
| Inscrição Municipal (CCM)                 | Cadastro do CNPJ no município — contador providencia |
| Regime tributário do prestador            | Simples Nacional, Lucro Presumido, etc. — contador define |

SaaS tipicamente mapeia para CMC **`01.07`** ou **`01.05`** ("Licenciamento ou cessão de direito de uso de programas de computação", lista anexa à LC 116/2003). Mas o código exato e a alíquota **variam por município** — São Paulo, Rio, Belo Horizonte têm tabelas próprias.

---

## Contador conversation checklist

Pergunte ao contador (1 conversa, 15-30 min):

1. **CCM ativo?** Confirme que o CNPJ tem inscrição municipal no município X. Se ainda não, contador providencia (1-5 dias úteis, depende do município).
2. **CMC exato para SaaS?** "Qual código municipal de serviço devo usar para emitir NFS-e de uma assinatura de software (SaaS)?" — anote o código (ex: `01.07.10`, `1.05.07`, etc.; formato varia).
3. **Alíquota ISS?** "Qual a alíquota de ISS para esse código no município X?" — número decimal (ex: `2.9`, `5.0`).
4. **Regime tributário?** "Estamos no Simples Nacional / Lucro Presumido — alguma observação fiscal para a NFS-e?" (Simples permite retenção diferente; relevante para o `municipalServiceName`).
5. **Texto de discriminação preferido?** Padrão usado neste runbook: `"Software como Serviço (SaaS) — MilesPro"`. Contador pode pedir variação por razões de fiscalização.
6. **Periodicidade de envio fiscal?** "Vou precisar entregar declaração mensal de ISS retido na fonte? Quem entrega — Asaas ou contador?" — captura responsabilidade de DAS/DES-IF.

**Output desejado da conversa:**

```
Município:        São Paulo (exemplo)
CCM:              12345678
CMC:              01.07.10
municipalServiceName: Software como Serviço (SaaS) — MilesPro
ISS rate:         2.9
Regime:           Simples Nacional Anexo III
Cidade IBGE code: 3550308 (São Paulo)
```

Guarde isso no password manager + dropbox compartilhado com contador. **Não commitar em git** (informação privada do PJ).

---

## Asaas API setup (one-time)

Depois da conversa com o contador, faça duas chamadas Asaas (assume `ASAAS_API_KEY` production já está nas mãos do founder por §2 do CUTOVER runbook):

### B.1. Garantir customer do founder existe no Asaas

Forma rápida: dispare um `create-checkout-session` como founder em produção. Isso cria automaticamente o customer no Asaas e cacheia o id em `profiles.asaas_customer_id`.

```bash
# Como founder logado (Bearer JWT da própria sessão)
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer $FOUNDER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","cycle":"monthly"}'
```

Depois capture o `customer_id`:

```sql
SELECT asaas_customer_id FROM public.profiles WHERE id = '<FOUNDER_UUID>';
-- Esperado: cus_xxxxx... (não null)
```

(A subscription criada ficará pending; pode ser cancelada via Asaas Dashboard depois — não bloqueia o setup.)

### B.2. Lookup do municipalServiceId no catálogo Asaas

Substitua `$CITY_IBGE_CODE` pelo código IBGE do município do PJ (consulta com contador ou em https://www.ibge.gov.br/explica/codigos-dos-municipios.php).

```bash
curl -s "https://api.asaas.com/v3/municipalServices?cityCode=$CITY_IBGE_CODE" \
  -H "access_token: $ASAAS_API_KEY" | jq
```

O JSON volta uma lista com items tipo:

```json
{
  "data": [
    {
      "id": "ms_xyz123",
      "code": "01.07.10",
      "description": "Licenciamento ou cessão de direito de uso de programas de computação"
    },
    ...
  ]
}
```

Pegue o `id` correspondente ao `code` que o contador deu (`01.07.10` no exemplo) e guarde como `$MUNICIPAL_SERVICE_ID`.

### B.3. POST municipalSettings no customer do founder

```bash
curl -i -X POST "https://api.asaas.com/v3/customers/$FOUNDER_CUSTOMER_ID/municipalSettings" \
  -H "access_token: $ASAAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "municipalServiceId": "'"$MUNICIPAL_SERVICE_ID"'",
    "municipalServiceCode": "'"$MUNICIPAL_SERVICE_CODE"'",
    "municipalServiceName": "Software como Serviço (SaaS) — MilesPro",
    "issTax": '"$ISS_RATE"'
  }'
# Esperado: HTTP 200, JSON ecoa a configuração.
```

Confirme idempotência (re-chamada deve retornar o mesmo estado, não 409):

```bash
curl -s "https://api.asaas.com/v3/customers/$FOUNDER_CUSTOMER_ID/municipalSettings" \
  -H "access_token: $ASAAS_API_KEY" | jq
# Esperado: 200 com municipalServiceCode + issTax conforme posto em B.3.
```

---

## Decisão: extensão para todos os customers vs. account default

§B.3 configurou apenas o customer do founder. Para que **todos os clientes pagantes** tenham NFS-e emitida, Asaas precisa do mesmo settings em cada um dos seus customers.

Duas opções:

### Opção (a) — backend automation (5 linhas em create-checkout-session)

Após o customer create no `getOrCreateAsaasCustomer`, faça um POST adicional para `/customers/{id}/municipalSettings` com valores armazenados em secret de edge fn (`ASAAS_MUNICIPAL_SERVICE_ID`, `ASAAS_MUNICIPAL_SERVICE_CODE`, `ASAAS_ISS_RATE`).

- ✅ Pros: zero ops burden, novos customers nascem configurados.
- ❌ Cons: code change + redeploy + manutenção do secret quando município ou CMC mudar.

### Opção (b) — account default no Asaas (recomendado)

Abra um ticket Asaas Support: "Quero aplicar municipalSettings padrão na minha conta — todos os novos customers herdam (municipalServiceId, code, issTax)." Asaas pode (ou não) suportar — depende da política deles.

- ✅ Pros: zero código.
- ❌ Cons: depende de Asaas; pode demorar; pode não existir.

**Decisão default deste runbook:** começar por (b). Se Asaas responder em < 3 dias úteis com "não suportamos" ou "feito", revisar. Se "não suportamos", implementar (a) em um plan W3.1 de 30 minutos (5 linhas + 1 test + redeploy).

Tracker desse fork: anotar resultado da conversa Asaas Support neste arquivo abaixo:

```
Asaas Support ticket #XXXXX
Aberto em: YYYY-MM-DD
Resposta: ___________________________________________
Decisão final: ___________________________________________
```

---

## Webhook events NFS-e ([ASSUMED] per RESEARCH §2.7)

A documentação Asaas reference de eventos webhook traz:

- `INVOICE_AUTHORIZED` — NFS-e emitida e autorizada pela prefeitura (~15 min após `PAYMENT_RECEIVED`).
- `INVOICE_ERROR` — falha na emissão (API municipal fora do ar, dados inconsistentes, regime tributário mismatch).
- `INVOICE_CANCELED` — NFS-e cancelada (estorno, por exemplo).

**[ASSUMED]** o RESEARCH não confirmou nomes exatos — provavelmente são esses pelo padrão Asaas, mas **capture o nome real após o primeiro evento real chegar em `webhook_events`** e atualize esta lista. Não falhe o runbook se o nome for ligeiramente diferente.

Quando `INVOICE_ERROR` dispara:

1. Asaas Dashboard → Notas Fiscais → filtre por "Erro" → veja a NFS-e quebrada.
2. Asaas geralmente mostra a mensagem de erro municipal (ex: "Inscrição municipal inválida", "Código de serviço não permitido", "Sistema da prefeitura indisponível").
3. Clique "Tentar novamente" depois que o sistema municipal voltar (transitório) ou ajuste os dados (consistência).
4. Se for problema fiscal recorrente, abrir conversa com contador.

---

## Verificação pós-setup (após o smoke do CUTOVER §5)

Após o founder pagar a R$ 37,90 do smoke + 15 min:

- [ ] Asaas Dashboard → Notas Fiscais → NFS-e do founder visível
- [ ] Status: "Autorizada" (não "Em processamento" persistente nem "Erro")
- [ ] PDF baixável; tomador (founder), prestador (founder PJ), discriminação, ISS — tudo correto
- [ ] Email "Sua nota fiscal está disponível" chegou na inbox do founder (Asaas envia automaticamente)
- [ ] Linha no `webhook_events` com `event_type ILIKE '%INVOICE%'` e `status='processed'`

Se algum item falhar, **não rollback** do cutover — NFS-e é recuperável manualmente. Trate como tax debt + abre ticket Asaas. Pagamento já entrou; o problema é só a nota.

---

## Deferred para v2 (MED-08 no RESEARCH)

- Dedicated tax automation (eNotas) — quando MRR > R$ 10K/mo e o volume de notas fizer sentido pagar um vendor especializado.
- Self-issued NFS-e via API municipal direta (skip Asaas bundle) — só útil se o bundle Asaas tiver problemas crônicos ou se quisermos descontar o custo de Asaas/parcela.
- Multi-município por customer (cliente em SP comprando assinatura emitida por PJ em RJ — Asaas decide; revisitar quando primeiro caso aparecer).
- NFS-e estornada quando refund — verificar se Asaas faz isso automaticamente após `PAYMENT_REFUNDED` ou se precisamos cancelar manualmente; documentar após o smoke do §7 do CUTOVER runbook.
