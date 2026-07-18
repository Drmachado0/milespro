import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Wallet } from 'lucide-react';
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
import type { TravelCarRental } from '@/hooks/travel/types';

const RENTAL_COMPANIES = [
  'Localiza',
  'Movida',
  'Unidas',
  'Hertz',
  'Avis',
  'Budget',
  'Enterprise',
  'National',
  'Alamo',
];

const VEHICLE_CATEGORIES = [
  'Econômico',
  'Compacto',
  'Intermediário',
  'Standard',
  'Full Size',
  'SUV',
  'Luxo',
  'Pickup',
  'Van',
  'Minivan',
];

const MILE_COST_BRL = 35;

export interface CarroFormValues {
  holder_id: string | null;
  holder_name: string | null;
  rental_company: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  dropoff_date: string;
  vehicle_category: string;
  miles_program: string;
  miles_used: number;
  tax_brl: number;
  cash_price: number;
  status: string;
  notes: string;
  days: number;
  total_cost_brl: number;
}

interface CarroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelCarRental | null;
  onSubmit: (values: CarroFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  rental_company: '',
  pickup_location: '',
  dropoff_location: '',
  pickup_date: '',
  dropoff_date: '',
  vehicle_category: '',
  miles_program: '',
  miles_used: 0,
  tax_brl: 0,
  cash_price: 0,
  status: 'confirmed',
  notes: '',
};

export function CarroFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: CarroFormDialogProps) {
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
        rental_company: editing.rental_company,
        pickup_location: editing.pickup_location,
        dropoff_location: editing.dropoff_location,
        pickup_date: editing.pickup_date,
        dropoff_date: editing.dropoff_date,
        vehicle_category: editing.vehicle_category,
        miles_program: editing.miles_program || '',
        miles_used: editing.miles_used,
        tax_brl: editing.tax_brl,
        cash_price: editing.cash_price || 0,
        status: editing.status,
        notes: editing.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing]);

  const days = useMemo(() => {
    if (formData.pickup_date && formData.dropoff_date) {
      return Math.max(
        1,
        differenceInDays(new Date(formData.dropoff_date), new Date(formData.pickup_date)),
      );
    }
    return 0;
  }, [formData.pickup_date, formData.dropoff_date]);

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
    formData.status === 'confirmed' &&
    !!formData.miles_program &&
    formData.miles_used > availableBalance &&
    !editing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      rental_company: formData.rental_company,
      pickup_location: formData.pickup_location,
      dropoff_location: formData.dropoff_location,
      pickup_date: formData.pickup_date,
      dropoff_date: formData.dropoff_date,
      vehicle_category: formData.vehicle_category,
      miles_program: formData.miles_program,
      miles_used: formData.miles_used,
      tax_brl: formData.tax_brl,
      cash_price: formData.cash_price,
      status: formData.status,
      notes: formData.notes,
      days,
      total_cost_brl: totalCostBrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Aluguel' : 'Novo Aluguel de Carro'}</DialogTitle>
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
                    <span
                      className={isBalanceInsufficient ? 'text-destructive font-medium' : 'font-medium'}
                    >
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

            <div>
              <Label>Locadora *</Label>
              <Input
                value={formData.rental_company}
                onChange={(e) => setFormData({ ...formData, rental_company: e.target.value })}
                placeholder="Ex: Localiza, Hertz..."
                list="rental-companies"
                required
              />
              <datalist id="rental-companies">
                {RENTAL_COMPANIES.map((company) => (
                  <option key={company} value={company} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Categoria *</Label>
              <Input
                value={formData.vehicle_category}
                onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                placeholder="Ex: Econômico, SUV..."
                list="vehicle-categories"
                required
              />
              <datalist id="vehicle-categories">
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>Local Retirada *</Label>
              <Input
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                placeholder="Ex: GRU Aeroporto"
                required
              />
            </div>
            <div>
              <Label>Local Devolução *</Label>
              <Input
                value={formData.dropoff_location}
                onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
                placeholder="Ex: CGH Aeroporto"
                required
              />
            </div>

            <div>
              <Label>Data Retirada *</Label>
              <Input
                type="date"
                value={formData.pickup_date}
                onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data Devolução *</Label>
              <Input
                type="date"
                value={formData.dropoff_date}
                onChange={(e) => setFormData({ ...formData, dropoff_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Diárias</Label>
              <Input value={days} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Milhas Utilizadas *</Label>
              <Input
                type="number"
                value={formData.miles_used || ''}
                onChange={(e) =>
                  setFormData({ ...formData, miles_used: parseInt(e.target.value) || 0 })
                }
                className={isBalanceInsufficient ? 'border-destructive' : ''}
                required
              />
            </div>

            {isBalanceInsufficient && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Saldo insuficiente no programa selecionado. Disponível:{' '}
                    {formatNumber(availableBalance)} milhas.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div>
              <Label>Taxas (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_brl || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tax_brl: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
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
                    : 'Aluguel cancelado'}
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
                  className={`text-lg font-bold ${savings >= 0 ? 'text-success' : 'text-destructive'}`}
                >
                  {formatCurrency(savings)}
                  {savings < 0 && <AlertTriangle className="h-4 w-4 ml-1 inline" />}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(formData.miles_used)} milhas × {days} dias
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isBalanceInsufficient}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Criar Aluguel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
