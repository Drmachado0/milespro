import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useLocalization } from '@/hooks/useLocalization';
import { differenceInDays } from 'date-fns';
import type { TravelInsurance } from '@/hooks/travel/types';

const INSURANCE_COMPANIES = [
  'Assist Card',
  'Travel Ace',
  'GTA',
  'Affinity',
  'April',
  'Intermac',
  'Coris',
  'Porto Seguro Viagem',
  'LATAM Travel Care',
  'Livelo Seguros',
];

const COVERAGE_TYPES = ['Nacional', 'Internacional', 'Multiviagens'];

const PROGRAM_RATES: Record<string, number> = {
  'LATAM Pass': 1.5,
  Livelo: 12,
  Smiles: 2,
  TudoAzul: 2,
  Esfera: 3,
};

export interface SeguroFormValues {
  holder_id: string | null;
  holder_name: string | null;
  insurance_company: string;
  plan_name: string;
  destination: string;
  coverage_type: string;
  start_date: string;
  end_date: string;
  travelers: number;
  cost_brl: number;
  status: string;
  coverage_amount: number;
  notes: string;
  days: number;
  miles_program: string | null;
  points_per_real: number;
  miles_earned: number;
  mile_value_per_thousand: number;
}

interface SeguroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelInsurance | null;
  onSubmit: (values: SeguroFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  insurance_company: '',
  plan_name: '',
  destination: '',
  coverage_type: 'Internacional',
  start_date: '',
  end_date: '',
  travelers: 1,
  cost_brl_input: '',
  status: 'pending',
  coverage_amount_input: '',
  notes: '',
  miles_program: '',
  points_per_real_input: '',
  miles_earned_input: '',
  mile_value_per_thousand_input: '35,00',
};

