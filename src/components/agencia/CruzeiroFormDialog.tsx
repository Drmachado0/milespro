import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { differenceInDays } from 'date-fns';
import type { TravelCruise } from '@/hooks/travel/types';

const CRUISE_LINES = [
  'MSC Cruzeiros',
  'Costa Cruzeiros',
  'Royal Caribbean',
  'Norwegian Cruise Line',
  'Carnival Cruise',
  'Celebrity Cruises',
  'Princess Cruises',
  'Holland America',
];

const CABIN_TYPES = ['Interna', 'Externa', 'Varanda', 'Suíte'];

const MILE_COST_BRL = 35;

export interface CruzeiroFormValues {
  holder_id: string | null;
  holder_name: string | null;
  cruise_line: string;
  ship_name: string;
  cabin_type: string;
  departure_port: string;
  arrival_port: string;
  departure_date: string;
  return_date: string;
  passengers: number;
  miles_used: number;
  miles_program: string | null;
  tax_brl: number;
  cash_price: number;
  status: string;
  notes: string;
  nights: number;
  total_cost_brl: number;
}

interface CruzeiroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelCruise | null;
  onSubmit: (values: CruzeiroFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  cruise_line: '',
  ship_name: '',
  cabin_type: 'Varanda',
  departure_port: '',
  arrival_port: '',
  departure_date: '',
  return_date: '',
  passengers: 1,
  miles_used: 0,
  miles_program: '',
  tax_brl: 0,
  cash_price: 0,
  status: 'confirmed',
  notes: '',
};

export function CruzeiroFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: CruzeiroFormDialogProps) {
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
        cruise_line: editing.cruise_line,
        ship_name: editing.ship_name,
        cabin_type: editing.cabin_type,
        departure_port: editing.departure_port,
        arrival_port: editing.arrival_port,
        departure_date: editing.departure_date,
        return_date: editing.return_date,
        passengers: editing.passengers,
        miles_used: editing.miles_used,
        miles_program: editing.miles_program || '',
        tax_brl: editing.tax_brl,
        cash_price: editing.cash_price || 0,
        status: editing.status,
        notes: editing.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing]);

  const nights = useMemo(() => {
    if (formData.departure_date && formData.return_date) {
      return Math.max(
        1,
        differenceInDays(new Date(formData.return_date), new Date(formData.departure_date)),
      );
    }
    return 0;
  }, [formData.departure_date, formData.return_date]);

  const totalCostBrl = useMemo(
    () => (formData.miles_used / 1000) * MILE_COST_BRL + formData.tax_brl,
    [formData.miles_used, formData.tax_brl],
  );

  const savings = useMemo(
    () => formData.cash_price - totalCostBrl,
    [formData.cash_price, totalCostBrl],
  );

  const selectedProgramBalance = formData.miles_program
    ? getBalanceByProgram(formData.miles_program)
    : undefined;
  const availableBalance = selectedProgramBalance?.balance || 0;
  const isBalanceInsufficient =
    !!formData.miles_program && formData.miles_used > availableBalance && !editing;

  const canSubmit =
    !!formData.holder_id &&
    !!formData.cruise_line &&
    !!formData.ship_name &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      cruise_line: formData.cruise_line,
      ship_name: formData.ship_name,
      cabin_type: formData.cabin_type,
      departure_port: formData.departure_port,
      arrival_port: formData.arrival_port,
      departure_date: formData.departure_date,
      return_date: formData.return_date,
      passengers: formData.passengers,
      miles_used: formData.miles_used,
      miles_program: formData.miles_program || null,
      tax_brl: formData.tax_brl,
      cash_price: formData.cash_price,
      status: formData.status,
      notes: formData.notes,
      nights,
      total_cost_brl: totalCostBrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Cruzeiro' : 'Novo Cruzeiro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titular *</Label>
              <HolderSelect
                value={formData.holder_id}
                onValueChange={(id, name) =>
                  setFormData({ ...formData, holder_id: id, holder_name: name || '' })
                }
              />
            </div>
            <div>
              <Label>Companhia *</Label>
              <Select
                value={formData.cruise_line}
                onValueChange={(v) => setFormData({ ...formData, cruise_line: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Companhia" />
                </SelectTrigger>
                <SelectContent>
                  {CRUISE_LINES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Navio *</Label>
              <Input
                value={formData.ship_name}
                onChange={(e) => setFormData({ ...formData, ship_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Tipo de Cabine *</Label>
              <Select
                value={formData.cabin_type}
                onValueChange={(v) => setFormData({ ...formData, cabin_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CABIN_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Passageiros *</Label>
              <Input
                type="number"
                min="1"
                value={formData.passengers}
                onChange={(e) =>
                  setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
            <div>
              <Label>Porto de Embarque *</Label>
              <Input
                value={formData.departure_port}
                onChange={(e) => setFormData({ ...formData, departure_port: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Porto de Desembarque *</Label>
              <Input
                value={formData.arrival_port}
                onChange={(e) => setFormData({ ...formData, arrival_port: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data de Embarque *</Label>
              <Input
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data de Desembarque *</Label>
              <Input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
              />
            </div>
            {nights > 0 && (
              <div className="col-span-2 text-sm text-muted-foreground">{nights} noite(s) a bordo</div>
            )}
            <div className="col-span-2">
              <Label>Programa de Milhas</Label>
              <ProgramSelect
                value={formData.miles_program}
                onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                placeholder="Selecione (opcional)"
              />
              {formData.miles_program && (
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo disponível:{' '}
                  <span className={isBalanceInsufficient ? 'text-destructive font-medium' : 'font-medium'}>
                    {formatNumber(availableBalance)}
                  </span>{' '}
                  milhas
                </p>
              )}
            </div>
            <div>
              <Label>Milhas Utilizadas</Label>
              <Input
                type="number"
                min="0"
                value={formData.miles_used}
                onChange={(e) =>
                  setFormData({ ...formData, miles_used: parseInt(e.target.value) || 0 })
                }
                className={isBalanceInsufficient ? 'border-destructive' : ''}
              />
            </div>
            <div>
              <Label>Taxas (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.tax_brl}
                onChange={(e) =>
                  setFormData({ ...formData, tax_brl: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Preço em Dinheiro (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={
                  formData.cash_price ? formatCurrencyInput(formData.cash_price.toString()) : ''
                }
                onChange={(e) =>
                  setFormData({ ...formData, cash_price: parseCurrency(e.target.value) })
                }
                placeholder="R$ 0,00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quanto custaria este cruzeiro se você pagasse em dinheiro?
              </p>
            </div>

            {formData.cash_price > 0 && savings < 0 && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Atenção: Comprar com milhas está {formatCurrency(Math.abs(savings))} mais caro!
                    Considere comprar diretamente em dinheiro.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="col-span-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            {(totalCostBrl > 0 || formData.cash_price > 0) && (
              <div className="col-span-2 p-3 bg-primary/10 rounded-lg border border-primary/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Custo Total:</span>
                  <span className="font-medium">{formatCurrency(totalCostBrl)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Preço Dinheiro:</span>
                  <span className="font-medium">{formatCurrency(formData.cash_price)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Economia:</span>
                  <span
                    className={`font-bold ${savings >= 0 ? 'text-success' : 'text-destructive'}`}
                  >
                    {formatCurrency(savings)}
                    {savings < 0 && <AlertTriangle className="h-4 w-4 ml-1 inline" />}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
