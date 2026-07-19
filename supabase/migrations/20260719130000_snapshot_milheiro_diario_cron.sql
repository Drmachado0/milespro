-- ============================================================================
-- snapshot_milheiro_diario — snapshot diário do milheiro automático (pg_cron)
-- ----------------------------------------------------------------------------
-- Mantém o gráfico "Evolução da Cotação" (milhas_cotacao_diaria) crescendo
-- sozinho, 100% dentro do Supabase — sem scraper externo / VPS.
--
-- Cada execução pega a ÚLTIMA cotação por programa em program_market_prices
-- (a mesma tabela que o auto-update de "Cotações do Mercado" alimenta),
-- calcula o milheiro = média(compra, venda) e grava 1 linha/dia/programa em
-- milhas_cotacao_diaria. Idempotente na PK (date, programa) — reexecuções no
-- mesmo dia apenas atualizam o valor.
--
-- pg_cron é pré-provisionado pelo Supabase — sem CREATE EXTENSION aqui
-- (mesma convenção das migrations 02-02 / 02-05).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.snapshot_milheiro_diario()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.milhas_cotacao_diaria (date, programa, cotacao_milheiro)
  SELECT
    (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    p.program,
    round(((p.buy_price + p.sell_price) / 2.0)::numeric, 2)
  FROM (
    SELECT DISTINCT ON (program) program, buy_price, sell_price
    FROM public.program_market_prices
    ORDER BY program, fetched_at DESC
  ) p
  ON CONFLICT (date, programa)
  DO UPDATE SET cotacao_milheiro = EXCLUDED.cotacao_milheiro;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.snapshot_milheiro_diario() IS
  'Grava 1 linha/dia por programa em milhas_cotacao_diaria a partir da última cotação de program_market_prices (milheiro = média compra/venda). Idempotente. Agendada via pg_cron.';

-- Só o backend (service_role) e o dono (postgres, que roda o cron) executam.
-- Frontend (anon/authenticated) NÃO pode disparar este writer.
REVOKE ALL ON FUNCTION public.snapshot_milheiro_diario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.snapshot_milheiro_diario() TO service_role;

-- Unschedule de versão anterior (reexecução idempotente da migration).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-milheiro-diario') THEN
    PERFORM cron.unschedule('snapshot-milheiro-diario');
  END IF;
END $$;

-- Diário 01:30 UTC = 22:30 BRT — captura a última cotação do dia (BRT) antes da
-- virada. Não colide com os crons existentes (02:00/03:00/04:00/05:00/08:00 UTC).
SELECT cron.schedule(
  'snapshot-milheiro-diario',
  '30 1 * * *',
  $$ SELECT public.snapshot_milheiro_diario(); $$
);

-- Self-check: falha a migration se o job não ficou agendado.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-milheiro-diario') THEN
    RAISE EXCEPTION 'snapshot-milheiro-diario cron job not scheduled';
  END IF;
END $$;
