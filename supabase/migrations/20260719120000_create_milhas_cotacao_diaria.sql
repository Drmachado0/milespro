-- ============================================================================
-- milhas_cotacao_diaria — cotação automática diária de milhas (1 valor/programa/dia)
-- ----------------------------------------------------------------------------
-- Fonte de dados: um módulo/scraper externo grava aqui diariamente (via cron),
-- usando a service role (que bypassa RLS). A aplicação apenas LÊ (read-only),
-- exatamente como o recurso de cotação pede.
--
-- Convenção espelhada de program_market_prices + latest_market_prices
-- (20251202202315): tabela + índice + RLS "public read" + view de "última".
--
-- Diferença de propósito:
--   - program_market_prices : cotação MANUAL, compra/venda, com fonte (a tela
--                             "Cotações Manuais do Mercado").
--   - milhas_cotacao_diaria : cotação AUTOMÁTICA diária, 1 valor (milheiro),
--                             série temporal p/ gráficos de evolução.
-- ============================================================================

CREATE TABLE public.milhas_cotacao_diaria (
  date             DATE          NOT NULL,
  programa         TEXT          NOT NULL,
  cotacao_milheiro NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (date, programa)
);

-- RLS: leitura pública (dado de mercado, não sensível). Escrita só via service
-- role (o scraper), que bypassa RLS — não há policy de INSERT/UPDATE de propósito.
ALTER TABLE public.milhas_cotacao_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily miles quotes"
ON public.milhas_cotacao_diaria
FOR SELECT
USING (true);

-- Acelera "última por programa" (DISTINCT ON) e "histórico por programa+intervalo".
-- (date DESC casa com o ORDER BY da view abaixo e com filtros de range.)
CREATE INDEX idx_milhas_cotacao_programa_date
ON public.milhas_cotacao_diaria (programa, date DESC);

-- View da cotação mais recente por programa (espelha latest_market_prices).
-- O painel lê isto via PostgREST: GET /rest/v1/latest_milhas_cotacao
-- (opcionalmente ?programa=eq.SMILES). Retorna 1 linha por programa.
CREATE OR REPLACE VIEW public.latest_milhas_cotacao AS
SELECT DISTINCT ON (programa)
  date,
  programa,
  cotacao_milheiro
FROM public.milhas_cotacao_diaria
ORDER BY programa, date DESC;
