import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  Loader2, 
  Save, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap,
  RefreshCw,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit3,
  Clock,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  ClipboardPaste
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { useLocalization } from '@/hooks/useLocalization';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { 
  PROGRAMAS_PONTOS, 
  CIAS_BRASIL, 
  CIAS_AMERICAS, 
  CIAS_EUROPA, 
  CIAS_ASIA,
  ALL_PROGRAMS,
  ProgramInfo 
} from '@/data/programs';
import { cn } from '@/lib/utils';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PROGRAM_CATEGORIES = [
  { key: 'pontos', title: 'Programas de Pontos', programs: PROGRAMAS_PONTOS, cols: 4 },
  { key: 'brasil', title: 'Cias Aéreas Brasil', programs: CIAS_BRASIL, cols: 3 },
  { key: 'americas', title: 'Américas', programs: CIAS_AMERICAS, cols: 5 },
  { key: 'europa', title: 'Europa', programs: CIAS_EUROPA, cols: 6 },
  { key: 'asia', title: 'Oriente Médio & Ásia', programs: CIAS_ASIA, cols: 4 },
];

const MARKET_SOURCES = [
  { value: 'hotmilhas', label: 'Hotmilhas' },
  { value: 'maxmilhas', label: 'MaxMilhas' },
  { value: '123milhas', label: '123Milhas' },
  { value: 'bancodemilhas', label: 'Banco de Milhas' },
  { value: 'telegram', label: 'Grupo Telegram' },
  { value: 'whatsapp', label: 'Grupo WhatsApp' },
  { value: 'corretora', label: 'Corretora Particular' },
  { value: 'manual', label: 'Outra Fonte' },
];

type PriceStatus = 'excellent' | 'good' | 'fair' | 'high' | 'unknown';

interface ProgramAnalysis {
  program: ProgramInfo;
  userPrice: number;
  marketBuy: number | null;
  marketSell: number | null;
  potentialMargin: number | null;
  status: PriceStatus;
  spread: number | null;
}

type ProgramBalancePrice = Pick<Database['public']['Tables']['program_balances']['Row'], 'program' | 'average_cost'>;

interface ManualMarketPrice {
  program: string;
  buy_price: string;
  sell_price: string;
  source: string;
}

type FreshnessStatus = 'fresh' | 'stale' | 'old';

const getFreshnessStatus = (fetchedAt: string | null): FreshnessStatus => {
  if (!fetchedAt) return 'old';
  const hours = differenceInHours(new Date(), new Date(fetchedAt));
  if (hours < 24) return 'fresh';
  const days = differenceInDays(new Date(), new Date(fetchedAt));
  if (days <= 7) return 'stale';
  return 'old';
};

const FreshnessBadge = ({ status, date }: { status: FreshnessStatus; date: string | null }) => {
  if (!date) return null;
  
  const formatted = format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  switch (status) {
    case 'fresh':
      return (
        <Badge className="bg-success/20 text-success border-success/30 text-xs gap-1">
          <Clock className="h-3 w-3" />
          Atualizado
        </Badge>
      );
    case 'stale':
      return (
        <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          Desatualizado
        </Badge>
      );
    case 'old':
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Antigo
        </Badge>
      );
  }
};

