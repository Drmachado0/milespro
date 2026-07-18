import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bus, Loader2, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import type { TravelTransfer } from '@/hooks/travel';

const TRANSFER_TYPES = ['Aeroporto → Hotel', 'Hotel → Aeroporto', 'Cidade', 'Intercidades', 'Passeio'];
const VEHICLE_TYPES = ['Sedan', 'Van', 'Minibus', 'SUV', 'Limusine'];
const PROVIDERS = ['CWT', 'Transfer Service', 'GetTransfer', 'Viator', 'Local', 'Outro'];
const MILE_VALUE_PER_THOUSAND = 35;

export interface TransporteFormValues {
  holder_id: string | null;
  holder_name: string | null;
  transfer_type: string;
  origin: string;
  destination: string;
  transfer_date: string;
  transfer_time: string;
  passengers: number;
  vehicle_type: string;
  status: string;
  provider: string;
  flight_number: string;
  notes: string;
  miles_program: string | null;
  miles_used: number;
  third_party_miles: boolean;
  third_party_cost: number;
  tax_brl: number;
  cash_price: number;
  locator: string;
  total_cost_brl: number;
  cost_brl: number;
}

interface TransporteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelTransfer | null;
  onSubmit: (values: TransporteFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  transfer_type: 'Aeroporto → Hotel',
  origin: '',
  destination: '',
  transfer_date: '',
  transfer_time: '',
  passengers: 1,
  vehicle_type: 'Sedan',
  status: 'pending',
  provider: '',
  flight_number: '',
  notes: '',
  miles_program: '',
  miles_used: 0,
  third_party_miles: false,
  third_party_cost: 0,
  tax_brl: 0,
  cash_price: 0,
  locator: '',
};

