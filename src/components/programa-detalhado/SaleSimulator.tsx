import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { cn } from '@/lib/utils';
import { SimulatorDescription } from '@/components/simulator/SimulatorDescription';

const DESCRIPTION = {
  title: 'Simulador de Venda',
  description: 'Calcule o lucro potencial ao vender suas milhas, considerando o custo de aquisição.',
  steps: [
    'Informe a quantidade de milhas que pretende vender',
    'Digite o custo médio de aquisição por milheiro',
    'Configure o preço de venda por milheiro',
  ],
  tips: [
    'Verifique os preços de mercado antes de definir o preço de venda',
    'Considere o tempo de pagamento do comprador no cálculo',
    'Mantenha registro do custo médio para análises precisas',
  ],
};

export function SaleSimulator() {
  const [quantity, setQuantity] = useState(10000);
  const [salePrice, setSalePrice] = useState(20);
  const [costPerThousand, setCostPerThousand] = useState(15);
  const { formatCurrency } = useLocalization();

  const simulation = useMemo(() => {
    const revenue = (quantity / 1000) * salePrice;
    const cost = (quantity / 1000) * costPerThousand;
    const profit = revenue - cost;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    return { revenue, cost, profit, roi };
  }, [quantity, salePrice, costPerThousand]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Simulador de Venda</CardTitle>
          </div>
          <SimulatorDescription {...DESCRIPTION} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Quantidade para Vender</Label>
            <Input type="number" step="1000" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label>Custo do Milheiro</Label>
            <Input type="number" step="0.01" value={costPerThousand} onChange={(e) => setCostPerThousand(Number(e.target.value))} className="text-right" />
          </div>
          <div className="space-y-2">
            <Label>Preço de Venda</Label>
            <Input type="number" step="0.5" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="text-right" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Receita</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(simulation.revenue)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Custo</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(simulation.cost)}</p>
          </div>
          <div className={cn('text-center p-3 rounded-lg', simulation.profit >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              {simulation.profit >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              {simulation.profit >= 0 ? 'Lucro' : 'Prejuízo'}
            </p>
            <p className={cn('text-lg font-bold', simulation.profit >= 0 ? 'text-success' : 'text-destructive')}>
              {simulation.profit >= 0 ? '+' : ''}{formatCurrency(simulation.profit)}
            </p>
          </div>
          <div className={cn('text-center p-3 rounded-lg', simulation.roi >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
            <p className="text-sm text-muted-foreground">ROI</p>
            <p className={cn('text-lg font-bold', simulation.roi >= 0 ? 'text-success' : 'text-destructive')}>
              {simulation.roi >= 0 ? '+' : ''}{simulation.roi.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