export default function PrecosProgramas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useLocalization();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [manualPrices, setManualPrices] = useState<Record<string, ManualMarketPrice>>({});
  const [hasManualChanges, setHasManualChanges] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importSource, setImportSource] = useState('manual');
  const [parsedImport, setParsedImport] = useState<{ program: string; buy: number; sell: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { prices: marketPrices, isLoading: marketLoading, refreshPrices, isRefreshing } = useMarketPrices();

  // Fetch existing program balances to get average costs
  const { data: programBalances = [], isLoading } = useQuery({
    queryKey: ['program_balances_prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_balances')
        .select('program, average_cost')
        .order('program');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Initialize prices from database or defaults
  useEffect(() => {
    const initialPrices: Record<string, string> = {};
    
    ALL_PROGRAMS.forEach((prog) => {
      const existing = (programBalances as ProgramBalancePrice[]).find((balance) => 
        balance.program?.toLowerCase() === prog.name.toLowerCase()
      );
      initialPrices[prog.name] = existing?.average_cost?.toString() || prog.defaultPrice.toString();
    });
    
    setPrices(initialPrices);
  }, [programBalances]);

  // Initialize manual prices from market data
  useEffect(() => {
    if (marketPrices?.length) {
      const initial: Record<string, ManualMarketPrice> = {};
      marketPrices.forEach(mp => {
        initial[mp.program] = {
          program: mp.program,
          buy_price: mp.buy_price?.toString() || '',
          sell_price: mp.sell_price?.toString() || '',
          source: mp.source || 'manual',
        };
      });
      setManualPrices(initial);
    }
  }, [marketPrices]);

  // Calculate program analysis with market data
  const programAnalysis = useMemo((): ProgramAnalysis[] => {
    return ALL_PROGRAMS.map((prog) => {
      const userPrice = parseFloat(prices[prog.name] || prog.defaultPrice.toString());
      const market = marketPrices?.find(m => 
        m.program?.toLowerCase() === prog.name.toLowerCase()
      );
      
      const marketBuy = market?.buy_price ?? null;
      const marketSell = market?.sell_price ?? null;
      
      let potentialMargin: number | null = null;
      let spread: number | null = null;
      let status: PriceStatus = 'unknown';
      
      if (marketBuy !== null && marketSell !== null) {
        potentialMargin = ((marketSell - userPrice) / userPrice) * 100;
        spread = ((marketSell - marketBuy) / marketBuy) * 100;
        
        if (userPrice < marketBuy * 0.9) status = 'excellent';
        else if (userPrice <= marketBuy) status = 'good';
        else if (userPrice <= (marketBuy + marketSell) / 2) status = 'fair';
        else status = 'high';
      }
      
      return {
        program: prog,
        userPrice,
        marketBuy,
        marketSell,
        potentialMargin,
        status,
        spread,
      };
    });
  }, [prices, marketPrices]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const withMarket = programAnalysis.filter(p => p.marketBuy !== null);
    
    const belowMarket = withMarket.filter(p => p.status === 'excellent' || p.status === 'good').length;
    const arbitrageOpps = withMarket.filter(p => (p.spread ?? 0) > 25).length;
    const bestMargin = withMarket.reduce((best, p) => 
      (p.potentialMargin ?? -100) > (best?.potentialMargin ?? -100) ? p : best
    , withMarket[0]);
    const avgSpread = withMarket.length > 0 
      ? withMarket.reduce((sum, p) => sum + (p.spread ?? 0), 0) / withMarket.length 
      : 0;
    
    return { belowMarket, arbitrageOpps, bestMargin, avgSpread, total: withMarket.length };
  }, [programAnalysis]);

  // Opportunities sorted by margin
  const opportunities = useMemo(() => {
    return programAnalysis
      .filter(p => p.potentialMargin !== null && p.potentialMargin > 0)
      .sort((a, b) => (b.potentialMargin ?? 0) - (a.potentialMargin ?? 0))
      .slice(0, 10);
  }, [programAnalysis]);

  const handlePriceChange = (program: string, value: string) => {
    setPrices((prev) => ({ ...prev, [program]: value }));
    setHasChanges(true);
  };

  const handleManualPriceChange = (program: string, field: keyof ManualMarketPrice, value: string) => {
    setManualPrices(prev => ({
      ...prev,
      [program]: {
        ...prev[program],
        program,
        [field]: value,
      }
    }));
    setHasManualChanges(true);
  };

  const handleAutoFillFromMarket = () => {
    const newPrices: Record<string, string> = { ...prices };
    
    marketPrices?.forEach(market => {
      if (market.buy_price) {
        // Set reference price as market buy + 5% safety margin
        const safePrice = market.buy_price * 1.05;
        newPrices[market.program] = safePrice.toFixed(2);
      }
    });
    
    setPrices(newPrices);
    setHasChanges(true);
    toast.success('Preços atualizados com base no mercado (+5% margem)');
  };

  // Parse CSV/TSV text
  const parseCSVText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const results: { program: string; buy: number; sell: number }[] = [];
    
    // Detect delimiter (semicolon, comma, or tab)
    const firstLine = lines[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    
    // Skip header if present
    const startIndex = firstLine.toLowerCase().includes('programa') || 
                       firstLine.toLowerCase().includes('program') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim().replace(/"/g, ''));
      if (parts.length >= 3) {
        const programName = parts[0];
        // Handle Brazilian number format (1.234,56 -> 1234.56)
        const buyStr = parts[1].replace(/\./g, '').replace(',', '.');
        const sellStr = parts[2].replace(/\./g, '').replace(',', '.');
        const buy = parseFloat(buyStr);
        const sell = parseFloat(sellStr);
        
        if (programName && !isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
          // Try to match program name (case-insensitive)
          const matchedProgram = ALL_PROGRAMS.find(p => 
            p.name.toLowerCase() === programName.toLowerCase() ||
            p.name.toLowerCase().includes(programName.toLowerCase()) ||
            programName.toLowerCase().includes(p.name.toLowerCase())
          );
          
          if (matchedProgram) {
            results.push({ program: matchedProgram.name, buy, sell });
          }
        }
      }
    }
    
    return results;
  };

  const handleCSVTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) {
      const parsed = parseCSVText(text);
      setParsedImport(parsed);
    } else {
      setParsedImport([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCSVTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = () => {
    if (parsedImport.length === 0) {
      toast.error('Nenhum dado válido para importar');
      return;
    }
    
    const newManualPrices = { ...manualPrices };
    parsedImport.forEach(item => {
      newManualPrices[item.program] = {
        program: item.program,
        buy_price: item.buy.toFixed(2),
        sell_price: item.sell.toFixed(2),
        source: importSource,
      };
    });
    
    setManualPrices(newManualPrices);
    setHasManualChanges(true);
    setImportDialogOpen(false);
    setCsvText('');
    setParsedImport([]);
    toast.success(`${parsedImport.length} cotações importadas com sucesso!`);
  };

  // Save user reference prices.
  // The previous version looked up "existing" rows by (program, holder_id IS NULL)
  // alone, missing an eq('user_id', user.id) filter. If RLS were ever relaxed
  // (or for an admin/service-role context), maybeSingle() could match another
  // user's row and the downstream UPDATE would target it. Scoping by user_id
  // makes the read intent explicit and matches the convention used elsewhere.
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const userId = user.id;

      const promises = ALL_PROGRAMS.map(async (prog) => {
        const priceValue = parseFloat(prices[prog.name] || '0');

        const { data: existing } = await supabase
          .from('program_balances')
          .select('id')
          .eq('user_id', userId)
          .eq('program', prog.name)
          .is('holder_id', null)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('program_balances')
            .update({ average_cost: priceValue })
            .eq('id', existing.id)
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('program_balances')
            .insert({
              user_id: userId,
              program: prog.name,
              balance: 0,
              average_cost: priceValue,
              holder_id: null,
            });

          if (error) throw error;
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program_balances_prices'] });
      queryClient.invalidateQueries({ queryKey: ['program_balances'] });
      toast.success('Preços salvos com sucesso!');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Save manual market prices
  const saveManualPricesMutation = useMutation({
    mutationFn: async () => {
      const pricesToSave = Object.values(manualPrices)
        .filter(p => p.buy_price && p.sell_price)
        .map(p => ({
          program: p.program,
          buy_price: p.buy_price,
          sell_price: p.sell_price,
          source: p.source || 'manual',
        }));

      if (pricesToSave.length === 0) {
        throw new Error('Nenhum preço válido para salvar');
      }

      const { data, error } = await supabase.functions.invoke('fetch-market-prices', {
        body: { action: 'update-manual', prices: pricesToSave },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao salvar cotações');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      toast.success('Cotações do mercado salvas com sucesso!');
      setHasManualChanges(false);
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const getStatusBadge = (status: PriceStatus) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-success/20 text-success border-success/30">Excelente</Badge>;
      case 'good':
        return <Badge className="bg-success/20 text-success border-success/30">Bom</Badge>;
      case 'fair':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Justo</Badge>;
      case 'high':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Alto</Badge>;
      default:
        return <Badge variant="outline">Sem dados</Badge>;
    }
  };

  const renderProgramCard = (analysis: ProgramAnalysis) => {
    const { program: prog, userPrice, marketBuy, marketSell, potentialMargin, status } = analysis;
    
    return (
      <div
        key={prog.name}
        className={cn(
          "p-4 rounded-lg border bg-card hover:shadow-md transition-all",
          status === 'excellent' && "border-success/50 bg-success/5",
          status === 'good' && "border-success/30",
          status === 'high' && "border-destructive/30 bg-destructive/5"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ProgramLogo program={prog.name} size="md" />
            <div className="min-w-0">
              <span className="font-medium text-foreground text-sm block truncate">{prog.name}</span>
              {prog.airline && (
                <span className="text-xs text-muted-foreground truncate block">{prog.airline}</span>
              )}
            </div>
          </div>
          {getStatusBadge(status)}
        </div>
        
        {/* User price input */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="pl-10 pr-12 text-right font-medium"
            value={prices[prog.name] || ''}
            onChange={(e) => handlePriceChange(prog.name, e.target.value)}
            placeholder={prog.defaultPrice.toFixed(2)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            /mil
          </span>
        </div>
        
        {/* Market prices */}
        {marketBuy !== null && marketSell !== null ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-success" />
                Compra
              </span>
              <span className="font-medium text-success">R$ {marketBuy.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-warning" />
                Venda
              </span>
              <span className="font-medium text-warning">R$ {marketSell.toFixed(2)}</span>
            </div>
            {potentialMargin !== null && (
              <div className={cn(
                "flex items-center justify-between text-xs pt-1 border-t border-dashed",
                potentialMargin > 0 ? "text-success" : "text-destructive"
              )}>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Margem
                </span>
                <span className="font-bold">
                  {potentialMargin > 0 ? '+' : ''}{potentialMargin.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2 border-t border-border">
            Cotação indisponível
          </div>
        )}
      </div>
    );
  };

  const renderMarketQuoteCard = (prog: ProgramInfo) => {
    const market = marketPrices?.find(m => m.program?.toLowerCase() === prog.name.toLowerCase());
    const manualPrice = manualPrices[prog.name] || { 
      program: prog.name, 
      buy_price: market?.buy_price?.toString() || '', 
      sell_price: market?.sell_price?.toString() || '',
      source: market?.source || 'manual' 
    };
    const freshness = getFreshnessStatus(market?.fetched_at || null);
    
    return (
      <div
        key={prog.name}
        className={cn(
          "p-4 rounded-lg border bg-card hover:shadow-md transition-all",
          freshness === 'fresh' && "border-success/30",
          freshness === 'stale' && "border-warning/30",
          freshness === 'old' && "border-destructive/30"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ProgramLogo program={prog.name} size="md" />
            <div className="min-w-0">
              <span className="font-medium text-foreground text-sm block truncate">{prog.name}</span>
            </div>
          </div>
          <FreshnessBadge status={freshness} date={market?.fetched_at || null} />
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Buy price */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Compra</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7 pr-2 text-right text-sm h-8"
                value={manualPrice.buy_price}
                onChange={(e) => handleManualPriceChange(prog.name, 'buy_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Sell price */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Venda</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7 pr-2 text-right text-sm h-8"
                value={manualPrice.sell_price}
                onChange={(e) => handleManualPriceChange(prog.name, 'sell_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        {/* Source */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fonte</label>
          <Select
            value={manualPrice.source}
            onValueChange={(value) => handleManualPriceChange(prog.name, 'source', value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione a fonte" />
            </SelectTrigger>
            <SelectContent>
              {MARKET_SOURCES.map(source => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Last update info */}
        {market?.fetched_at && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {format(new Date(market.fetched_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title="Milheiros de Referência">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão"
          icon={<DollarSign className="h-5 w-5" />}
          title="Milheiros de Referência"
          subtitle="Tabela de preços de mercado para comparação com seu custo médio"
        />
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Abaixo do Mercado</span>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-success">{kpis.belowMarket}</p>
              <p className="text-xs text-muted-foreground">de {kpis.total} programas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpDown className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Oportunidades</span>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-warning">{kpis.arbitrageOpps}</p>
              <p className="text-xs text-muted-foreground">spread &gt; 25%</p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Melhor Margem</span>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-primary">
                {kpis.bestMargin?.potentialMargin?.toFixed(0) ?? '-'}%
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {kpis.bestMargin?.program.name ?? '-'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Spread Médio</span>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">{kpis.avgSpread.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">mercado</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="prices" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="prices" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Meus Preços
              </TabsTrigger>
              <TabsTrigger value="market" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Cotações do Mercado
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Oportunidades
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshPrices()}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>

          <TabsContent value="prices" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAutoFillFromMarket}
                disabled={!marketPrices?.length}
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-Preencher
              </Button>
              <Button 
                size="sm"
                onClick={() => saveMutation.mutate()} 
                disabled={!hasChanges || saveMutation.isPending}
                data-tour="save-prices"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
            
            {isLoading || marketLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              PROGRAM_CATEGORIES.map((category) => {
                const categoryAnalysis = programAnalysis.filter(a => 
                  category.programs.some(p => p.name === a.program.name)
                );
                
                return (
                  <div key={category.key}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {category.title}
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`} data-tour="price-input">
                      {categoryAnalysis.map(renderProgramCard)}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Edit3 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Cotações Manuais do Mercado</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Insira os preços de compra e venda que você observa nas corretoras e grupos de milhas. 
                      Esses valores serão usados para calcular oportunidades e comparar com seus custos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
              {/* Import Dialog */}
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Importar Cotações
                    </DialogTitle>
                    <DialogDescription>
                      Cole dados de uma planilha ou faça upload de um arquivo CSV.
                      Formato esperado: <code className="bg-muted px-1 rounded">Programa;Compra;Venda</code>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* File upload */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.txt,.tsv"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Escolher Arquivo
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        ou cole os dados abaixo
                      </span>
                    </div>
                    
                    {/* Paste area */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <ClipboardPaste className="h-4 w-4" />
                        Dados (cole da planilha)
                      </label>
                      <Textarea
                        placeholder={`Programa;Compra;Venda\nLivelo;18,50;23,00\nSmiles;22,00;28,00`}
                        value={csvText}
                        onChange={(e) => handleCSVTextChange(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Aceita separadores: ponto-e-vírgula (;), vírgula (,) ou tab. 
                        Números podem usar formato brasileiro (18,50) ou americano (18.50).
                      </p>
                    </div>
                    
                    {/* Source selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Fonte das Cotações
                      </label>
                      <Select value={importSource} onValueChange={setImportSource}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a fonte" />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKET_SOURCES.map(source => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Preview */}
                    {parsedImport.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Prévia ({parsedImport.length} programas reconhecidos)
                        </label>
                        <div className="border rounded-lg max-h-48 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Programa</th>
                                <th className="text-right p-2">Compra</th>
                                <th className="text-right p-2">Venda</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedImport.map(item => (
                                <tr key={item.program} className="border-t">
                                  <td className="p-2 flex items-center gap-2">
                                    <ProgramLogo program={item.program} size="xs" />
                                    {item.program}
                                  </td>
                                  <td className="p-2 text-right text-success">
                                    R$ {item.buy.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right text-warning">
                                    R$ {item.sell.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleImportConfirm}
                      disabled={parsedImport.length === 0}
                    >
                      Importar {parsedImport.length} Cotações
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                size="sm"
                onClick={() => saveManualPricesMutation.mutate()} 
                disabled={!hasManualChanges || saveManualPricesMutation.isPending}
              >
                {saveManualPricesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Cotações
              </Button>
            </div>
            
            {marketLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              PROGRAM_CATEGORIES.map((category) => (
                <div key={category.key}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {category.title}
                  </h3>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`}>
                    {category.programs.map(renderMarketQuoteCard)}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="opportunities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-warning" />
                  Top Oportunidades de Arbitragem
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <EmptyState
                    compact
                    icon={AlertTriangle}
                    title="Nenhuma oportunidade encontrada"
                    description="Não há oportunidades de arbitragem com os preços atuais."
                  />
                ) : (
                  <div className="space-y-2">
                    {opportunities.map((opp, index) => (
                      <div 
                        key={opp.program.name}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          index === 0 && "bg-warning/10 border-warning/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <ProgramLogo program={opp.program.name} size="sm" />
                          <div>
                            <p className="font-medium">{opp.program.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Compra: R$ {opp.marketBuy?.toFixed(2)} → Venda: R$ {opp.marketSell?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Seu preço</p>
                          <p className="font-medium">R$ {opp.userPrice.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Margem</p>
                          <p className={cn(
                            "font-bold text-lg",
                            (opp.potentialMargin ?? 0) > 30 ? "text-success" : "text-warning"
                          )}>
                            +{opp.potentialMargin?.toFixed(0)}%
                          </p>
                        </div>
                        {getStatusBadge(opp.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
