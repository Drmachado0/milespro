import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, Check, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const DESCRIPTION = {
  title: 'Simulador de Upgrade de Cartão',
  description: 'Avalie se vale a pena fazer upgrade considerando pontuação por dólar gasto e benefícios.',
  steps: [
    'Informe a anuidade do cartão atual e do novo',
    'Digite seu gasto mensal médio no cartão (em R$)',
    'A cotação do dólar é atualizada automaticamente',
    'Configure as taxas de pontos por dólar de cada cartão',
    'Estime o valor mensal dos benefícios extras (salas VIP, etc.)',
  ],
  tips: [
    'Cartões premium costumam oferecer 2 a 3 pontos por dólar',
    'O indicador LIVE mostra cotação em tempo real',
    'O gasto mínimo mostra quanto você precisa gastar para compensar',
  ],
};

export function CardUpgradeSimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { rate: liveRate, source, isLoading: isLoadingRate, refetch: refreshRate } = useExchangeRate();
  
  const [inputs, setInputs] = useState({
    currentAnnuity: 400,
    newAnnuity: 900,
    monthlySpend: 5000,
    dollarRate: 5.50,
    currentPointsPerDollar: 2.0,
    newPointsPerDollar: 3.0,
    pointValue: 0.02,
    extraBenefitsValue: 100,
  });

  // Update dollar rate when live rate is fetched
  useEffect(() => {
    if (!liveRate) return;
    setInputs(prev => (
      liveRate !== prev.dollarRate ? { ...prev, dollarRate: liveRate } : prev
    ));
  }, [liveRate]);

  const debouncedInputs = useDebouncedValue(inputs, 150);

  const handleChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({
      ...inputs,
      [field]: parseFloat(e.target.value) || 0,
    });
  };

  const simulation = useMemo(() => {
    const yearlySpendBRL = debouncedInputs.monthlySpend * 12;
    const monthlySpendUSD = debouncedInputs.monthlySpend / debouncedInputs.dollarRate;
    const yearlySpendUSD = yearlySpendBRL / debouncedInputs.dollarRate;
    
    // Calculate points based on USD spending
    const currentPointsYear = yearlySpendUSD * debouncedInputs.currentPointsPerDollar;
    const currentPointsValue = currentPointsYear * debouncedInputs.pointValue;
    const currentNetBenefit = currentPointsValue - debouncedInputs.currentAnnuity;
    
    const newPointsYear = yearlySpendUSD * debouncedInputs.newPointsPerDollar;
    const newPointsValue = newPointsYear * debouncedInputs.pointValue;
    const extraBenefitsYear = debouncedInputs.extraBenefitsValue * 12;
    const newNetBenefit = newPointsValue + extraBenefitsYear - debouncedInputs.newAnnuity;
    
    const difference = newNetBenefit - currentNetBenefit;
    const isWorthUpgrade = difference > 0;
    
    // Break even calculation in BRL
    const breakEvenSpend = debouncedInputs.newPointsPerDollar > debouncedInputs.currentPointsPerDollar 
      ? ((debouncedInputs.newAnnuity - debouncedInputs.currentAnnuity - extraBenefitsYear) / 
        ((debouncedInputs.newPointsPerDollar - debouncedInputs.currentPointsPerDollar) * debouncedInputs.pointValue * 12)) * debouncedInputs.dollarRate
      : 0;

    return {
      currentPointsYear,
      newPointsYear,
      currentNetBenefit,
      newNetBenefit,
      difference,
      isWorthUpgrade,
      breakEvenSpend: Math.max(0, breakEvenSpend),
      extraPointsYear: newPointsYear - currentPointsYear,
      monthlySpendUSD,
      yearlySpendUSD,
    };
  }, [debouncedInputs]);

  const isLiveRate = source !== 'fallback';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Simulador de Upgrade de Cartão
          </CardTitle>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Anuidade Atual (R$)</Label>
            <Input
              type="number"
              value={inputs.currentAnnuity}
              onChange={handleChange('currentAnnuity')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Anuidade Nova (R$)</Label>
            <Input
              type="number"
              value={inputs.newAnnuity}
              onChange={handleChange('newAnnuity')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gasto Mensal (R$)</Label>
            <Input
              type="number"
              value={inputs.monthlySpend}
              onChange={handleChange('monthlySpend')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              Cotação Dólar (R$)
              {isLiveRate ? (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
                  <Wifi className="h-3 w-3" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
            </Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                step="0.01"
                value={inputs.dollarRate}
                onChange={handleChange('dollarRate')}
                className="h-9"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => refreshRate()}
                disabled={isLoadingRate}
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingRate && "animate-spin")} />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pontos/Dólar Atual</Label>
            <Input
              type="number"
              step="0.1"
              value={inputs.currentPointsPerDollar}
              onChange={handleChange('currentPointsPerDollar')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pontos/Dólar Novo</Label>
            <Input
              type="number"
              step="0.1"
              value={inputs.newPointsPerDollar}
              onChange={handleChange('newPointsPerDollar')}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Benefícios Extras/Mês (R$)</Label>
            <Input
              type="number"
              value={inputs.extraBenefitsValue}
              onChange={handleChange('extraBenefitsValue')}
              className="h-9"
            />
          </div>
        </div>

        {/* USD conversion display */}
        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
          <p className="text-xs text-muted-foreground">
            {formatCurrency(inputs.monthlySpend)} ÷ R$ {inputs.dollarRate.toFixed(2)} = <span className="font-medium text-foreground">${formatNumber(simulation.monthlySpendUSD, 2)} USD/mês</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Pontos/Ano Atual</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(simulation.currentPointsYear)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Pontos/Ano Novo</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(simulation.newPointsYear)}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center col-span-2",
            simulation.isWorthUpgrade ? "bg-success/10" : "bg-destructive/10"
          )}>
            <p className="text-xs text-muted-foreground">Diferença Anual</p>
            <p className={cn(
              "font-mono text-xl font-bold tabular-nums tracking-tight flex items-center justify-center gap-2",
              simulation.isWorthUpgrade ? "text-success" : "text-destructive"
            )}>
              {simulation.isWorthUpgrade ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {formatCurrency(simulation.difference)}
            </p>
            <p className="text-xs mt-1 text-muted-foreground">
              {simulation.isWorthUpgrade 
                ? "Vale a pena fazer upgrade!" 
                : "Não compensa fazer upgrade"}
            </p>
          </div>
        </div>

        {simulation.breakEvenSpend > 0 && (
          <div className="text-xs text-center text-muted-foreground">
            Gasto mensal mínimo para compensar: {formatCurrency(simulation.breakEvenSpend)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
