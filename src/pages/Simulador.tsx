import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROISimulator } from '@/components/simulator/ROISimulator';
import { SaleSimulator } from '@/components/programa-detalhado/SaleSimulator';
import { EmissionSimulator } from '@/components/programa-detalhado/EmissionSimulator';
import { BonusTransferSimulator } from '@/components/simulator/BonusTransferSimulator';
import { CardUpgradeSimulator } from '@/components/simulator/CardUpgradeSimulator';
import { CardComparisonSimulator } from '@/components/simulator/CardComparisonSimulator';
import { DirectPurchaseSimulator } from '@/components/simulator/DirectPurchaseSimulator';
import { OrganicPointsSimulator } from '@/components/simulator/OrganicPointsSimulator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Calculator, Check, CreditCard, DollarSign, Lock, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export default function Simulador() {
  const { isFree } = useSubscription();
  const navigate = useNavigate();

  // If user is on free plan, show upgrade prompt
  if (isFree) {
    const proFeatures = [
      'Calculadora milhas vs dinheiro',
      'Simulador de ROI em compras',
      'Simulador de vendas',
      'Simulador de emissão de passagens',
      'Comparador de cartões',
      'Projeção de pontos futuros',
    ];
    return (
      <DashboardLayout title="Simuladores">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10"
                style={{ boxShadow: '0 0 24px 4px hsl(var(--primary) / 0.18)' }}
              >
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl tracking-tight">Simuladores bloqueados</CardTitle>
              <CardDescription>
                Disponíveis apenas para assinantes do plano Pro ou superior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/40 p-4 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Com o plano Pro você terá:
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full" onClick={() => navigate('/assinatura')}>
                Fazer upgrade para Pro
              </Button>
              <p className="text-xs text-muted-foreground">
                A partir de <span className="font-mono tabular-nums">R$ 30,32</span>/mês no plano anual
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Simuladores">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Simulação"
          icon={<Calculator className="h-5 w-5" />}
          title="Simuladores"
          subtitle="Teste cenários de compra, venda, transferência e upgrade de cartão antes de executar"
        />
        <Tabs defaultValue="compra-venda" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="compra-venda" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Compra/Venda</span>
            <span className="sm:hidden">Compra</span>
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transferências</span>
            <span className="sm:hidden">Transf.</span>
          </TabsTrigger>
          <TabsTrigger value="cartoes" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Cartões</span>
            <span className="sm:hidden">Cartões</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compra-venda" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ROISimulator />
            <DirectPurchaseSimulator />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SaleSimulator />
            <EmissionSimulator />
          </div>
        </TabsContent>

        <TabsContent value="transferencias" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BonusTransferSimulator />
          </div>
        </TabsContent>

        <TabsContent value="cartoes" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardUpgradeSimulator />
            <CardComparisonSimulator />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrganicPointsSimulator />
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
