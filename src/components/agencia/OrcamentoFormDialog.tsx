import { useEffect, useMemo, useState } from 'react';
import { Building2, Car, FileQuestion, Loader2, Package, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useLocalization } from '@/hooks/useLocalization';
import { addDays, format } from 'date-fns';
import type { TravelQuote } from '@/hooks/travel';

const QUOTE_TYPES = [
  { value: 'ticket', label: 'Passagem', icon: Ticket },
  { value: 'hotel', label: 'Hotel', icon: Building2 },
  { value: 'car', label: 'Carro', icon: Car },
  { value: 'package', label: 'Pacote', icon: Package },
];

const AIRLINES = ['LATAM', 'GOL', 'Azul', 'American Airlines', 'United Airlines', 'Delta', 'TAP', 'Iberia', 'Air France', 'British Airways'];
const RENTAL_COMPANIES = ['Localiza', 'Movida', 'Unidas', 'Hertz', 'Avis', 'Budget', 'Enterprise', 'National', 'Alamo'];
const VEHICLE_CATEGORIES = ['economy', 'compact', 'intermediate', 'standard', 'full', 'suv', 'luxury'];
const HOTEL_PROGRAMS = ['Accor ALL', 'Hilton Honors', 'Marriott Bonvoy', 'World of Hyatt', 'IHG One Rewards', 'Wyndham Rewards'];

