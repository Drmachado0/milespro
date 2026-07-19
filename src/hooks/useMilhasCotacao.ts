import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Camada de leitura da COTAÇÃO AUTOMÁTICA DIÁRIA de milhas (MilesPro).
 *
 * Fonte de dados (Supabase Postgres, read-only):
 *   - tabela `milhas_cotacao_diaria`  → 1 valor (milheiro) por programa por dia.
 *   - view   `latest_milhas_cotacao`  → a linha mais recente por programa.
 *
 * A escrita é feita pelo scraper diário (service role) — estes hooks só LEEM,
 * via PostgREST (o "REST automático" do Supabase). Equivalência com a API REST
 * que foi especificada:
 *   [1] GET /cotacao/{programa}/{date}            → useCotacaoDia
 *   [2] GET /cotacao/ultima?programa=...          → useCotacaoUltima
 *   [3] GET /cotacao/historico?programa=&start=&end → useCotacaoHistorico
 *   [4] /health                                    → o Supabase já expõe status
 *
 * `programa` segue o que o scraper grava (ex.: 'SMILES', 'LATAM_PASS', 'TUDOAZUL').
 */

export interface CotacaoMilhas {
  /** Data da cotação, formato 'YYYY-MM-DD'. */
  date: string;
  /** Código do programa, ex.: 'SMILES', 'LATAM_PASS', 'TUDOAZUL'. */
  programa: string;
  /** Preço do milheiro (R$/1000 milhas). */
  cotacao_milheiro: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida o formato YYYY-MM-DD (equivalente ao 400 "data inválida" da API). */
function assertDate(label: string, value: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(
      `Data inválida em "${label}": use o formato YYYY-MM-DD (recebi "${value}").`,
    );
  }
}

/**
 * [1] Cotação de um programa em um dia específico.
 * Retorna a linha ou `null` quando não há cotação naquele dia (equivale ao 404).
 * A query só roda quando `programa` e `date` estão presentes.
 */
export function useCotacaoDia(programa?: string, date?: string) {
  return useQuery({
    queryKey: ['milhas-cotacao', 'dia', programa, date],
    enabled: !!programa && !!date,
    staleTime: 5 * 60 * 1000, // 5 min — casa com useMarketPrices
    queryFn: async (): Promise<CotacaoMilhas | null> => {
      assertDate('date', date!);
      const { data, error } = await supabase
        .from('milhas_cotacao_diaria')
        .select('date, programa, cotacao_milheiro')
        .eq('programa', programa!)
        .eq('date', date!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * [2] Cotação mais recente por programa (lê a view `latest_milhas_cotacao`).
 * - Com `programa`: a lista traz 1 item (ou vazia se o programa não tiver dado).
 * - Sem `programa`: uma linha por programa existente.
 */
export function useCotacaoUltima(programa?: string) {
  return useQuery({
    queryKey: ['milhas-cotacao', 'ultima', programa ?? 'todos'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CotacaoMilhas[]> => {
      let query = supabase
        .from('latest_milhas_cotacao')
        .select('date, programa, cotacao_milheiro');
      if (programa) query = query.eq('programa', programa);

      const { data, error } = await query.order('programa', { ascending: true });
      if (error) throw error;
      // A view sempre reflete colunas NOT NULL da tabela; cast documentado.
      return (data ?? []) as CotacaoMilhas[];
    },
  });
}

/**
 * [3] Histórico de um programa no intervalo [start_date, end_date], crescente
 * por data — pronto pra plotar a evolução da cotação no painel.
 * A query só roda com os três parâmetros presentes.
 */
export function useCotacaoHistorico(
  programa?: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ['milhas-cotacao', 'historico', programa, startDate, endDate],
    enabled: !!programa && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CotacaoMilhas[]> => {
      assertDate('start_date', startDate!);
      assertDate('end_date', endDate!);
      const { data, error } = await supabase
        .from('milhas_cotacao_diaria')
        .select('date, programa, cotacao_milheiro')
        .eq('programa', programa!)
        .gte('date', startDate!)
        .lte('date', endDate!)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CotacaoMilhas[];
    },
  });
}