export function SeguroFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: SeguroFormDialogProps) {
  const { formatCurrency, formatNumber, formatCurrencyInput, parseCurrency } = useLocalization();
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
        insurance_company: editing.insurance_company,
        plan_name: editing.plan_name,
        destination: editing.destination,
        coverage_type: editing.coverage_type,
        start_date: editing.start_date,
        end_date: editing.end_date,
        travelers: editing.travelers,
        cost_brl_input: formatCurrencyInput(editing.cost_brl.toString().replace('.', ',')),
        status: editing.status,
        coverage_amount_input: formatCurrencyInput(
          (editing.coverage_amount || 0).toString().replace('.', ','),
        ),
        notes: editing.notes || '',
        miles_program: editing.miles_program || '',
        points_per_real_input: (editing.points_per_real || 1).toString().replace('.', ','),
        miles_earned_input: (editing.miles_earned || 0).toString(),
        mile_value_per_thousand_input: formatCurrencyInput(
          (editing.mile_value_per_thousand || 35).toString().replace('.', ','),
        ),
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing, formatCurrencyInput]);

  // Auto-fill points_per_real when program changes
  useEffect(() => {
    if (formData.miles_program && PROGRAM_RATES[formData.miles_program]) {
      setFormData((prev) => ({
        ...prev,
        points_per_real_input: PROGRAM_RATES[formData.miles_program]
          .toString()
          .replace('.', ','),
      }));
    }
  }, [formData.miles_program]);

  const days = useMemo(() => {
    if (formData.start_date && formData.end_date) {
      return Math.max(
        1,
        differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1,
      );
    }
    return 0;
  }, [formData.start_date, formData.end_date]);

  const costBrl = parseCurrency(formData.cost_brl_input);
  const coverageAmount = parseCurrency(formData.coverage_amount_input);
  const pointsPerReal = parseCurrency(formData.points_per_real_input);
  const mileValuePerThousand = parseCurrency(formData.mile_value_per_thousand_input);

  const calculatedMilesEarned = useMemo(() => {
    if (formData.miles_earned_input) {
      return parseInt(formData.miles_earned_input.replace(/\D/g, '')) || 0;
    }
    return Math.floor(costBrl * pointsPerReal);
  }, [costBrl, pointsPerReal, formData.miles_earned_input]);

  const milesValue = useMemo(
    () => (calculatedMilesEarned / 1000) * mileValuePerThousand,
    [calculatedMilesEarned, mileValuePerThousand],
  );

  const effectiveCost = useMemo(() => costBrl - milesValue, [costBrl, milesValue]);

  const savingsPercent = useMemo(() => {
    if (costBrl <= 0) return 0;
    return (milesValue / costBrl) * 100;
  }, [milesValue, costBrl]);

  const canSubmit =
    !!formData.holder_id &&
    !!formData.insurance_company &&
    !!formData.plan_name &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      insurance_company: formData.insurance_company,
      plan_name: formData.plan_name,
      destination: formData.destination,
      coverage_type: formData.coverage_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      travelers: formData.travelers,
      cost_brl: costBrl,
      status: formData.status,
      coverage_amount: coverageAmount,
      notes: formData.notes,
      days,
      miles_program: formData.miles_program || null,
      points_per_real: pointsPerReal || 1,
      miles_earned: calculatedMilesEarned,
      mile_value_per_thousand: mileValuePerThousand || 35,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Seguro' : 'Novo Seguro Viagem'}</DialogTitle>
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
              <Label>Seguradora *</Label>
              <Select
                value={formData.insurance_company}
                onValueChange={(v) => setFormData({ ...formData, insurance_company: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seguradora" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_COMPANIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Plano *</Label>
              <Input
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
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
              <Label>Tipo de Cobertura *</Label>
              <Select
                value={formData.coverage_type}
                onValueChange={(v) => setFormData({ ...formData, coverage_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data Fim *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
            {days > 0 && (
              <div className="col-span-2 text-sm text-muted-foreground">
                {days} dia(s) de cobertura
              </div>
            )}
            <div>
              <Label>Viajantes *</Label>
              <Input
                type="number"
                min="1"
                value={formData.travelers}
                onChange={(e) =>
                  setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
            <div>
              <Label>Valor Cobertura (USD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.coverage_amount_input}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coverage_amount_input: formatCurrencyInput(e.target.value),
                  })
                }
                placeholder="0,00"
              />
            </div>

            <div className="col-span-2 border-t pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">PAGAMENTO</Label>
            </div>
            <div>
              <Label>Custo Seguro (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.cost_brl_input}
                onChange={(e) =>
                  setFormData({ ...formData, cost_brl_input: formatCurrencyInput(e.target.value) })
                }
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 border-t pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">
                ACÚMULO DE MILHAS
              </Label>
            </div>
            <div>
              <Label>Programa de Acúmulo</Label>
              <ProgramSelect
                value={formData.miles_program}
                onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                placeholder="Selecione"
              />
            </div>
            <div>
              <Label>Taxa (pts/R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.points_per_real_input}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    points_per_real_input: formatCurrencyInput(e.target.value),
                  })
                }
                placeholder="1,00"
              />
            </div>
            <div>
              <Label>Milhas Acumuladas</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.miles_earned_input || calculatedMilesEarned.toString()}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    miles_earned_input: e.target.value.replace(/\D/g, ''),
                  })
                }
                placeholder="Calculado automaticamente"
              />
              {costBrl > 0 && pointsPerReal > 0 && !formData.miles_earned_input && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto: {formatNumber(costBrl)} × {pointsPerReal} ={' '}
                  {formatNumber(calculatedMilesEarned)}
                </p>
              )}
            </div>
            <div>
              <Label>Valor Milheiro Ref (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.mile_value_per_thousand_input}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mile_value_per_thousand_input: formatCurrencyInput(e.target.value),
                  })
                }
                placeholder="35,00"
              />
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {costBrl > 0 && formData.miles_program && (
              <div className="col-span-2 p-3 bg-primary/10 rounded-lg border border-primary/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Custo do Seguro:</span>
                  <span className="font-medium">{formatCurrency(costBrl)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Milhas Acumuladas:</span>
                  <span className="font-medium">
                    {formatNumber(calculatedMilesEarned)} {formData.miles_program}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor das Milhas:</span>
                  <span className="font-medium text-success">{formatCurrency(milesValue)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Custo Efetivo:</span>
                  <span className="font-bold">{formatCurrency(effectiveCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Economia:</span>
                  <span className="font-bold text-success">
                    {formatCurrency(milesValue)} ({savingsPercent.toFixed(1)}%)
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