const generateQuoteNumber = () => {
  const date = new Date();
  const prefix = 'ORC';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${year}${month}${random}`;
};

export interface OrcamentoFormValues {
  client_id: string;
  quote_type: string;
  quote_number: string;
  status: string;
  valid_until: string;
  description: string;
  miles_program: string;
  miles_estimate: number;
  tax_estimate: number;
  cost_estimate: number;
  sale_price: number;
  origin: string;
  destination: string;
  airline: string;
  flight_date: string;
  return_date: string;
  passengers: number;
  one_way: boolean;
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  nights: number;
  rooms: number;
  hotel_program: string;
  rental_company: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  dropoff_date: string;
  days: number;
  vehicle_category: string;
  notes: string;
}

interface OrcamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TravelQuote | null;
  /** Quote a duplicar (modo novo orçamento, com quote_number regerado e datas limpas). */
  duplicateOf: TravelQuote | null;
  clients: Array<{ id: string; name: string }>;
  onSubmit: (values: OrcamentoFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const emptyForm = (): OrcamentoFormValues => ({
  client_id: '',
  quote_type: 'ticket',
  quote_number: generateQuoteNumber(),
  status: 'pending',
  valid_until: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  description: '',
  miles_program: '',
  miles_estimate: 0,
  tax_estimate: 0,
  cost_estimate: 0,
  sale_price: 0,
  origin: '',
  destination: '',
  airline: '',
  flight_date: '',
  return_date: '',
  passengers: 1,
  one_way: false,
  hotel_name: '',
  city: '',
  check_in: '',
  check_out: '',
  nights: 0,
  rooms: 1,
  hotel_program: '',
  rental_company: '',
  pickup_location: '',
  dropoff_location: '',
  pickup_date: '',
  dropoff_date: '',
  days: 0,
  vehicle_category: '',
  notes: '',
});

const formFromQuote = (quote: TravelQuote, keepDatesAndNumber: boolean): OrcamentoFormValues => ({
  client_id: quote.client_id,
  quote_type: quote.quote_type,
  quote_number: keepDatesAndNumber ? quote.quote_number : generateQuoteNumber(),
  status: keepDatesAndNumber ? quote.status : 'pending',
  valid_until: keepDatesAndNumber
    ? quote.valid_until || ''
    : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  description: quote.description || '',
  miles_program: quote.miles_program || '',
  miles_estimate: quote.miles_estimate,
  tax_estimate: quote.tax_estimate,
  cost_estimate: quote.cost_estimate,
  sale_price: quote.sale_price,
  origin: quote.origin || '',
  destination: quote.destination || '',
  airline: quote.airline || '',
  flight_date: keepDatesAndNumber ? quote.flight_date || '' : '',
  return_date: keepDatesAndNumber ? quote.return_date || '' : '',
  passengers: quote.passengers || 1,
  one_way: quote.one_way || false,
  hotel_name: quote.hotel_name || '',
  city: quote.city || '',
  check_in: keepDatesAndNumber ? quote.check_in || '' : '',
  check_out: keepDatesAndNumber ? quote.check_out || '' : '',
  nights: quote.nights || 0,
  rooms: quote.rooms || 1,
  hotel_program: quote.hotel_program || '',
  rental_company: quote.rental_company || '',
  pickup_location: quote.pickup_location || '',
  dropoff_location: quote.dropoff_location || '',
  pickup_date: keepDatesAndNumber ? quote.pickup_date || '' : '',
  dropoff_date: keepDatesAndNumber ? quote.dropoff_date || '' : '',
  days: quote.days || 0,
  vehicle_category: quote.vehicle_category || '',
  notes: quote.notes || '',
});

export function OrcamentoFormDialog({
  open,
  onOpenChange,
  editing,
  duplicateOf,
  clients,
  onSubmit,
  isSubmitting,
}: OrcamentoFormDialogProps) {
  const { formatCurrency } = useLocalization();
  const [formData, setFormData] = useState<OrcamentoFormValues>(emptyForm);

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm());
      return;
    }
    if (editing) {
      setFormData(formFromQuote(editing, true));
    } else if (duplicateOf) {
      setFormData(formFromQuote(duplicateOf, false));
    } else {
      setFormData(emptyForm());
    }
  }, [open, editing, duplicateOf]);

  const revenue = useMemo(
    () => formData.sale_price - formData.cost_estimate,
    [formData.sale_price, formData.cost_estimate],
  );

  const canSubmit = !isSubmitting && !!formData.client_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número do Orçamento</Label>
              <Input value={formData.quote_number} disabled className="bg-muted" />
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.quote_type}
                onValueChange={(v) => setFormData({ ...formData, quote_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Válido até</Label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição breve do orçamento"
              />
            </div>

            <div className="col-span-2">
              <Label>Programa de Milhas</Label>
              <ProgramSelect
                value={formData.miles_program}
                onValueChange={(v) => setFormData({ ...formData, miles_program: v })}
                placeholder="Selecione o programa"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          <Tabs value={formData.quote_type} className="w-full">
            <TabsContent value="ticket" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Origem</Label>
                  <Input
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Ex: GRU"
                  />
                </div>
                <div>
                  <Label>Destino</Label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Ex: MIA"
                  />
                </div>
                <div>
                  <Label>Companhia Aérea</Label>
                  <Select
                    value={formData.airline}
                    onValueChange={(v) => setFormData({ ...formData, airline: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRLINES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>Data Ida</Label>
                  <Input
                    type="date"
                    value={formData.flight_date}
                    onChange={(e) => setFormData({ ...formData, flight_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Volta</Label>
                  <Input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    disabled={formData.one_way}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hotel" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Nome do Hotel</Label>
                  <Input
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    placeholder="Ex: Hilton São Paulo"
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div>
                  <Label>Check-in</Label>
                  <Input
                    type="date"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input
                    type="date"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quartos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.rooms}
                    onChange={(e) =>
                      setFormData({ ...formData, rooms: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label>Programa do Hotel</Label>
                  <Select
                    value={formData.hotel_program}
                    onValueChange={(v) => setFormData({ ...formData, hotel_program: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOTEL_PROGRAMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="car" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Locadora</Label>
                  <Select
                    value={formData.rental_company}
                    onValueChange={(v) => setFormData({ ...formData, rental_company: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {RENTAL_COMPANIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.vehicle_category}
                    onValueChange={(v) => setFormData({ ...formData, vehicle_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Local Retirada</Label>
                  <Input
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    placeholder="Ex: GRU Aeroporto"
                  />
                </div>
                <div>
                  <Label>Local Devolução</Label>
                  <Input
                    value={formData.dropoff_location}
                    onChange={(e) =>
                      setFormData({ ...formData, dropoff_location: e.target.value })
                    }
                    placeholder="Ex: CGH Aeroporto"
                  />
                </div>
                <div>
                  <Label>Data Retirada</Label>
                  <Input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Devolução</Label>
                  <Input
                    type="date"
                    value={formData.dropoff_date}
                    onChange={(e) => setFormData({ ...formData, dropoff_date: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="package" className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center text-muted-foreground">
                Pacotes combinam múltiplos serviços. Preencha os valores estimados abaixo.
              </div>
            </TabsContent>
          </Tabs>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
            <div>
              <Label>Milhas Estimadas</Label>
              <Input
                type="number"
                value={formData.miles_estimate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, miles_estimate: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Taxas Estimadas (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_estimate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tax_estimate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Custo Estimado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_estimate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, cost_estimate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Valor de Venda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.sale_price || ''}
                onChange={(e) =>
                  setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="col-span-2 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex justify-between items-center">
                <span className="font-medium">Receita Estimada:</span>
                <span className={`text-lg font-bold ${revenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(revenue)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
