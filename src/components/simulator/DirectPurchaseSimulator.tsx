import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plane, TrendingUp, TrendingDown, Info, CheckCircle2, ThumbsUp, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PROGRAMS = ['Livelo', 'Esfera', 'Smiles', 'TudoAzul', 'Latam', 'TAP', 'Ibéria'];

const DESCRIPTION = {
  title: 'Simulador de Compra Direta',
  description: 'Compare o custo de comprar milhas diretamente versus pagar a passagem em dinheiro.',
  steps: [
    'Selecione o programa de milhas (opcional, para comparar com mercado)',
    'Informe quantas milhas precisa e o preço de compra',
    'Adicione o bônus se houver promoção ativa',
    'Digite as taxas de embarque e o preço da passagem em dinheiro',
  ],
  tips: [
    'Se a economia for positiva, vale a pena usar milhas',
    'Considere promoções de compra de milhas para melhores custos',
    'Taxas de embarque em passagens premium costumam ser mais altas',
  ],
};

export function DirectPurchaseSimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { prices, getPrice, getPriceComparison } = useMarketPrices();
  
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [inputs, setInputs] = useState({
    milesQuantity: 50000,
    purchasePrice: 850,
    bonusPercent: 0,
    ticketCashPrice: 2500,
    taxesAndFees: 350,
  });

  // Debounce inputs for smoother calculations
  const debouncedInputs = useDebouncedValue(inputs, 150);

  // Auto-fill purchase price from market when program is selected
  const handleProgramChange = (program: string) => {
    setSelectedProgram(program);
    const marketPrice = getPrice(program);
    if (marketPrice) {
      // Use buy price as suggested purchase price per thousand
      const suggestedPrice = (inputs.milesQuantity / 1000) * marketPrice.buy_price;
      setInputs(prev => ({ ...prev, purchasePrice: Math.round(suggestedPrice * 100) / 100 }));
    }
  };

  const handleChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({
      ...inputs,
      [field]: parseFloat(e.target.value) || 0,
    });
  };

  const simulation = useMemo(() => {
    const totalMiles = debouncedInputs.milesQuantity * (1 + debouncedInputs.bonusPercent / 100);
    const costPerThousand = totalMiles > 0 ? (debouncedInputs.purchasePrice / totalMiles) * 1000 : 0;
    
    const totalEmissionCost = debouncedInputs.purchasePrice + debouncedInputs.taxesAndFees;
    const savings = debouncedInputs.ticketCashPrice - totalEmissionCost;
    const savingsPercent = debouncedInputs.ticketCashPrice > 0 ? (savings / debouncedInputs.ticketCashPrice) * 100 : 0;
    const roi = debouncedInputs.purchasePrice > 0 ? (savings / debouncedInputs.purchasePrice) * 100 : 0;
    
    const valuePerMile = debouncedInputs.milesQuantity > 0 
      ? (debouncedInputs.ticketCashPrice - debouncedInputs.taxesAndFees) / debouncedInputs.milesQuantity 
      : 0;

    return {
      totalMiles,
      costPerThousand,
      totalEmissionCost,
      savings,
      savingsPercent,
      roi,
      valuePerMile,
      isWorthIt: savings > 0,
    };
  }, [debouncedInputs]);

  // Get market comparison if program is selected
  const priceComparison = selectedProgram 
    ? getPriceComparison(selectedProgram, simulation.costPerThousand) 
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Simulador de Compra Direta
          </CardTitle>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Program Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            Programa (opcional)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Selecione para comparar com preços de mercado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select value={selectedProgram} onValueChange={handleProgramChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione um programa">
                {selectedProgram && (
                  <div className="flex items-center gap-2">
                    <ProgramLogo program={selectedProgram} size="xs" />
                    <span>{selectedProgram}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROGRAMS.map(program => {
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Milhas a Comprar</Label>
            <Input
              type="number"
              value={inputs.milesQuantity}
              onChange={handleChange('milesQuantity')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Preço da Compra (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.purchasePrice}
              onChange={handleChange('purchasePrice')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bônus na Compra (%)</Label>
            <Input
              type="number"
              value={inputs.bonusPercent}
              onChange={handleChange('bonusPercent')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Taxas de Embarque (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.taxesAndFees}
              onChange={handleChange('taxesAndFees')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Preço da Passagem em Dinheiro (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.ticketCashPrice}
              onChange={handleChange('ticketCashPrice')}
              className="h-9"
            />
          </div>
        </div>

        {/* Market Comparison Badge */}
        {priceComparison && (
          <div className={cn(
            "flex items-center justify-between rounded-lg p-2 text-xs",
            priceComparison.status === 'excellent' && "bg-success/10 text-success",
            priceComparison.status === 'good' && "bg-success/10 text-success",
            priceComparison.status === 'fair' && "bg-warning/10 text-warning",
            priceComparison.status === 'high' && "bg-destructive/10 text-destructive"
          )}>
            <div className="flex items-center gap-1">
              {priceComparison.isBelowMarket ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              <span>
                Mercado: {formatCurrency(priceComparison.marketBuy)} - {formatCurrency(priceComparison.marketSell)}/mil
              </span>
            </div>
            <span className="font-medium inline-flex items-center gap-1">
              {priceComparison.status === 'excellent' && (<><CheckCircle2 className="h-3.5 w-3.5" />Excelente</>)}
              {priceComparison.status === 'good' && (<><ThumbsUp className="h-3.5 w-3.5" />Bom</>)}
              {priceComparison.status === 'fair' && (<><AlertTriangle className="h-3.5 w-3.5" />Justo</>)}
              {priceComparison.status === 'high' && (<><XCircle className="h-3.5 w-3.5" />Alto</>)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Milhas Totais</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(simulation.totalMiles)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo/Mil</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(simulation.costPerThousand)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Total Emissão</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(simulation.totalEmissionCost)}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center",
            simulation.isWorthIt ? "bg-success/10" : "bg-destructive/10"
          )}>
            <p className="text-xs text-muted-foreground">Economia</p>
            <p className={cn(
              "text-lg font-bold",
              simulation.isWorthIt ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(simulation.savings)}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center col-span-2",
            simulation.roi > 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <p className="text-xs text-muted-foreground">ROI da Compra</p>
            <p className={cn(
              "font-mono text-xl font-bold tabular-nums tracking-tight flex items-center justify-center gap-2",
              simulation.roi > 0 ? "text-success" : "text-destructive"
            )}>
              <TrendingUp className="h-5 w-5" />
              {formatNumber(simulation.roi, 1)}%
            </p>
            <p className="text-xs mt-1 text-muted-foreground">
              Valor por milha: {formatNumber(simulation.valuePerMile * 100, 2)} centavos
            </p>
          </div>
        </div>

        {simulation.isWorthIt && (
          <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-2 justify-center">
            <Plane className="h-4 w-4" />
            Compra de milhas compensa para esta emissão!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
