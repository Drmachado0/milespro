import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crown, Plus } from 'lucide-react';
import { useVIPCounters } from '@/hooks/useVIPCounters';
import { VIPCardQuotaProgress } from './VIPCardQuotaProgress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useState } from 'react';

interface VIPCardSummaryProps {
  onNewEntry: () => void;
}

export function VIPCardSummary({ onNewEntry }: VIPCardSummaryProps) {
  const { data: counters, isLoading } = useVIPCounters();
  const [onlyCritical, setOnlyCritical] = useState(false);

  const filteredCounters = onlyCritical 
    ? counters?.filter(c => c.overallStatus === 'critical' || c.overallStatus === 'warning')
    : counters;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            Resumo por Cartão
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Switch
            id="only-critical"
            checked={onlyCritical}
            onCheckedChange={setOnlyCritical}
          />
          <Label htmlFor="only-critical" className="text-xs text-muted-foreground">
            Somente críticos
          </Label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-3 pr-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))
            ) : !filteredCounters || filteredCounters.length === 0 ? (
              <EmptyState
                compact
                icon={Crown}
                title={onlyCritical ? 'Nenhum cartão em alerta' : 'Nenhum cartão com acesso VIP ativo'}
                description="Configure o acesso VIP nos cartões em Gestão > Cartões."
              />
            ) : (
              filteredCounters.map((counter) => (
                <VIPCardQuotaProgress key={counter.cardId} counter={counter} />
              ))
            )}
          </div>
        </ScrollArea>
        
        <Button onClick={onNewEntry} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Registrar Entrada
        </Button>
      </CardContent>
    </Card>
  );
}
