import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, TrendingDown, TrendingUp, Target, Send, Info, CheckCircle2, ThumbsUp, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const SOURCE_PROGRAMS = ['Livelo', 'Esfera', 'Átomos', 'Loop', 'Itaú Pontos'];
const DEST_PROGRAMS = ['Smiles', 'TudoAzul', 'Latam', 'TAP', 'Ibéria', 'AAdvantage', 'MileagePlus'];

const DESCRIPTION = {
  title: 'Simulador de Transferência Bonificada',
  description: 'Calcule o custo final ao transferir pontos para milhas aéreas durante promoções de bônus.',
  steps: [
    'Selecione os programas de origem e destino',
    'Informe a quantidade a transferir ou ative "Meta" para calcular por orçamento',
    'Digite a porcentagem de bônus da promoção',
    'Adicione custos extras como taxas de transferência se houver',
  ],
  tips: [
    'Bônus de 80-100% são comuns e muito atrativos',
    'Use o modo "Meta" quando tiver um orçamento definido',
    'Compare o custo final com o preço de mercado do programa destino',
  ],
};

export function BonusTransferSimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { getPrice, getPriceComparison } = useMarketPrices();
  
  const [reverseMode, setReverseMode] = useState(false);
  const [sourceProgram, setSourceProgram] = useState<string>('');
  const [destProgram, setDestProgram] = useState<string>('');
  const [inputs, setInputs] = useState({
    quantity: 10000,
    totalBudget: 150,
    originalCost: 15.0,
    bonusPercent: 80,
    transferFee: 0,
  });

  // Debounce inputs for smoother calculations
  const debouncedInputs = useDebouncedValue(inputs, 150);

  // Update originalCost when source program is selected
  const handleSourceChange = (program: string) => {
    setSourceProgram(program);
    const price = getPrice(program);
    if (price) {
      setInputs(prev => ({ ...prev, originalCost: price.buy_price }));
    }
  };

  const handleChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({
      ...inputs,
      [field]: parseFloat(e.target.value) || 0,
    });
  };

  const simulation = useMemo(() => {
    let quantityToTransfer: number;
    let totalMilesAfterBonus: number;
    let totalCost: number;

    if (reverseMode) {
      totalCost = debouncedInputs.totalBudget;
      const availableForMiles = debouncedInputs.totalBudget - debouncedInputs.transferFee;
      quantityToTransfer = debouncedInputs.originalCost > 0 ? (availableForMiles / debouncedInputs.originalCost) * 1000 : 0;
      totalMilesAfterBonus = quantityToTransfer * (1 + debouncedInputs.bonusPercent / 100);
    } else {
      quantityToTransfer = debouncedInputs.quantity;
      totalMilesAfterBonus = debouncedInputs.quantity * (1 + debouncedInputs.bonusPercent / 100);
      totalCost = (quantityToTransfer / 1000) * debouncedInputs.originalCost + debouncedInputs.transferFee;
    }

    const finalCostPerThousand = totalMilesAfterBonus > 0 ? (totalCost / totalMilesAfterBonus) * 1000 : 0;
    const savings = debouncedInputs.originalCost - finalCostPerThousand;
    const savingsPercent = debouncedInputs.originalCost > 0 ? (savings / debouncedInputs.originalCost) * 100 : 0;

    return {
      quantityToTransfer,
      totalMilesAfterBonus,
      totalCost,
      finalCostPerThousand,
      savings,
      savingsPercent,
      isPositive: savings > 0,
    };
  }, [debouncedInputs, reverseMode]);

  // Get market comparison for destination program
  const destPriceComparison = destProgram 
    ? getPriceComparison(destProgram, simulation.finalCostPerThousand) 
    : null;

  const getSavingsColor = (percent: number) => {
    if (percent >= 40) return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' };
    if (percent >= 20) return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' };
    return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' };
  };

  const savingsColors = getSavingsColor(simulation.savingsPercent);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferência Bonificada
          </CardTitle>
          <div className="flex items-center gap-2">
            <SimulatorDescription {...DESCRIPTION} />
            <div className="flex items-center gap-1.5 border-l pl-2 ml-1">
              <Label className="text-xs text-muted-foreground">Meta</Label>
              <Switch
                checked={reverseMode}
                onCheckedChange={setReverseMode}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Program Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Programa Origem
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Atualiza o custo com preço de mercado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select value={sourceProgram} onValueChange={handleSourceChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione">
                  {sourceProgram && (
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={sourceProgram} size="xs" />
                      <span>{sourceProgram}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SOURCE_PROGRAMS.map(program => {
                  const price = getPrice(program);
                  return (
                    <SelectItem key={program} value={program}>
                      <div className="flex items-center gap-2">
                        <ProgramLogo program={program} size="xs" />
                        <span>{program}</span>
                        {price && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatCurrency(price.buy_price)}/mil
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Programa Destino
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Compara o custo final com mercado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select value={destProgram} onValueChange={setDestProgram}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione">
                  {destProgram && (
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={destProgram} size="xs" />
                      <span>{destProgram}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DEST_PROGRAMS.map(program => {
                  const price = getPrice(program);
                  return (
                    <SelectItem key={program} value={program}>
                      <div className="flex items-center gap-2">
                        <ProgramLogo program={program} size="xs" />
                        <span>{program}</span>
                        {price && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatCurrency(price.sell_price)}/mil
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dados da Promoção */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Send className="h-3.5 w-3.5" />
            Dados da Promoção
          </div>
          <div className="grid grid-cols-3 gap-3">
            {reverseMode ? (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Target className="h-3 w-3 text-primary" />
                  Orçamento Total (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputs.totalBudget}
                  onChange={handleChange('totalBudget')}
                  className="h-9"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade a Transferir</Label>
                <Input
                  type="number"
                  value={inputs.quantity}
                  onChange={handleChange('quantity')}
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Bônus (%)</Label>
              <Input
                type="number"
                value={inputs.bonusPercent}
                onChange={handleChange('bonusPercent')}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo Original (R$/mil)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputs.originalCost}
                onChange={handleChange('originalCost')}
                className={cn("h-9", sourceProgram && "border-primary/50")}
              />
            </div>
          </div>
        </div>

        {/* Custos Extras */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5" />
            Custos Extras
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Taxa de Transferência (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputs.transferFee}
                onChange={handleChange('transferFee')}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Market Comparison Badge */}
        {destPriceComparison && (
          <div className={cn(
            "flex items-center justify-between rounded-lg p-2 text-xs",
            destPriceComparison.status === 'excellent' && "bg-success/10 text-success",
            destPriceComparison.status === 'good' && "bg-success/10 text-success",
            destPriceComparison.status === 'fair' && "bg-warning/10 text-warning",
            destPriceComparison.status === 'high' && "bg-destructive/10 text-destructive"
          )}>
            <div className="flex items-center gap-1">
              {destPriceComparison.isBelowMarket ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              <span>
                {destProgram}: {formatCurrency(destPriceComparison.marketBuy)} - {formatCurrency(destPriceComparison.marketSell)}/mil
              </span>
            </div>
            <span className="font-medium inline-flex items-center gap-1">
              {destPriceComparison.status === 'excellent' && (<><CheckCircle2 className="h-3.5 w-3.5" />Excelente</>)}
              {destPriceComparison.status === 'good' && (<><ThumbsUp className="h-3.5 w-3.5" />Bom</>)}
              {destPriceComparison.status === 'fair' && (<><AlertTriangle className="h-3.5 w-3.5" />Justo</>)}
              {destPriceComparison.status === 'high' && (<><XCircle className="h-3.5 w-3.5" />Alto</>)}
            </span>
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {reverseMode && (
            <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/30">
              <p className="text-xs text-muted-foreground">Milhas a Transferir</p>
              <p className="text-lg font-bold text-primary">
                {formatNumber(simulation.quantityToTransfer)}
              </p>
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Milhas Finais</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(simulation.totalMilesAfterBonus)}
            </p>
          </div>
          {!reverseMode && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(simulation.totalCost)}
              </p>
            </div>
          )}
          <div className={cn(
            "rounded-lg p-3 text-center",
            simulation.isPositive ? "bg-success/10" : "bg-destructive/10"
          )}>
            <p className="text-xs text-muted-foreground">Custo Final/Mil</p>
            <p className={cn(
              "text-lg font-bold",
              simulation.isPositive ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(simulation.finalCostPerThousand)}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center border",
            savingsColors.bg,
            savingsColors.border
          )}>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              {simulation.isPositive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              Economia
            </p>
            <p className={cn("text-lg font-bold", savingsColors.text)}>
              {formatNumber(simulation.savingsPercent, 1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
