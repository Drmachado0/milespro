import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { differenceInDays } from 'date-fns';
import type { TravelHotelReservation } from '@/hooks/travel';

const MILE_VALUE_PER_THOUSAND = 35;

export interface HotelFormValues {
  holder_id: string | null;
  holder_name: string | null;
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  rooms: number;
  miles_used: number;
  tax_brl: number;
  cash_price: number;
  status: string;
  miles_program: string;
  notes: string;
  nights: number;
  total_cost_brl: number;
}

interface HotelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelHotelReservation | null;
  onSubmit: (values: HotelFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  hotel_name: '',
  city: '',
  check_in: '',
  check_out: '',
  rooms: 1,
  miles_used: 0,
  tax_brl: 0,
  cash_price: 0,
  status: 'confirmed',
  miles_program: '',
  notes: '',
};

export function HotelFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: HotelFormDialogProps) {
  const { formatCurrency, formatNumber, formatCurrencyInput, parseCurrency } = useLocalization();
  const { getBalanceByProgram } = useProgramBalances();
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) {
      setFormData(EMPTY_FORM);
      return;
    }
    if (editing) {
      setFormData({
        holder_id: editing.holder_id || '',
        holder_name: editing.holder_name || '',
        hotel_name: editing.hotel_name,
        city: editing.city,
        check_in: editing.check_in,
        check_out: editing.check_out,
        rooms: editing.rooms,
        miles_used: editing.miles_used,
        tax_brl: editing.tax_brl,
        cash_price: editing.cash_price || 0,
        status: editing.status,
        miles_program: editing.miles_program || '',
        notes: editing.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing]);

  const selectedProgramBalance = formData.miles_program ? getBalanceByProgram(formData.miles_program) : undefined;
  const availableBalance = selectedProgramBalance?.balance || 0;
  // Only check balance for confirmed status (pending doesn't deduct immediately)
  const isBalanceInsufficient =
    formData.status === 'confirmed' &&
    !!formData.miles_program &&
    formData.miles_used > availableBalance &&
    !editing;

  const nights = useMemo(() => {
    if (formData.check_in && formData.check_out) {
      return Math.max(1, differenceInDays(new Date(formData.check_out), new Date(formData.check_in)));
    }
    return 0;
  }, [formData.check_in, formData.check_out]);

  const totalCostBrl = useMemo(() => {
    return (formData.miles_used / 1000) * MILE_VALUE_PER_THOUSAND + formData.tax_brl;
  }, [formData.miles_used, formData.tax_brl]);

  const savings = useMemo(() => formData.cash_price - totalCostBrl, [formData.cash_price, totalCostBrl]);

  const canSubmit = !isSubmitting && !isBalanceInsufficient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      hotel_name: formData.hotel_name,
      city: formData.city,
      check_in: formData.check_in,
      check_out: formData.check_out,
      rooms: formData.rooms,
      miles_used: formData.miles_used,
      tax_brl: formData.tax_brl,
      cash_price: formData.cash_price,
      status: formData.status,
      miles_program: formData.miles_program,
      notes: formData.notes,
      nights,
      total_cost_brl: totalCostBrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Reserva' : 'Nova Reserva de Hotel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titular</Label>
              <HolderSelect
                value={formData.holder_id}
                onValueChange={(id, name) =>
                  setFormData({ ...formData, holder_id: id, holder_name: name || '' })
                }
                placeholder="Selecione o titular"
              />
            </div>

            <div className="col-span-2 p-3 bg-muted/50 rounded-lg border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4 text-primary" />
                Programa de Milhas (Origem)
              </div>
              <div>
                <Label>Programa *</Label>
                <ProgramSelect
                  value={formData.miles_program}
                  onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                  placeholder="Selecione o programa"
                />
                {formData.miles_program && !editing && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Saldo disponível:{' '}
                    <span className={isBalanceInsufficient ? 'text-destructive font-medium' : 'font-medium'}>
                      {formatNumber(availableBalance)}
                    </span>{' '}
                    milhas
                    {formData.status === 'pending' && (
                      <span className="text-muted-foreground"> (abate após confirmação)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <Label>Nome do Hotel *</Label>
              <Input
                value={formData.hotel_name}
                onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                placeholder="Ex: Hilton São Paulo"
                required
              />
            </div>

            <div className="col-span-2">
              <Label>Cidade *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: São Paulo"
                required
              />
            </div>

            <div>
              <Label>Check-in *</Label>
              <Input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Check-out *</Label>
              <Input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Quartos</Label>
              <Input
                type="number"
                min={1}
                value={formData.rooms}
                onChange={(e) => setFormData({ ...formData, rooms: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Diárias</Label>
              <Input value={nights} disabled className="bg-muted" />
            </div>

            <div>
              <Label>Milhas Utilizadas *</Label>
              <Input
                type="number"
                value={formData.miles_used || ''}
                onChange={(e) => setFormData({ ...formData, miles_used: parseInt(e.target.value) || 0 })}
                required
                className={isBalanceInsufficient ? 'border-destructive' : ''}
              />
            </div>
            <div>
              <Label>Taxas (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_brl || ''}
                onChange={(e) => setFormData({ ...formData, tax_brl: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label>Preço em Dinheiro (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.cash_price ? formatCurrencyInput(formData.cash_price.toString()) : ''}
                onChange={(e) => setFormData({ ...formData, cash_price: parseCurrency(e.target.value) })}
                placeholder="R$ 0,00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quanto custaria esta reserva se você pagasse em dinheiro?
              </p>
            </div>

            {isBalanceInsufficient && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Saldo insuficiente no programa selecionado. Disponível: {formatNumber(availableBalance)} milhas.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {formData.cash_price > 0 && savings < 0 && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Atenção: Comprar com milhas está {formatCurrency(Math.abs(savings))} mais caro! Considere comprar
                    diretamente em dinheiro.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado (abate saldo na hora)</SelectItem>
                  <SelectItem value="pending">Pendente (abate após confirmação)</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.status === 'confirmed'
                  ? 'As milhas serão descontadas imediatamente'
                  : formData.status === 'pending'
                    ? 'As milhas só serão descontadas quando você confirmar manualmente'
                    : 'Reserva cancelada'}
              </p>
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="col-span-2 p-3 bg-primary/10 rounded-lg border border-primary/30 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Custo Total:</span>
                <span className="font-bold">{formatCurrency(totalCostBrl)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Preço Dinheiro:</span>
                <span className="font-bold">{formatCurrency(formData.cash_price)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-medium">Economia:</span>
                <span
                  className={`font-mono text-lg font-bold tabular-nums tracking-tight ${
                    savings >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(savings)}
                  {savings < 0 && <AlertTriangle className="h-4 w-4 ml-1 inline" />}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Criar Reserva'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
