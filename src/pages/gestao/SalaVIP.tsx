import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VIPKPICards } from '@/components/sala-vip/VIPKPICards';
import { VIPEntriesTable } from '@/components/sala-vip/VIPEntriesTable';
import { VIPCardSummary } from '@/components/sala-vip/VIPCardSummary';
import { VIPEntryDialog } from '@/components/sala-vip/VIPEntryDialog';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { UpgradeScreen } from '@/components/subscription/UpgradeScreen';
import { PageHeader } from '@/components/layout/PageHeader';
import { Crown } from 'lucide-react';

export default function SalaVIP() {
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);

  return (
    <DashboardLayout title="Sala VIP">
      <FeatureGate 
        feature="vip_lounge_tracking"
        fallback={
          <UpgradeScreen 
            title="Controle de Sala VIP"
            description="Gerencie suas cotas de acesso às salas VIP por cartão de crédito."
            features={[
              "Controle de entradas de titular e convidados",
              "Visualização de cotas por cartão",
              "Histórico completo de acessos",
              "Relatórios de uso de salas VIP"
            ]}
          />
        }
      >
        <div className="space-y-6">
          <PageHeader
            eyebrow="Sala VIP"
            title="Controle de acessos"
            subtitle="Cotas, entradas e histórico por cartão"
            icon={<Crown className="h-4 w-4" />}
          />

          {/* KPIs */}
          <VIPKPICards />

          {/* Main Content - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Table */}
            <div className="lg:col-span-2">
              <VIPEntriesTable />
            </div>

            {/* Right Column - Card Summary */}
            <div className="lg:col-span-1">
              <VIPCardSummary onNewEntry={() => setShowNewEntryDialog(true)} />
            </div>
          </div>
        </div>

        {/* New Entry Dialog */}
        <VIPEntryDialog 
          open={showNewEntryDialog} 
          onOpenChange={setShowNewEntryDialog} 
        />
      </FeatureGate>
    </DashboardLayout>
  );
}
