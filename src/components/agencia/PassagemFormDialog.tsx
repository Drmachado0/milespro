import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plane, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import type { TravelTicket } from '@/hooks/travel';

const MILE_VALUE_PER_THOUSAND = 35;

// Airlines grouped by region for the dropdown
const AIRLINES_BY_REGION = [
  {
    label: 'Brasil',
    airlines: [
      { name: 'GOL Linhas Aéreas', abbrev: 'GL' },
      { name: 'Azul Linhas Aéreas Brasileiras', abbrev: 'AZ' },
      { name: 'LATAM Airlines Brasil', abbrev: 'LT' },
    ],
  },
  {
    label: 'América do Sul',
    airlines: [
      { name: 'Aerolineas Argentinas', abbrev: 'AR' },
      { name: 'Flybondi', abbrev: 'FO' },
      { name: 'JetSMART', abbrev: 'JA' },
      { name: 'Sky Airline', abbrev: 'SK' },
      { name: 'LATAM Chile', abbrev: 'LC' },
      { name: 'Avianca', abbrev: 'AV' },
    ],
  },
  {
    label: 'América do Norte',
    airlines: [
      { name: 'American Airlines', abbrev: 'AA' },
      { name: 'Delta Air Lines', abbrev: 'DL' },
      { name: 'United Airlines', abbrev: 'UA' },
      { name: 'Southwest Airlines', abbrev: 'SW' },
      { name: 'Alaska Airlines', abbrev: 'AS' },
      { name: 'JetBlue', abbrev: 'JB' },
      { name: 'Air Canada', abbrev: 'AC' },
    ],
  },
  {
    label: 'Europa',
    airlines: [
      { name: 'TAP Air Portugal', abbrev: 'TP' },
      { name: 'Lufthansa', abbrev: 'LH' },
      { name: 'KLM', abbrev: 'KL' },
      { name: 'Air France', abbrev: 'AF' },
      { name: 'British Airways', abbrev: 'BA' },
      { name: 'Iberia', abbrev: 'IB' },
      { name: 'Turkish Airlines', abbrev: 'TK' },
    ],
  },
  {
    label: 'Oriente Médio',
    airlines: [
      { name: 'Emirates', abbrev: 'EK' },
      { name: 'Etihad Airways', abbrev: 'EY' },
      { name: 'Qatar Airways', abbrev: 'QR' },
    ],
  },
  {
    label: 'Ásia/Oceania',
    airlines: [
      { name: 'Singapore Airlines', abbrev: 'SQ' },
      { name: 'Cathay Pacific', abbrev: 'CX' },
      { name: 'ANA', abbrev: 'NH' },
      { name: 'Japan Airlines', abbrev: 'JL' },
      { name: 'Qantas', abbrev: 'QF' },
    ],
  },
];

export interface PassagemFormValues {
  holder_id: string | null;
  holder_name: string | null;
  origin: string;
  destination: string;
  airline: string;
  flight_date: string;
  return_date: string | null;
  passengers: number;
  miles_used: number;
  tax_brl: number;
  status: string;
  locator: string;
  notes: string;
  one_way: boolean;
  baggage_cost: number;
  extra_services_cost: number;
  miles_program: string | null;
  third_party_miles: boolean;
  third_party_cost: number;
  total_cost_brl: number;
  cash_price: number;
  flight_number: string | null;
  flight_time: string | null;
}

interface PassagemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelTicket | null;
  onSubmit: (values: PassagemFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  origin: '',
  destination: '',
  airline: '',
  flight_date: '',
  return_date: '',
  passengers: 1,
  miles_used: 0,
  tax_brl: 0,
  status: 'pending',
  locator: '',
  notes: '',
  one_way: false,
  baggage_cost: 0,
  extra_services_cost: 0,
  miles_program: '',
  third_party_miles: false,
  third_party_cost: 0,
  cash_price: 0,
  flight_number: '',
  flight_time: '',
};

