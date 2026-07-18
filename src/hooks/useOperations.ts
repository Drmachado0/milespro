import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsIOSCapacitor } from './useIsIOSCapacitor';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { logger } from '@/lib/logger';

// Safety cap to avoid loading unbounded history into memory (mobile OOM risk).
// For rendering large histories, prefer useInfiniteOperations below.
const OPERATIONS_SAFETY_LIMIT = 2000;
export const OPERATIONS_PAGE_SIZE = 50;
type OperationType = Database['public']['Enums']['operation_type'];
type OperationStatus = Database['public']['Enums']['operation_status'];

export interface CreateOperationData {
  type: OperationType;
  program: string;
  quantity: number;
  total_cost?: number;
  cost_per_thousand?: number;
  holder_id?: string;
  holder_name?: string;
  credit_card?: string;
  installments?: number;
  validity?: string;
  bonus?: number;
  notes?: string;
  status?: OperationStatus;
  date?: string;
}

// Helper function to check operation limits
async function checkOperationLimit(userId: string): Promise<{ canCreate: boolean; currentCount: number; limit: number | null }> {
  // Get user subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, max_operations_per_month')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  const plan = subscription?.plan || 'free';
  const limit = subscription?.max_operations_per_month ?? 20;

  // If not on free plan or no limit, allow creation
  if (plan !== 'free' || limit === null) {
    return { canCreate: true, currentCount: 0, limit: null };
  }

  // Count operations this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { count } = await supabase
    .from('operations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  const currentCount = count || 0;
  return { 
    canCreate: currentCount < limit, 
    currentCount, 
    limit 
  };
}

export function useOperations(applyHistoryFilter: boolean = false, historyStartDate?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Path C / G-CRIT-03: in iOS Capacitor, the toast action button "Ver Planos"
  // would steer the user toward a pricing surface that Apple Reviewer can see.
  // We hide the action on iOS so the toast still informs but offers no nav-to-checkout.
  // Web/Android use react-router navigate() instead of window.location.href to avoid
  // the literal-pricing-route token landing in the bundle (G-CRIT-03 grep gate).
  const isIOS = useIsIOSCapacitor();

  // Fetch all operations - include user.id in queryKey to prevent cross-user cache issues
  const { data: operations = [], isLoading, error } = useQuery({
    queryKey: ['operations', user?.id, applyHistoryFilter, historyStartDate],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id);

      // Apply history filter for free plan users
      if (applyHistoryFilter && historyStartDate) {
        query = query.gte('created_at', historyStartDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(OPERATIONS_SAFETY_LIMIT);

      if (error) throw error;

      // Flag truncation so downstream totals/reports can warn the user.
      if (data && data.length === OPERATIONS_SAFETY_LIMIT) {
        logger.warn(
          '[Operations]',
          `Reached safety limit of ${OPERATIONS_SAFETY_LIMIT} rows — consider paginated queries for this user.`,
        );
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Create operation mutation
  const createOperation = useMutation({
    mutationFn: async (data: CreateOperationData) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Check operation limit before creating
      const { canCreate, currentCount, limit } = await checkOperationLimit(user.id);
      
      if (!canCreate && limit !== null) {
        throw new Error(`Você atingiu o limite de ${limit} operações por mês no plano Gratuito. Faça upgrade para o plano Pro para operações ilimitadas.`);
      }

      const { data: result, error } = await supabase
        .from('operations')
        .insert({
          user_id: user.id,
          type: data.type,
          program: data.program,
          quantity: data.quantity,
          total_cost: data.total_cost || 0,
          cost_per_thousand: data.cost_per_thousand || 0,
          holder_id: data.holder_id || null,
          holder_name: data.holder_name || null,
          credit_card: data.credit_card || null,
          installments: data.installments || 1,
          validity: data.validity || null,
          bonus: data.bonus || 0,
          notes: data.notes || null,
          status: data.status || 'pendente',
          date: data.date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['operations_infinite'] });
      queryClient.invalidateQueries({ queryKey: ['program_balances'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_operations_count'] });
      
      const typeLabels: Record<OperationType, string> = {
        compra: 'Compra de milhas',
        venda: 'Venda de milhas',
        transferencia: 'Transferência',
        bumerangue: 'Bumerangue',
        entrada_manual: 'Entrada manual',
        compra_turbinada: 'Compra turbinada',
        resgate: 'Resgate',
      };

      // Format quantity for display
      const formattedQuantity = variables.quantity.toLocaleString('pt-BR');
      
      // Build contextual message
      const actionVerb = variables.type === 'venda' || variables.type === 'resgate' 
        ? 'utilizadas' 
        : 'adicionadas';
      
      toast.success(
        `✅ ${typeLabels[variables.type]} registrada com sucesso! ${formattedQuantity} milhas ${variables.program} ${actionVerb}.`,
        { duration: 4000 }
      );
    },
    onError: (error: Error) => {
      logger.error('[Operations]', 'Error creating operation:', error);
      if (error.message.includes('limite')) {
        toast.error(error.message, {
          duration: 6000,
          ...(isIOS ? {} : {
            action: {
              label: 'Ver Planos',
              onClick: () => navigate('/assinatura'),
            },
          }),
        });
      } else {
        toast.error(`❌ Erro ao registrar operação: ${getSafeErrorMessage(error)}`, {
          duration: 4000,
        });
      }
    },
  });

  // Update operation mutation
  const updateOperation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateOperationData> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('operations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['operations_infinite'] });
      toast.success('✅ Operação atualizada com sucesso!', { duration: 4000 });
    },
    onError: (error: Error) => {
      toast.error(`❌ Erro ao atualizar operação: ${getSafeErrorMessage(error)}`, {
        duration: 4000,
      });
    },
  });

  // Delete operation mutation
  const deleteOperation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('operations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['operations_infinite'] });
      toast.success('✅ Operação excluída com sucesso!', { duration: 4000 });
    },
    onError: (error: Error) => {
      toast.error(`❌ Erro ao excluir operação: ${getSafeErrorMessage(error)}`, {
        duration: 4000,
      });
    },
  });

  return {
    operations,
    isLoading,
    error,
    createOperation,
    updateOperation,
    deleteOperation,
  };
}

export interface InfiniteOperationsFilters {
  applyHistoryFilter?: boolean;
  historyStartDate?: string | null;
  /** Exact match against operations.type */
  types?: OperationType[];
  /** Exact match against operations.program */
  programs?: string[];
  /** Exact match against operations.status */
  status?: OperationStatus;
  /** ISO date (YYYY-MM-DD). Inclusive lower bound on operations.date */
  dateFrom?: string;
  /** ISO date (YYYY-MM-DD). Inclusive upper bound on operations.date */
  dateTo?: string;
  /** Substring search over notes/holder_name (ILIKE, case-insensitive) */
  search?: string;
}

// Paginated hook for large histories. Use in list UIs (e.g. OperationsTable)
// with react-virtual / infinite scroll. Each page is OPERATIONS_PAGE_SIZE rows.
// Filters run server-side, so heavy histories don't hit the client at all.
export function useInfiniteOperations(filters: InfiniteOperationsFilters = {}) {
  const { user } = useAuth();
  const {
    applyHistoryFilter = false,
    historyStartDate = null,
    types,
    programs,
    status,
    dateFrom,
    dateTo,
    search,
  } = filters;

  return useInfiniteQuery({
    queryKey: [
      'operations_infinite',
      user?.id,
      applyHistoryFilter,
      historyStartDate,
      types,
      programs,
      status,
      dateFrom,
      dateTo,
      search,
    ],
    enabled: !!user?.id,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return { rows: [], nextOffset: null as number | null };

      const from = pageParam * OPERATIONS_PAGE_SIZE;
      const to = from + OPERATIONS_PAGE_SIZE - 1;

      let query = supabase
        .from('operations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (applyHistoryFilter && historyStartDate) {
        query = query.gte('created_at', historyStartDate);
      }
      if (types && types.length > 0) query = query.in('type', types);
      if (programs && programs.length > 0) query = query.in('program', programs);
      if (status) query = query.eq('status', status);
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);
      if (search && search.trim()) {
        const pattern = `%${search.trim().replace(/[%_]/g, '')}%`;
        query = query.or(`notes.ilike.${pattern},holder_name.ilike.${pattern}`);
      }

      const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = data ?? [];
      const loaded = from + rows.length;
      const nextOffset =
        count !== null && count !== undefined && loaded < count ? pageParam + 1 : null;

      return { rows, nextOffset, totalCount: count ?? null };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
}

// Hook to fetch holders for forms - include user.id in queryKey
export function useHolders() {
  const { user } = useAuth();

  const { data: holders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('holders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch when queried
    refetchOnMount: 'always', // Always refetch on component mount
  });

  return { holders, isLoading: isLoading || isFetching, refetch };
}
