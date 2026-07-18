import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, BellRing, Plus, Trash2, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/hooks/useLocalization';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const PROGRAMS = [
  'Livelo', 'Esfera', 'Smiles', 'TudoAzul', 'Latam', 'TAP', 'Ibéria',
  'AAdvantage', 'MileagePlus', 'Aeroplan', 'Delta'
];

export function PriceAlertsCard() {
  const { formatCurrency } = useLocalization();
  const { alerts, triggeredAlerts, isLoading, createAlert, updateAlert, deleteAlert } = usePriceAlerts();
  const { getPrice } = useMarketPrices();
  const [isOpen, setIsOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    program: '',
    target_buy_price: '',
    target_sell_price: '',
  });

  const handleCreate = () => {
    if (!newAlert.program) return;
    
    createAlert.mutate({
      program: newAlert.program,
      target_buy_price: newAlert.target_buy_price ? parseFloat(newAlert.target_buy_price) : undefined,
      target_sell_price: newAlert.target_sell_price ? parseFloat(newAlert.target_sell_price) : undefined,
    });
    
    setNewAlert({ program: '', target_buy_price: '', target_sell_price: '' });
    setIsOpen(false);
  };

  const isTriggered = (alertId: string) => triggeredAlerts.some(a => a.id === alertId);

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <span>Alertas de Preço</span>
            {triggeredAlerts.length > 0 && (
              <Badge 
                variant="destructive" 
                className="animate-pulse bg-gradient-to-r from-success to-success border-0"
              >
                {triggeredAlerts.length} ativo{triggeredAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="h-8 gap-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              >
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Criar Alerta de Preço
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Programa</Label>
                  <Select 
                    value={newAlert.program} 
                    onValueChange={(v) => setNewAlert({ ...newAlert, program: v })}
                  >
                    <SelectTrigger className="border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Selecione o programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAMS.map(program => {
                        const price = getPrice(program);
                        return (
                          <SelectItem key={program} value={program}>
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={program} size="xs" />
                              <span>{program}</span>
                              {price && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatCurrency(price.buy_price)}-{formatCurrency(price.sell_price)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-lg bg-success/5 border border-success/20">
                    <Label className="text-xs flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-success" />
                      Preço de Compra Máx.
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 15.00"
                      value={newAlert.target_buy_price}
                      onChange={(e) => setNewAlert({ ...newAlert, target_buy_price: e.target.value })}
                      className="border-success/30 focus:border-success"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Alertar quando compra ≤ este valor
                    </p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Label className="text-xs flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      Preço de Venda Mín.
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 22.00"
                      value={newAlert.target_sell_price}
                      onChange={(e) => setNewAlert({ ...newAlert, target_sell_price: e.target.value })}
                      className="border-primary/30 focus:border-primary"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Alertar quando venda ≥ este valor
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newAlert.program || createAlert.isPending}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                >
                  Criar Alerta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Bell className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Monitore os preços dos milheiros!</p>
            <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed mb-4">
              Crie alertas e seja notificado quando os preços caírem para o valor desejado.
            </p>
            <Button 
              size="sm"
              onClick={() => setIsOpen(true)}
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Primeiro Alerta
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {alerts.map((alert, index) => {
              const triggered = isTriggered(alert.id);
              const marketPrice = getPrice(alert.program);
              
              return (
                <div 
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 hover:shadow-md animate-fade-in",
                    triggered 
                      ? "bg-gradient-to-r from-success/10 via-success/5 to-transparent border-success/30 shadow-success/10 shadow-sm" 
                      : "bg-gradient-to-r from-muted/50 via-muted/30 to-transparent border-border/50 hover:border-primary/30"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      triggered 
                        ? "bg-success/20" 
                        : "bg-muted"
                    )}>
                      {triggered ? (
                        <BellRing className="h-4 w-4 text-success animate-pulse" />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <ProgramLogo program={alert.program} size="sm" />
                    <div>
                      <p className="text-sm font-semibold">{alert.program}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {alert.target_buy_price && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success/10 text-success">
                            <TrendingDown className="h-2.5 w-2.5" />
                            ≤{formatCurrency(alert.target_buy_price)}
                          </span>
                        )}
                        {alert.target_sell_price && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            <TrendingUp className="h-2.5 w-2.5" />
                            ≥{formatCurrency(alert.target_sell_price)}
                          </span>
                        )}
                      </div>
                      {marketPrice && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Atual: <span className="font-medium text-foreground">{formatCurrency(marketPrice.buy_price)}</span>
                          <span className="mx-1">—</span>
                          <span className="font-medium text-foreground">{formatCurrency(marketPrice.sell_price)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => updateAlert.mutate({ id: alert.id, is_active: checked })}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => deleteAlert.mutate(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