export function PassagemFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: PassagemFormDialogProps) {
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
        origin: editing.origin,
        destination: editing.destination,
        airline: editing.airline,
        flight_date: editing.flight_date,
        return_date: editing.return_date || '',
        passengers: editing.passengers,
        miles_used: editing.miles_used,
        tax_brl: editing.tax_brl,
        status: editing.status,
        locator: editing.locator || '',
        notes: editing.notes || '',
        one_way: editing.one_way || false,
        baggage_cost: editing.baggage_cost || 0,
        extra_services_cost: editing.extra_services_cost || 0,
        miles_program: editing.miles_program || '',
        third_party_miles: editing.third_party_miles || false,
        third_party_cost: editing.third_party_cost || 0,
        cash_price: editing.cash_price || 0,
        flight_number: editing.flight_number || '',
        flight_time: editing.flight_time || '',
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
    return mileCost + formData.tax_brl + formData.baggage_cost + formData.extra_services_cost;
  }, [formData.miles_used, formData.tax_brl, formData.baggage_cost, formData.extra_services_cost, formData.third_party_miles, formData.third_party_cost]);

  const savings = formData.cash_price - totalCostBrl;
  const savingsPercentage = formData.cash_price > 0 ? (savings / formData.cash_price) * 100 : 0;

  const canSubmit = !isSubmitting && !isBalanceInsufficient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStatus = formData.locator.trim() ? 'confirmed' : 'pending';

    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      origin: formData.origin,
      destination: formData.destination,
      airline: formData.airline,
      flight_date: formData.flight_date,
      return_date: formData.one_way ? null : formData.return_date || null,
      passengers: formData.passengers,
      miles_used: formData.miles_used,
      tax_brl: formData.tax_brl,
      status: finalStatus,
      locator: formData.locator,
      notes: formData.notes,
      one_way: formData.one_way,
      baggage_cost: formData.baggage_cost,
      extra_services_cost: formData.extra_services_cost,
      miles_program: formData.miles_program || null,
      third_party_miles: formData.third_party_miles,
      third_party_cost: formData.third_party_cost,
      total_cost_brl: totalCostBrl,
      cash_price: formData.cash_price,
      flight_number: formData.flight_number || null,
      flight_time: formData.flight_time || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Passagem' : 'Nova Emissão de Passagem'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          {/* Section 1: Titular/Conta de Milhas */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Wallet className="h-4 w-4" />
              Titular/Conta de Milhas
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Titular/Conta *</Label>
                <HolderSelect
                  value={formData.holder_id}
                  onValueChange={(id, name) => setFormData({ ...formData, holder_id: id, holder_name: name || '' })}
                  placeholder="Selecione o titular"
                />
                <p className="text-xs text-muted-foreground mt-1">Conta de onde serão debitadas as milhas</p>
              </div>
              <div>
                <Label>Programa de Milhagem *</Label>
                <ProgramSelect
                  value={formData.miles_program}
                  onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                  placeholder="Selecione o programa"
                  categories={['pontos', 'brasil', 'americas', 'europa', 'asia']}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Saldo Disponível</Label>
                <div
                  className={`h-10 px-3 flex items-center rounded-md border font-medium ${
                    isBalanceInsufficient
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {formData.miles_program ? (
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={formData.miles_program} size="sm" />
                      <span>{formatNumber(availableBalance)} milhas</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecione um programa</span>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="third_party_miles"
                    checked={formData.third_party_miles}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, third_party_miles: checked === true })
                    }
                  />
                  <Label htmlFor="third_party_miles" className="text-sm font-normal cursor-pointer">
                    Milhas compradas de terceiro
                  </Label>
                </div>
              </div>
            </div>

            {formData.third_party_miles && (
              <div className="max-w-xs">
                <Label>Valor Pago pelas Milhas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.third_party_cost || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, third_party_cost: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Ex: 1500.00"
                />
              </div>
            )}
          </div>

          {/* Section 2: Dados do Voo */}
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plane className="h-4 w-4 text-primary" />
              Dados do Voo
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Origem *</Label>
                <Input
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                  placeholder="GRU"
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <Label>Destino *</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                  placeholder="MIA"
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <Label>Companhia Aérea *</Label>
                <Select
                  value={formData.airline}
                  onValueChange={(v) => setFormData({ ...formData, airline: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRLINES_BY_REGION.map((region) => (
                      <SelectGroup key={region.label}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">
                          {region.label}
                        </SelectLabel>
                        {region.airlines.map((airline) => (
                          <SelectItem key={airline.name} value={airline.name}>
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={airline.name} size="sm" />
                              {airline.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Nº do Voo</Label>
                <Input
                  value={formData.flight_number}
                  onChange={(e) => setFormData({ ...formData, flight_number: e.target.value.toUpperCase() })}
                  placeholder="LA3456"
                />
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.flight_time}
                  onChange={(e) => setFormData({ ...formData, flight_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Passageiros</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.passengers}
                  onChange={(e) =>
                    setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Localizador</Label>
                <Input
                  value={formData.locator}
                  onChange={(e) => setFormData({ ...formData, locator: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="one_way"
                checked={formData.one_way}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, one_way: checked === true, return_date: '' })
                }
              />
              <Label htmlFor="one_way" className="text-sm font-normal cursor-pointer">
                Somente Ida
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Ida *</Label>
                <Input
                  type="date"
                  value={formData.flight_date}
                  onChange={(e) => setFormData({ ...formData, flight_date: e.target.value })}
                  required
                />
              </div>
              {!formData.one_way && (
                <div>
                  <Label>Data Volta</Label>
                  <Input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Custos e Economia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
              <div className="text-sm font-medium">Custo das Milhas</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Milhas Utilizadas *</Label>
                  <Input
                    type="number"
                    value={formData.miles_used || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, miles_used: parseInt(e.target.value) || 0 })
                    }
                    required
                    className={isBalanceInsufficient ? 'border-destructive' : ''}
                  />
                </div>
                <div>
                  <Label className="text-xs">Taxa Embarque (R$)</Label>
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
                  <Label className="text-xs">Bagagem (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.baggage_cost || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, baggage_cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Extras (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.extra_services_cost || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, extra_services_cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="p-2 bg-muted rounded text-center">
                <span className="text-xs text-muted-foreground">Custo Total:</span>
                <span className="font-mono text-lg font-bold tabular-nums tracking-tight ml-2">
                  {formatCurrency(totalCostBrl)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4">
              <div className="text-sm font-medium text-primary">Comparação com Dinheiro</div>
              <div>
                <Label>Preço em Dinheiro (R$) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.cash_price ? formatCurrencyInput(formData.cash_price.toString()) : ''}
                  onChange={(e) => setFormData({ ...formData, cash_price: parseCurrency(e.target.value) })}
                  placeholder="R$ 0,00"
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preço da passagem se comprasse sem usar milhas
                </p>
              </div>
              <div
                className={`p-3 rounded-lg text-center ${
                  savings >= 0
                    ? 'bg-success/10 border border-success/30'
                    : 'bg-destructive/10 border border-destructive/30'
                }`}
              >
                <span className="text-xs text-muted-foreground block">
                  {savings >= 0 ? 'Economia:' : 'Prejuízo:'}
                </span>
                <div className="flex items-center justify-center gap-2">
                  {savings >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  <span
                    className={`font-mono text-xl font-bold tabular-nums tracking-tight ${
                      savings >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {formatCurrency(Math.abs(savings))}
                  </span>
                  {formData.cash_price > 0 && (
                    <span className={`text-sm ${savings >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ({Math.abs(savingsPercentage).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {savings < 0 && formData.cash_price > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Comprar com milhas está {formatCurrency(Math.abs(savings))} mais caro!
                Considere comprar a passagem diretamente em dinheiro.
              </AlertDescription>
            </Alert>
          )}

          {isBalanceInsufficient && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Saldo insuficiente no programa selecionado. Disponível: {formatNumber(availableBalance)} milhas.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Emitir Passagem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