export function TransporteFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: TransporteFormDialogProps) {
  const { formatCurrency, formatNumber } = useLocalization();
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
        transfer_type: editing.transfer_type,
        origin: editing.origin,
        destination: editing.destination,
        transfer_date: editing.transfer_date,
        transfer_time: editing.transfer_time || '',
        passengers: editing.passengers,
        vehicle_type: editing.vehicle_type,
        status: editing.status,
        provider: editing.provider || '',
        flight_number: editing.flight_number || '',
        notes: editing.notes || '',
        miles_program: editing.miles_program || '',
        miles_used: editing.miles_used || 0,
        third_party_miles: editing.third_party_miles || false,
        third_party_cost: editing.third_party_cost || 0,
        tax_brl: editing.tax_brl || 0,
        cash_price: editing.cash_price || 0,
        locator: editing.locator || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing]);

  const selectedProgramBalance = formData.miles_program ? getBalanceByProgram(formData.miles_program) : undefined;
  const availableBalance = selectedProgramBalance?.balance || 0;
  const isBalanceInsufficient =
    !!formData.miles_program && !formData.third_party_miles && formData.miles_used > availableBalance;

  const totalCostBrl = useMemo(() => {
    const mileCost =
      formData.third_party_miles && formData.third_party_cost > 0
        ? formData.third_party_cost
        : (formData.miles_used / 1000) * MILE_VALUE_PER_THOUSAND;
    return mileCost + formData.tax_brl;
  }, [formData.miles_used, formData.tax_brl, formData.third_party_miles, formData.third_party_cost]);

  const savings = formData.cash_price - totalCostBrl;
  const savingsPercentage = formData.cash_price > 0 ? (savings / formData.cash_price) * 100 : 0;

  const canSubmit =
    !isSubmitting &&
    !!formData.holder_id &&
    !!formData.origin &&
    !!formData.destination &&
    !isBalanceInsufficient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStatus = formData.locator.trim() ? 'confirmed' : 'pending';

    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      transfer_type: formData.transfer_type,
      origin: formData.origin,
      destination: formData.destination,
      transfer_date: formData.transfer_date,
      transfer_time: formData.transfer_time,
      passengers: formData.passengers,
      vehicle_type: formData.vehicle_type,
      status: finalStatus,
      provider: formData.provider,
      flight_number: formData.flight_number,
      notes: formData.notes,
      miles_program: formData.miles_program || null,
      miles_used: formData.miles_used,
      third_party_miles: formData.third_party_miles,
      third_party_cost: formData.third_party_cost,
      tax_brl: formData.tax_brl,
      cash_price: formData.cash_price,
      locator: formData.locator,
      total_cost_brl: totalCostBrl,
      cost_brl: totalCostBrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Transfer' : 'Novo Transfer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Titular / Mileage Account */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Titular / Conta de Milhas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Label>Titular *</Label>
                <HolderSelect
                  value={formData.holder_id}
                  onValueChange={(id, name) =>
                    setFormData({ ...formData, holder_id: id, holder_name: name || '' })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>Programa de Milhas</Label>
                <ProgramSelect
                  value={formData.miles_program}
                  onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                />
              </div>
            </div>

            {formData.miles_program && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <ProgramLogo program={formData.miles_program} size="sm" />
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                      <p
                        className={`text-lg font-bold ${isBalanceInsufficient ? 'text-destructive' : 'text-primary'}`}
                      >
                        {formatNumber(availableBalance)}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Milhas Utilizadas *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.miles_used || ''}
                    onChange={(e) => setFormData({ ...formData, miles_used: parseInt(e.target.value) || 0 })}
                    className={isBalanceInsufficient ? 'border-destructive' : ''}
                  />
                </div>
              </div>
            )}

            {isBalanceInsufficient && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Saldo insuficiente! Faltam {formatNumber(formData.miles_used - availableBalance)} milhas.
                </AlertDescription>
              </Alert>
            )}

            {formData.miles_program && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="third_party_miles"
                    checked={formData.third_party_miles}
                    onCheckedChange={(checked) => setFormData({ ...formData, third_party_miles: !!checked })}
                  />
                  <Label htmlFor="third_party_miles" className="text-sm cursor-pointer">
                    Milhas de Terceiro (compradas)
                  </Label>
                </div>

                {formData.third_party_miles && (
                  <div>
                    <Label>Valor Pago pelas Milhas (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.third_party_cost || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, third_party_cost: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Transfer Data */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Dados do Transfer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Transfer *</Label>
                <Select
                  value={formData.transfer_type}
                  onValueChange={(v) => setFormData({ ...formData, transfer_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Veículo *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Origem *</Label>
                <Input
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Destino *</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.transfer_time}
                  onChange={(e) => setFormData({ ...formData, transfer_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Passageiros *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.passengers}
                  onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div>
                <Label>Nº do Voo</Label>
                <Input
                  value={formData.flight_number}
                  onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                  placeholder="ex: LA3021"
                />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localizador</Label>
                <Input
                  value={formData.locator}
                  onChange={(e) => setFormData({ ...formData, locator: e.target.value.toUpperCase() })}
                  placeholder="Código de confirmação"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se preenchido, status será "Confirmado" automaticamente
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Costs and Savings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Custos e Economia
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taxa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax_brl || ''}
                  onChange={(e) => setFormData({ ...formData, tax_brl: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Preço em Dinheiro (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cash_price || ''}
                  onChange={(e) => setFormData({ ...formData, cash_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {(formData.miles_used > 0 || formData.cash_price > 0) && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo Milhas:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        formData.third_party_miles
                          ? formData.third_party_cost
                          : (formData.miles_used / 1000) * MILE_VALUE_PER_THOUSAND,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa:</span>
                    <span className="font-medium">{formatCurrency(formData.tax_brl)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Custo Total:</span>
                  <span className="font-bold text-primary">{formatCurrency(totalCostBrl)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço Dinheiro:</span>
                  <span className="font-medium">{formatCurrency(formData.cash_price)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-semibold flex items-center gap-2">
                    {savings >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    Economia:
                  </span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${savings >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(savings)}
                    </span>
                    {formData.cash_price > 0 && (
                      <span className={`text-xs ml-2 ${savings >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ({savingsPercentage >= 0 ? '+' : ''}
                        {savingsPercentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {savings < 0 && formData.cash_price > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Seu custo está {formatCurrency(Math.abs(savings))} mais caro que o preço de mercado!
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
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
