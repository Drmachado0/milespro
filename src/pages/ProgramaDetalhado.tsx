import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProgramHeader } from '@/components/programa-detalhado/ProgramHeader';
import { ProgramKPIs } from '@/components/programa-detalhado/ProgramKPIs';
import { SpecialIndicators } from '@/components/programa-detalhado/SpecialIndicators';
import { CostEvolutionDetailChart } from '@/components/programa-detalhado/CostEvolutionDetailChart';
import { MonthlyOperationsDetailChart } from '@/components/programa-detalhado/MonthlyOperationsDetailChart';
import { OperationsDetailTable } from '@/components/programa-detalhado/OperationsTable';
import { SaleSimulator } from '@/components/programa-detalhado/SaleSimulator';
import { EmissionSimulator } from '@/components/programa-detalhado/EmissionSimulator';
import { ProgramAlerts } from '@/components/programa-detalhado/ProgramAlerts';
import { ProgramSummary } from '@/components/programa-detalhado/ProgramSummary';
import { useProgramDetails } from '@/hooks/useProgramDetails';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader2, Users, Inbox } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { useQueryClient } from '@tanstack/react-query';
import { useHolders } from '@/hooks/useOperations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ProgramaDetalhado() {
  const { formatDate } = useLocalization();
  const { program } = useParams<{ program: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const programName = decodeURIComponent(program || '');
  const [selectedHolderId, setSelectedHolderId] = useState<string>('');
  
  const { holders } = useHolders();
  const effectiveHolderId = selectedHolderId && selectedHolderId !== 'all' ? selectedHolderId : undefined;
  const { details, isLoading } = useProgramDetails(programName, effectiveHolderId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['program-details', programName] });
  };

  if (!programName) {
    navigate('/analises');
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout title={`Detalhes: ${programName}`}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!details) {
    return (
      <DashboardLayout title={`Detalhes: ${programName}`}>
        <EmptyState
          icon={Inbox}
          title="Nenhuma operação encontrada"
          description={`Ainda não há registros para ${programName}. Cadastre uma operação para ver os detalhes.`}
        />
      </DashboardLayout>
    );
  }

  const lastUpdate = details.operations[0]?.date 
    ? formatDate(details.operations[0].date) 
    : undefined;

  return (
    <DashboardLayout title={`Detalhes: ${programName}`}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Holder Filter */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <ProgramHeader
            program={programName}
            lastUpdate={lastUpdate}
            onRefresh={handleRefresh}
          />
          
          {/* Holder Filter */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Label className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
              <Users className="h-4 w-4" />
              Titular:
            </Label>
            <Select value={selectedHolderId} onValueChange={setSelectedHolderId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos os titulares" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os titulares</SelectItem>
                {holders.map((holder) => (
                  <SelectItem key={holder.id} value={holder.id}>
                    <div className="flex items-center gap-2">
                      <span>{holder.name}</span>
                      {holder.cpf && (
                        <span className="text-xs text-muted-foreground">({holder.cpf})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alerts */}
        <ProgramAlerts
          averageCost={details.averageCost}
          marketPrice={details.marketPrice}
          expiringMiles={details.expiringMiles}
          expiryDate={details.expiryDate}
          roi={details.roi}
        />

        {/* KPIs */}
        <section>
          <ProgramKPIs
            balance={details.balance}
            averageCost={details.averageCost}
            estimatedValue={details.estimatedValue}
            roi={details.roi}
          />
        </section>

        {/* Special Indicators */}
        <section>
          <SpecialIndicators
            iqc={details.iqc}
            salePotential={details.salePotential}
            economyFromEmissions={details.economyFromEmissions}
            expiringMiles={details.expiringMiles}
            expiryDate={details.expiryDate}
          />
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostEvolutionDetailChart
            data={details.costEvolution}
            marketPrice={details.marketPrice}
            averageCost={details.averageCost}
          />
          <MonthlyOperationsDetailChart data={details.monthlyOperations} />
        </section>

        {/* Operations Table */}
        <section>
          <OperationsDetailTable
            operations={details.operations}
            marketPrice={details.marketPrice}
          />
        </section>

        {/* Simulators Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SaleSimulator />
          <EmissionSimulator />
        </section>

        {/* Final Summary */}
        <section>
          <ProgramSummary
            program={programName}
            balance={details.balance}
            totalInvested={details.totalInvested}
            estimatedValue={details.estimatedValue}
            economyFromEmissions={details.economyFromEmissions}
            roi={details.roi}
            averageCost={details.averageCost}
            marketPrice={details.marketPrice}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}
