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
import { useLocalization } from '@/hooks/useLocalization';
import type { TravelAttraction } from '@/hooks/travel/types';

const ATTRACTION_TYPES = [
  'Tour guiado',
  'Ingresso',
  'Experiência',
  'Passeio de barco',
  'Show/Espetáculo',
  'Parque temático',
  'Museu',
  'Outro',
];

const PROVIDERS = [
  'Viator',
  'GetYourGuide',
  'Civitatis',
  'Klook',
  'Airbnb Experiences',
  'Local',
  'Outro',
];

export interface AtracaoFormValues {
  holder_id: string | null;
  holder_name: string | null;
  attraction_name: string;
  attraction_type: string;
  city: string;
  country: string;
  activity_date: string;
  participants: number;
  cost_brl: number;
  cash_price: number;
  status: string;
  provider: string;
  notes: string;
}

interface AtracaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelAttraction | null;
  onSubmit: (values: AtracaoFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const EMPTY_FORM = {
  holder_id: '',
  holder_name: '',
  attraction_name: '',
  attraction_type: 'Tour guiado',
  city: '',
  country: 'Brasil',
  activity_date: '',
  participants: 1,
  cost_brl_input: '',
  cash_price_input: '',
  status: 'confirmed',
  provider: '',
  notes: '',
};

export function AtracaoFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting,
}: AtracaoFormDialogProps) {
  const { formatCurrency, formatCurrencyInput, parseCurrency } = useLocalization();
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
        attraction_name: editing.attraction_name,
        attraction_type: editing.attraction_type,
        city: editing.city,
        country: editing.country,
        activity_date: editing.activity_date,
        participants: editing.participants,
        cost_brl_input: formatCurrencyInput(editing.cost_brl.toString().replace('.', ',')),
        cash_price_input: formatCurrencyInput(
          (editing.cash_price || 0).toString().replace('.', ','),
        ),
        status: editing.status,
        provider: editing.provider || '',
        notes: editing.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editing, formatCurrencyInput]);

  const costBrl = parseCurrency(formData.cost_brl_input);
  const cashPrice = parseCurrency(formData.cash_price_input);

  const savings = useMemo(() => cashPrice - costBrl, [cashPrice, costBrl]);

  const handleHolderChange = (value: string, name?: string) => {
    setFormData((prev) => ({ ...prev, holder_id: value, holder_name: name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      holder_id: formData.holder_id || null,
      holder_name: formData.holder_name || null,
      attraction_name: formData.attraction_name,
      attraction_type: formData.attraction_type,
      city: formData.city,
      country: formData.country,
      activity_date: formData.activity_date,
      participants: formData.participants,
      cost_brl: costBrl,
      cash_price: cashPrice,
      status: formData.status,
      provider: formData.provider,
      notes: formData.notes,
    });
  };

  const canSubmit =
    !!formData.holder_id && !!formData.attraction_name && !!formData.city && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Atração' : 'Nova Atração Turística'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titular *</Label>
              <HolderSelect value={formData.holder_id} onValueChange={handleHolderChange} />
            </div>
            <div className="col-span-2">
              <Label>Nome da Atração *</Label>
              <Input
                value={formData.attraction_name}
                onChange={(e) => setFormData({ ...formData, attraction_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.attraction_type}
                onValueChange={(v) => setFormData({ ...formData, attraction_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTRACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Cidade *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>País *</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Data da Atividade *</Label>
              <Input
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Participantes *</Label>
              <Input
                type="number"
                min="1"
                value={formData.participants}
                onChange={(e) =>
                  setFormData({ ...formData, participants: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
            <div>
              <Label>Custo (R$) *</Label>
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
              <Label>Preço em Dinheiro (R$) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.cash_price_input}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cash_price_input: formatCurrencyInput(e.target.value),
                  })
                }
                placeholder="0,00"
                required
              />
            </div>

            {cashPrice > 0 && savings < 0 && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Atenção: Seu custo está {formatCurrency(Math.abs(savings))} mais caro que o
                    preço de mercado!
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
            {(costBrl > 0 || cashPrice > 0) && (
              <div className="col-span-2 p-3 bg-primary/10 rounded-lg border border-primary/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Custo:</span>
                  <span className="font-medium">{formatCurrency(costBrl)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Preço Dinheiro:</span>
                  <span className="font-medium">{formatCurrency(cashPrice)}</span>
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
