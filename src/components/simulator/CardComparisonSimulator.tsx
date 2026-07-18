import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Trash2, RefreshCw, Wifi, WifiOff, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const DESCRIPTION = {
  title: 'Comparador de Cartões',
  description: 'Compare até 3 cartões simultaneamente para encontrar a melhor opção de upgrade.',
  steps: [
    'Adicione os cartões que deseja comparar (até 3)',
    'Informe anuidade e taxa de pontos por dólar de cada um',
    'Defina seu gasto mensal médio',
    'Analise o ranking de custo-benefício',
  ],
  tips: [
    'O troféu indica o cartão com melhor custo-benefício',
    'Cartões premium podem compensar com benefícios extras',
    'Compare sempre considerando seu perfil de gastos real',
  ],
};

interface CardData {
  id: string;
  name: string;
  annuity: number;
  pointsPerDollar: number;
  extraBenefits: number;
}

const DEFAULT_CARDS: CardData[] = [
  { id: '1', name: 'Cartão Atual', annuity: 400, pointsPerDollar: 2.0, extraBenefits: 0 },
  { id: '2', name: 'Cartão Premium', annuity: 900, pointsPerDollar: 3.0, extraBenefits: 100 },
];

export function CardComparisonSimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { rate: liveRate, source, isLoading: isLoadingRate, refetch: refreshRate } = useExchangeRate();
  
  const [cards, setCards] = useState<CardData[]>(DEFAULT_CARDS);
  const [globalInputs, setGlobalInputs] = useState({
    monthlySpend: 5000,
    dollarRate: 5.50,
    pointValue: 0.02,
  });

  // Update dollar rate when live rate is fetched
  useEffect(() => {
    if (!liveRate) return;
    setGlobalInputs(prev => (
      liveRate !== prev.dollarRate ? { ...prev, dollarRate: liveRate } : prev
    ));
  }, [liveRate]);

  const debouncedGlobalInputs = useDebouncedValue(globalInputs, 150);
  const debouncedCards = useDebouncedValue(cards, 150);

  const handleGlobalChange = (field: keyof typeof globalInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalInputs({
      ...globalInputs,
      [field]: parseFloat(e.target.value) || 0,
    });
  };

  const handleCardChange = (cardId: string, field: keyof CardData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCards(cards.map(card => 
      card.id === cardId 
        ? { ...card, [field]: field === 'name' ? e.target.value : (parseFloat(e.target.value) || 0) }
        : card
    ));
  };

  const addCard = () => {
    if (cards.length >= 3) return;
    const newId = String(Date.now());
    setCards([...cards, { 
      id: newId, 
      name: `Cartão ${cards.length + 1}`, 
      annuity: 0, 
      pointsPerDollar: 1.0,
      extraBenefits: 0,
    }]);
  };

  const removeCard = (cardId: string) => {
    if (cards.length <= 2) return;
    setCards(cards.filter(card => card.id !== cardId));
  };

  const simulation = useMemo(() => {
    const yearlySpendBRL = debouncedGlobalInputs.monthlySpend * 12;
    const yearlySpendUSD = yearlySpendBRL / debouncedGlobalInputs.dollarRate;
    const monthlySpendUSD = debouncedGlobalInputs.monthlySpend / debouncedGlobalInputs.dollarRate;

    const cardResults = debouncedCards.map(card => {
      const pointsYear = yearlySpendUSD * card.pointsPerDollar;
      const pointsValue = pointsYear * debouncedGlobalInputs.pointValue;
      const benefitsYear = card.extraBenefits * 12;
      const netBenefit = pointsValue + benefitsYear - card.annuity;
      
      return {
        ...card,
        pointsYear,
        pointsValue,
        benefitsYear,
        netBenefit,
      };
    });

    // Sort by net benefit (highest first)
    const ranked = [...cardResults].sort((a, b) => b.netBenefit - a.netBenefit);
    const bestCard = ranked[0];

    return {
      cardResults,
      ranked,
      bestCard,
      monthlySpendUSD,
      yearlySpendUSD,
    };
  }, [debouncedGlobalInputs, debouncedCards]);

  const isLiveRate = source !== 'fallback';

  const getPositionBadge = (cardId: string) => {
    const position = simulation.ranked.findIndex(c => c.id === cardId) + 1;
    if (position === 1) return <Badge className="bg-warning/20 text-warning border-warning/30"><Trophy className="h-3 w-3 mr-1" />1º</Badge>;
    if (position === 2) return <Badge variant="secondary">2º</Badge>;
    return <Badge variant="outline">3º</Badge>;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Comparador de Cartões
          </CardTitle>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1.5">
            <Label className="text-xs">Gasto Mensal (R$)</Label>
            <Input
              type="number"
              value={globalInputs.monthlySpend}
              onChange={handleGlobalChange('monthlySpend')}
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
                value={globalInputs.dollarRate}
                onChange={handleGlobalChange('dollarRate')}
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
            <Label className="text-xs">Valor do Ponto (R$)</Label>
            <Input
              type="number"
              step="0.001"
              value={globalInputs.pointValue}
              onChange={handleGlobalChange('pointValue')}
              className="h-9"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={addCard}
              disabled={cards.length >= 3}
              className="w-full h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Cartão
            </Button>
          </div>
        </div>

        {/* USD conversion display */}
        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
          <p className="text-xs text-muted-foreground">
            {formatCurrency(globalInputs.monthlySpend)} ÷ R$ {globalInputs.dollarRate.toFixed(2)} = <span className="font-medium text-foreground">${formatNumber(simulation.monthlySpendUSD, 2)} USD/mês</span>
          </p>
        </div>

        {/* Cards comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, index) => {
            const result = simulation.cardResults.find(r => r.id === card.id);
            const isBest = simulation.bestCard?.id === card.id;
            
            return (
              <div 
                key={card.id}
                className={cn(
                  "relative rounded-lg border p-4 space-y-3 transition-all",
                  isBest && "border-warning/50 bg-warning/5 ring-1 ring-warning/20"
                )}
              >
                {/* Header with position badge */}
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={card.name}
                    onChange={handleCardChange(card.id, 'name')}
                    className="h-8 font-medium text-sm"
                    placeholder="Nome do cartão"
                  />
                  <div className="flex items-center gap-1.5">
                    {getPositionBadge(card.id)}
                    {cards.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Card inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Anuidade (R$)</Label>
                    <Input
                      type="number"
                      value={card.annuity}
                      onChange={handleCardChange(card.id, 'annuity')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Pontos/Dólar</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={card.pointsPerDollar}
                      onChange={handleCardChange(card.id, 'pointsPerDollar')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Benefícios/Mês (R$)</Label>
                    <Input
                      type="number"
                      value={card.extraBenefits}
                      onChange={handleCardChange(card.id, 'extraBenefits')}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Results */}
                {result && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pontos/Ano</span>
                      <span className="font-medium">{formatNumber(result.pointsYear)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor em Pontos</span>
                      <span className="font-medium">{formatCurrency(result.pointsValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Benefícios/Ano</span>
                      <span className="font-medium">{formatCurrency(result.benefitsYear)}</span>
                    </div>
                    <div className={cn(
                      "flex justify-between text-sm font-bold pt-2 border-t",
                      result.netBenefit >= 0 ? "text-success" : "text-destructive"
                    )}>
                      <span>Saldo Líquido</span>
                      <span className="flex items-center gap-1">
                        {result.netBenefit >= 0 ? <TrendingUp className="h-4 w-4" /> : null}
                        {formatCurrency(result.netBenefit)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Winner summary */}
        {simulation.bestCard && (
          <div className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent rounded-lg p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium">{simulation.bestCard.name}</p>
              <p className="text-xs text-muted-foreground">
                Melhor custo-benefício com saldo líquido de <span className="font-medium text-success">{formatCurrency(simulation.bestCard.netBenefit)}</span>/ano
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}