import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, TrendingUp, TrendingDown } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { cn } from '@/lib/utils';
import { SimulatorDescription } from '@/components/simulator/SimulatorDescription';

const DESCRIPTION = {
  title: 'Simulador de Emissão',
  description: 'Compare o custo de emitir passagem com milhas versus comprar em dinheiro.',
  steps: [
    'Informe quantas milhas são necessárias para a passagem',
    'Digite o custo médio das suas milhas por milheiro',
    'Adicione o valor das taxas de embarque',
    'Compare com o preço da passagem em dinheiro',
  ],
  tips: [
    'Passagens em classe executiva costumam ter melhor custo-benefício em milhas',
    'Taxas de embarque internacionais podem ser significativas',
    'O valor efetivo por milheiro mostra quanto sua milha valeu nessa emissão',
  ],
};

export function EmissionSimulator() {
  const [milesNeeded, setMilesNeeded] = useState(10000);
  const [costPerThousand, setCostPerThousand] = useState(15);
  const [taxes, setTaxes] = useState(100);
  const [ticketPrice, setTicketPrice] = useState(500);
  const { formatCurrency } = useLocalization();

  const simulation = useMemo(() => {
    const milesCost = (milesNeeded / 1000) * costPerThousand;
    const totalEmissionCost = milesCost + taxes;
    const savings = ticketPrice - totalEmissionCost;
    const savingsPercent = ticketPrice > 0 ? ((ticketPrice - totalEmissionCost) / ticketPrice) * 100 : 0;
    const effectiveCostPerMile = milesNeeded > 0 ? (ticketPrice - taxes) / (milesNeeded / 1000) : 0;
    const isWorthIt = savings > 0;
    return { milesCost, totalEmissionCost, savings, savingsPercent, effectiveCostPerMile, isWorthIt };
  }, [milesNeeded, costPerThousand, taxes, ticketPrice]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-lg">Simulador de Emissão</CardTitle>
          </div>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Milhas Necessárias</Label>
            <Input type="number" step="1000" value={milesNeeded} onChange={(e) => setMilesNeeded(Number(e.target.value))} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label>Custo do Milheiro</Label>
            <Input type="number" step="0.01" value={costPerThousand} onChange={(e) => setCostPerThousand(Number(e.target.value))} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label>Taxas de Embarque</Label>
            <Input type="number" step="10" value={taxes} onChange={(e) => setTaxes(Number(e.target.value))} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label>Preço Passagem</Label>
            <Input type="number" step="50" value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} className="text-right" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Custo das Milhas</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(simulation.milesCost)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Custo Total</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(simulation.totalEmissionCost)}</p>
          </div>
          <div className={cn('text-center p-3 rounded-lg', simulation.isWorthIt ? 'bg-success/10' : 'bg-destructive/10')}>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              {simulation.isWorthIt ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Economia
            </p>
            <p className={cn('text-lg font-bold', simulation.isWorthIt ? 'text-success' : 'text-destructive')}>
              {simulation.savings >= 0 ? '+' : ''}{formatCurrency(simulation.savings)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-violet-500/10">
            <p className="text-sm text-muted-foreground">Valor Efetivo/Mil</p>
            <p className="text-lg font-bold text-violet-600">{formatCurrency(simulation.effectiveCostPerMile)}</p>
          </div>
        </div>
        <div className={cn('p-4 rounded-lg border', simulation.isWorthIt ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20')}>
          <p className={cn('text-sm font-medium', simulation.isWorthIt ? 'text-success' : 'text-warning')}>
            {simulation.isWorthIt ? `✅ Vale a pena! Você economiza ${formatCurrency(simulation.savings)} em relação à compra em dinheiro.` : `⚠️ Comprar a passagem em dinheiro pode ser mais vantajoso neste caso.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
