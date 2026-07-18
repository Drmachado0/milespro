import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, TrendingDown, Percent, DollarSign, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { SimulatorDescription } from './SimulatorDescription';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

const DESCRIPTION = {
  title: 'Simulador de ROI',
  description: 'Calcule o retorno sobre investimento ao comprar milhas para revenda, considerando bônus promocionais.',
  steps: [
    'Informe a quantidade de milhas que pretende comprar',
    'Digite o custo por milheiro da compra',
    'Defina o preço de venda esperado por milheiro',
    'Se houver bônus na compra, informe a porcentagem',
  ],
  tips: [
    'ROI acima de 30% é considerado excelente para operações de milhas',
    'Considere o tempo entre compra e venda no cálculo final',
    'Bônus de transferência podem aumentar significativamente o ROI',
  ],
};

export function ROISimulator() {
  const { formatCurrency, formatNumber } = useLocalization();
  const [inputs, setInputs] = useState({
    quantity: 10000,
    costPerThousand: 13.0,
    salePrice: 15.0,
    bonus: 0
  });

  // Debounce inputs for smoother calculations
  const debouncedInputs = useDebouncedValue(inputs, 150);

  const handleChange = (field: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({
      ...inputs,
      [field]: parseFloat(e.target.value) || 0
    });
  };

  const simulation = useMemo(() => {
    const totalCost = (debouncedInputs.quantity / 1000) * debouncedInputs.costPerThousand;
    const effectiveQuantity = debouncedInputs.quantity * (1 + debouncedInputs.bonus / 100);
    const revenue = (effectiveQuantity / 1000) * debouncedInputs.salePrice;
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const effectiveCost = effectiveQuantity > 0 ? totalCost / (effectiveQuantity / 1000) : 0;
    const isProfitable = profit > 0;

    return {
      totalCost,
      effectiveQuantity,
      revenue,
      profit,
      roi,
      margin,
      effectiveCost,
      isProfitable
    };
  }, [debouncedInputs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Simulador de ROI</CardTitle>
          </div>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quantidade de Milhas</Label>
            <Input
              type="number"
              step="1000"
              value={inputs.quantity}
              onChange={handleChange('quantity')}
              className="text-right h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custo do Milheiro (R$)</Label>
            <Input
              type="number"
              step="0.50"
              value={inputs.costPerThousand}
              onChange={handleChange('costPerThousand')}
              className="text-right h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preço de Venda (R$)</Label>
            <Input
              type="number"
              step="0.50"
              value={inputs.salePrice}
              onChange={handleChange('salePrice')}
              className="text-right h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Bônus (%)</Label>
            <Input
              type="number"
              step="5"
              min="0"
              max="200"
              value={inputs.bonus}
              onChange={handleChange('bonus')}
              className="text-right h-9"
            />
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              Custo Total
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(simulation.totalCost)}
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Milhas Efetivas</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(simulation.effectiveQuantity)}
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Receita Bruta</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(simulation.revenue)}
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Custo Efetivo/Mil</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(simulation.effectiveCost)}
            </p>
          </div>
        </div>

        {/* Profit and ROI Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={cn(
            'text-center p-4 rounded-lg border',
            simulation.isProfitable 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          )}>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              {simulation.isProfitable 
                ? <TrendingUp className="h-4 w-4 text-success" /> 
                : <TrendingDown className="h-4 w-4 text-destructive" />
              }
              Lucro/Prejuízo
            </p>
            <p className={cn(
              'font-mono text-2xl font-bold tabular-nums tracking-tight',
              simulation.isProfitable ? 'text-success' : 'text-destructive'
            )}>
              {simulation.profit >= 0 ? '+' : ''}{formatCurrency(simulation.profit)}
            </p>
          </div>

          <div className={cn(
            'text-center p-4 rounded-lg border',
            simulation.roi > 0 
              ? 'bg-success/10 border-success/30' 
              : simulation.roi < 0 
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-muted/50 border-border'
          )}>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Percent className="h-4 w-4" />
              ROI
            </p>
            <p className={cn(
              'font-mono text-2xl font-bold tabular-nums tracking-tight',
              simulation.roi > 0 ? 'text-success' : simulation.roi < 0 ? 'text-destructive' : 'text-foreground'
            )}>
              {simulation.roi >= 0 ? '+' : ''}{simulation.roi.toFixed(1)}%
            </p>
          </div>

          <div className={cn(
            'text-center p-4 rounded-lg border',
            simulation.margin > 0 
              ? 'bg-primary/10 border-primary/30' 
              : 'bg-muted/50 border-border'
          )}>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Margem
            </p>
            <p className={cn(
              'font-mono text-2xl font-bold tabular-nums tracking-tight',
              simulation.margin > 0 ? 'text-primary' : 'text-foreground'
            )}>
              {simulation.margin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Summary Message */}
        <div className={cn(
          'p-4 rounded-lg border',
          simulation.isProfitable 
            ? 'bg-success/5 border-success/20' 
            : 'bg-warning/5 border-warning/20'
        )}>
          <p className={cn(
            'text-sm font-medium',
            simulation.isProfitable ? 'text-success dark:text-success' : 'text-warning dark:text-warning'
          )}>
            {simulation.isProfitable 
              ? `✅ Operação lucrativa! ROI de ${simulation.roi.toFixed(1)}% com lucro de ${formatCurrency(simulation.profit)}.`
              : simulation.profit === 0
                ? `⚠️ Operação no zero-a-zero. Sem lucro nem prejuízo.`
                : `❌ Operação com prejuízo de ${formatCurrency(Math.abs(simulation.profit))}. Considere ajustar os valores.`
            }
          </p>
        </div>

        {/* Metodologia */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Metodologia do cálculo
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-fade-in">
            <div className="mt-2 p-4 rounded-lg border border-border/50 bg-muted/30 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">1. Fórmulas utilizadas</p>
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
{`Custo Total       = (Quantidade / 1.000) × Custo do Milheiro
Milhas Efetivas   = Quantidade × (1 + Bônus% / 100)
Receita Bruta     = (Milhas Efetivas / 1.000) × Preço de Venda
Lucro             = Receita Bruta − Custo Total
ROI (%)           = (Lucro / Custo Total) × 100
Margem (%)        = (Lucro / Receita Bruta) × 100
Custo Efetivo/Mil = Custo Total / (Milhas Efetivas / 1.000)`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">2. Critérios de interpretação</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong className="text-success">ROI &gt; 30%</strong>: excelente — operação altamente recomendada.</li>
                  <li><strong className="text-foreground">ROI 15–30%</strong>: saudável — operação típica de revenda.</li>
                  <li><strong className="text-warning">ROI 0–15%</strong>: marginal — avaliar tempo de capital empatado e risco.</li>
                  <li><strong className="text-destructive">ROI &lt; 0%</strong>: prejuízo — não executar sem razão estratégica (ex.: status, expiração).</li>
                  <li><strong className="text-foreground">Margem</strong>: complementa o ROI mostrando eficiência sobre a receita.</li>
                  <li><strong className="text-foreground">Custo Efetivo/Milheiro</strong>: o CPM real após bônus — compare ao "valor de resgate" do programa.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">3. Premissas e limitações</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Não considera <strong>impostos</strong>, <strong>taxas de transferência</strong> nem <strong>custo de oportunidade</strong> do capital.</li>
                  <li>Não considera o <strong>tempo</strong> entre compra e venda (milhas paradas têm custo financeiro).</li>
                  <li>Bônus é tratado como <strong>acréscimo direto</strong> à quantidade (modelo multiplicativo simples).</li>
                  <li>Preço de venda é considerado <strong>líquido</strong> — descontos de marketplace devem ser abatidos antes de informar o valor.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">4. Exemplo prático</p>
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
{`Entrada:
  Quantidade        = 10.000 milhas
  Custo do Milheiro = R$ 13,00
  Preço de Venda    = R$ 15,00
  Bônus             = 100%

Cálculo:
  Custo Total       = 10 × 13      = R$ 130,00
  Milhas Efetivas   = 10.000 × 2   = 20.000
  Receita Bruta     = 20 × 15      = R$ 300,00
  Lucro             = 300 − 130    = R$ 170,00
  ROI               = 170 / 130    = 130,8%
  Margem            = 170 / 300    = 56,7%
  Custo Efetivo/Mil = 130 / 20     = R$ 6,50`}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
