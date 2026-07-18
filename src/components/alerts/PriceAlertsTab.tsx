import { TrendingDown, TrendingUp, Bell, Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { formatCurrencyBR } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

type AlertFormData = {
  program: string;
  target_buy_price: string;
  target_sell_price: string;
};

const EMPTY_FORM: AlertFormData = { program: '', target_buy_price: '', target_sell_price: '' };

export function PriceAlertsTab() {
  const { alerts, isLoading, createAlert, updateAlert, deleteAlert } = usePriceAlerts();
  const { prices } = useMarketPrices();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<AlertFormData>(EMPTY_FORM);

  // Edit + delete state — keeps these out of the table row so the dialogs
  // are siblings of the grid (cleaner unmount semantics) and lets the row
  // stay a pure read view.
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AlertFormData>(EMPTY_FORM);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);

  const handleCreateAlert = () => {
    if (!newAlert.program) return;

    createAlert.mutate({
      program: newAlert.program,
      target_buy_price: newAlert.target_buy_price ? parseFloat(newAlert.target_buy_price) : undefined,
      target_sell_price: newAlert.target_sell_price ? parseFloat(newAlert.target_sell_price) : undefined,
    });

    setNewAlert(EMPTY_FORM);
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (alert: typeof alerts[number]) => {
    setEditingAlertId(alert.id);
    setEditForm({
      program: alert.program,
      target_buy_price: alert.target_buy_price?.toString() ?? '',
      target_sell_price: alert.target_sell_price?.toString() ?? '',
    });
  };

  const handleEditSubmit = () => {
    if (!editingAlertId) return;
    updateAlert.mutate({
      id: editingAlertId,
      target_buy_price: editForm.target_buy_price ? parseFloat(editForm.target_buy_price) : null,
      target_sell_price: editForm.target_sell_price ? parseFloat(editForm.target_sell_price) : null,
    });
    setEditingAlertId(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingAlertId) return;
    deleteAlert.mutate(deletingAlertId);
    setDeletingAlertId(null);
  };

  const toggleActive = (alertId: string, currentActive: boolean) => {
    updateAlert.mutate({ id: alertId, is_active: !currentActive });
  };

  const getCurrentPrice = (program: string) => {
    const price = prices?.find(p => p.program === program);
    return price ? { buy: price.buy_price, sell: price.sell_price } : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure alertas para ser notificado quando os preços atingirem seus valores alvo.
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Alerta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Alerta de Preço</DialogTitle>
              <DialogDescription>
                Defina os preços alvo para receber notificações.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Programa</Label>
                <ProgramSelect
                  value={newAlert.program}
                  onValueChange={(value) => setNewAlert({ ...newAlert, program: value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço Compra ≤ (R$/mil)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 18.00"
                    value={newAlert.target_buy_price}
                    onChange={(e) => setNewAlert({ ...newAlert, target_buy_price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta quando o preço de compra cair abaixo deste valor
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Preço Venda ≥ (R$/mil)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 22.00"
                    value={newAlert.target_sell_price}
                    onChange={(e) => setNewAlert({ ...newAlert, target_sell_price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta quando o preço de venda subir acima deste valor
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAlert} disabled={!newAlert.program}>
                Criar Alerta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-medium">Nenhum alerta configurado</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Crie alertas de preço para ser notificado quando os valores atingirem seus alvos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map(alert => {
            const currentPrice = getCurrentPrice(alert.program);
            const buyTriggered = currentPrice && alert.target_buy_price && currentPrice.buy <= alert.target_buy_price;
            const sellTriggered = currentPrice && alert.target_sell_price && currentPrice.sell >= alert.target_sell_price;
            const isTriggered = buyTriggered || sellTriggered;

            return (
              <Card
                key={alert.id}
                className={`relative transition-all ${
                  isTriggered ? 'border-success bg-success/5 ring-1 ring-success/20' : ''
                } ${!alert.is_active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={alert.program} size="md" />
                      <CardTitle className="text-base">{alert.program}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActive(alert.id, alert.is_active)}
                        aria-label={alert.is_active ? 'Pausar alerta' : 'Ativar alerta'}
                      >
                        {alert.is_active ? (
                          <ToggleRight className="h-5 w-5 text-success" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => openEditDialog(alert)}
                        aria-label="Editar alerta"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingAlertId(alert.id)}
                        aria-label="Excluir alerta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {alert.target_buy_price && (
                    <div className={`flex items-center justify-between rounded-md p-2 ${
                      buyTriggered ? 'bg-success/10' : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <TrendingDown className={`h-4 w-4 ${buyTriggered ? 'text-success' : 'text-muted-foreground'}`} />
                        <span className="text-sm">Compra ≤</span>
                      </div>
                      <span className="font-medium">{formatCurrencyBR(alert.target_buy_price)}/mil</span>
                    </div>
                  )}

                  {alert.target_sell_price && (
                    <div className={`flex items-center justify-between rounded-md p-2 ${
                      sellTriggered ? 'bg-success/10' : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className={`h-4 w-4 ${sellTriggered ? 'text-success' : 'text-muted-foreground'}`} />
                        <span className="text-sm">Venda ≥</span>
                      </div>
                      <span className="font-medium">{formatCurrencyBR(alert.target_sell_price)}/mil</span>
                    </div>
                  )}

                  {currentPrice && (
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      <span>Atual: Compra {formatCurrencyBR(currentPrice.buy)} | Venda {formatCurrencyBR(currentPrice.sell)}</span>
                    </div>
                  )}

                  {isTriggered && (
                    <div className="flex items-center gap-1 text-xs font-medium text-success">
                      <Bell className="h-3 w-3" />
                      Alerta Disparado!
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog — reuses the create form layout but locks the program
          (changing program would semantically mean a different alert; if the
          user wants that, they delete + recreate). */}
      <Dialog open={!!editingAlertId} onOpenChange={(open) => !open && setEditingAlertId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Alerta de Preço</DialogTitle>
            <DialogDescription>
              Ajuste os preços alvo. Deixe um campo vazio para remover esse limite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Programa</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <ProgramLogo program={editForm.program} size="sm" />
                <span>{editForm.program}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Compra ≤ (R$/mil)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 18.00"
                  value={editForm.target_buy_price}
                  onChange={(e) => setEditForm({ ...editForm, target_buy_price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço Venda ≥ (R$/mil)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 22.00"
                  value={editForm.target_sell_price}
                  onChange={(e) => setEditForm({ ...editForm, target_sell_price: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAlertId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editForm.target_buy_price && !editForm.target_sell_price}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletingAlertId}
        onOpenChange={(open) => !open && setDeletingAlertId(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir alerta de preço"
        description="O alerta será removido permanentemente. Para o programa selecionado, você não receberá mais notificações de compra ou venda nos limites atuais."
        isLoading={deleteAlert.isPending}
      />
    </div>
  );
}
