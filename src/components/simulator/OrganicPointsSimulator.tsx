import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/hooks/useLocalization';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { cn } from '@/lib/utils';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const DESCRIPTION = {
  title: 'Simulador de Pontos Orgânicos',
  description: 'Calcule quantos pontos você acumula com gastos no cartão de crédito e seu valor potencial de venda.',
  steps: [
    'Informe o valor da sua fatura do cartão em reais',
    'A cotação do dólar é atualizada automaticamente (ou edite manualmente)',
    'Configure a taxa de pontos por dólar do seu cartão',
    'Defina o preço de venda esperado por milheiro',
  ],
  tips: [
    'Cartões premium costumam ter taxas de 2.0 a 3.0 pontos/dólar',
    'Use o indicador "LIVE" para saber se a cotação está atualizada',
    'O valor de venda é uma estimativa baseada no preço de mercado',
  ],
};

export function OrganicPointsSimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { rate: liveRate, source, isLoading: rateLoading, refetch: refetchRate } = useExchangeRate();
  const { prices, isLoading: pricesLoading } = useMarketPrices();
  
  const [inputs, setInputs] = useState({
    invoiceValue: 0,
    dollarRate: 5.50,
    pointsPerDollar: 1.0,
    salePricePerThousand: 20.0,
  });

  // Debounce inputs for smoother calculations
  const debouncedInputs = useDebouncedValue(inputs, 150);

  // Update dollar rate when live rate is fetched
  useEffect(() => {
    if (!liveRate) return;
    setInputs(prev => (
      liveRate !== prev.dollarRate ? { ...prev, dollarRate: liveRate } : prev
    ));
  }, [liveRate]);

  // Get average market sell price for reference
  const avgMarketSellPrice = useMemo(() => {
    if (!prices || prices.length === 0) return null;
    const total = prices.reduce((sum, p) => sum + p.sell_price, 0);
    return total / prices.length;
  }, [prices]);

  const handleChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({
      ...inputs,
      [field]: parseFloat(e.target.value) || 0,
    });
  };

  const simulation = useMemo(() => {
    if (debouncedInputs.dollarRate <= 0) return { points: 0, saleValue: 0, valueInDollars: 0 };
    const valueInDollars = debouncedInputs.invoiceValue / debouncedInputs.dollarRate;
    const points = Math.floor(valueInDollars * debouncedInputs.pointsPerDollar);
    const saleValue = (points / 1000) * debouncedInputs.salePricePerThousand;
    return { points, saleValue, valueInDollars };
  }, [debouncedInputs]);

  const isLiveRate = source !== 'fallback';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5 text-primary" />
            Pontos Orgânicos
          </CardTitle>
          <div className="flex items-center gap-2">
            <SimulatorDescription {...DESCRIPTION} />
            <div className="flex items-center gap-1.5 border-l pl-2 ml-1">
              {isLiveRate ? (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Wifi className="h-3 w-3" />
                  {source}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetchRate()}
                disabled={rateLoading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", rateLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor da Fatura (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.invoiceValue || ''}
              onChange={handleChange('invoiceValue')}
              placeholder="0,00"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Cotação do Dólar (R$)
              {isLiveRate && <span className="text-success text-[10px]">LIVE</span>}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.dollarRate}
              onChange={handleChange('dollarRate')}
              className={cn("h-9", isLiveRate && "border-success/50")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pontos/Dólar</Label>
            <Input
              type="number"
              step="0.1"
              value={inputs.pointsPerDollar}
              onChange={handleChange('pointsPerDollar')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Preço Venda (R$/mil)
              {avgMarketSellPrice && (
                <span className="text-muted-foreground text-[10px]">
                  Méd: {formatCurrency(avgMarketSellPrice)}
                </span>
              )}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.salePricePerThousand}
              onChange={handleChange('salePricePerThousand')}
              className="h-9"
            />
          </div>
        </div>

        {/* Intermediate calculation */}
        {inputs.invoiceValue > 0 && (
          <div className="text-xs text-muted-foreground text-center bg-muted/30 rounded-lg py-2">
            {formatCurrency(inputs.invoiceValue)} ÷ {formatCurrency(inputs.dollarRate)} = 
            <span className="font-medium text-foreground ml-1">
              ${formatNumber(simulation.valueInDollars, 2)} USD
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/30">
            <p className="text-xs text-muted-foreground mb-1">Pontos Estimados</p>
            <p className="font-mono text-xl font-bold text-primary tabular-nums tracking-tight">
              {formatNumber(simulation.points)} pontos
            </p>
          </div>
          <div className="bg-success/10 rounded-lg p-4 text-center border border-success/30">
            <p className="text-xs text-muted-foreground mb-1">Valor de Venda</p>
            <p className="font-mono text-xl font-bold text-success tabular-nums tracking-tight">
              {formatCurrency(simulation.saleValue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
