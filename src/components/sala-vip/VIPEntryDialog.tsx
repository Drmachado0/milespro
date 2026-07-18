import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangle, Loader2, Infinity as InfinityIcon, User, Users } from 'lucide-react';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useCreateVIPEntry, useVIPLocations } from '@/hooks/useVIPEntries';
import { useVIPCounters, useVIPCardsWithQuota } from '@/hooks/useVIPCounters';
import { cn } from '@/lib/utils';

const SUGGESTED_LOCATIONS = [
  'GRU T3 - LATAM',
  'GRU T3 - Star Alliance',
  'GIG T2 - Internacional',
  'CGH - GOL Premium',
  'BSB - Smiles',
  'GRU T2 - Azul',
  'VCP - Azul',
  'SSA - Salvador',
  'FOR - Fortaleza',
  'REC - Recife',
];

const formSchema = z.object({
  card_id: z.string().min(1, 'Selecione um cartão'),
  person_name: z.string().optional(),
  relationship: z.enum(['titular', 'convidado'], {
    required_error: 'Selecione o vínculo',
  }),
  location: z.string().min(1, 'Informe o local'),
  access_date: z.date({
    required_error: 'Selecione a data',
  }),
  access_time: z.string().min(1, 'Informe o horário'),
  notes: z.string().optional(),
}).refine((data) => {
  // If convidado, person_name is required
  if (data.relationship === 'convidado') {
    return data.person_name && data.person_name.length >= 2;
  }
  return true;
}, {
  message: 'Nome do convidado deve ter pelo menos 2 caracteres',
  path: ['person_name'],
});

type FormValues = z.infer<typeof formSchema>;

interface VIPEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VIPEntryDialog({ open, onOpenChange }: VIPEntryDialogProps) {
  const [customLocation, setCustomLocation] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  
  const { data: cards, refetch: refetchCards } = useVIPCardsWithQuota();
  const { data: counters, refetch: refetchCounters } = useVIPCounters();
  const { data: userLocations } = useVIPLocations();
  const createMutation = useCreateVIPEntry();

  // Refetch cards when dialog opens
  useEffect(() => {
    if (open) {
      refetchCards();
      refetchCounters();
    }
  }, [open, refetchCards, refetchCounters]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      card_id: '',
      person_name: '',
      relationship: 'titular',
      location: '',
      access_date: new Date(),
      access_time: format(new Date(), 'HH:mm'),
      notes: '',
    },
  });

  const selectedCardId = form.watch('card_id');
  const selectedRelationship = form.watch('relationship');
  const selectedCard = cards?.find(c => c.id === selectedCardId);
  const selectedCounter = counters?.find(c => c.cardId === selectedCardId);
  
  // Check quota based on relationship type
  const currentQuotaRemaining = selectedRelationship === 'titular' 
    ? selectedCounter?.titularRemaining 
    : selectedCounter?.convidadoRemaining;
  
  const isCurrentQuotaUnlimited = selectedRelationship === 'titular'
    ? selectedCounter?.isTitularUnlimited
    : selectedCounter?.isConvidadoUnlimited;

  const currentQuotaTotal = selectedRelationship === 'titular'
    ? selectedCounter?.titularQuota
    : selectedCounter?.convidadoQuota;

  const isQuotaExhausted = selectedCounter && !isCurrentQuotaUnlimited && currentQuotaRemaining === 0;
  const isQuotaLow = selectedCounter && !isCurrentQuotaUnlimited && 
    typeof currentQuotaRemaining === 'number' && 
    currentQuotaRemaining <= 5 && currentQuotaRemaining > 0;

  // Reset override when card or relationship changes
  useEffect(() => {
    setOverrideConfirmed(false);
  }, [selectedCardId, selectedRelationship]);

  // Auto-fill person_name when titular is selected
  useEffect(() => {
    if (selectedRelationship === 'titular' && selectedCard?.cardholder_name) {
      form.setValue('person_name', selectedCard.cardholder_name);
    } else if (selectedRelationship === 'convidado') {
      form.setValue('person_name', '');
    }
  }, [selectedRelationship, selectedCard, form]);

  const allLocations = [...new Set([...SUGGESTED_LOCATIONS, ...(userLocations || [])])];

  const handleSubmit = async (values: FormValues, saveAndNew = false) => {
    const [hours, minutes] = values.access_time.split(':').map(Number);
    const accessDate = new Date(values.access_date);
    accessDate.setHours(hours, minutes, 0, 0);

    // For titular, use cardholder_name from the card
    const personName = values.relationship === 'titular' 
      ? selectedCard?.cardholder_name || values.person_name || ''
      : values.person_name || '';

    await createMutation.mutateAsync({
      card_id: values.card_id,
      person_name: personName,
      relationship: values.relationship,
      location: values.location,
      access_date: accessDate.toISOString(),
      override: isQuotaExhausted && overrideConfirmed,
      notes: values.notes || undefined,
    });

    if (saveAndNew) {
      form.reset({
        card_id: values.card_id,
        person_name: '',
        relationship: 'titular',
        location: values.location,
        access_date: new Date(),
        access_time: format(new Date(), 'HH:mm'),
        notes: '',
      });
      setOverrideConfirmed(false);
    } else {
      onOpenChange(false);
      form.reset();
    }
  };

  const canSubmit = !isQuotaExhausted || (isQuotaExhausted && overrideConfirmed && form.watch('notes'));

  const getQuotaDisplay = (counter: typeof selectedCounter) => {
    if (!counter) return null;
    
    return (
      <div className="flex gap-1">
        <Badge 
          variant={counter.titularStatus === 'critical' ? 'destructive' : counter.titularStatus === 'warning' ? 'outline' : 'secondary'}
          className="text-xs gap-0.5"
        >
          <User className="h-2.5 w-2.5" />
          {counter.isTitularUnlimited ? <InfinityIcon className="h-2.5 w-2.5" /> : `${counter.titularRemaining}`}
        </Badge>
        <Badge 
          variant={counter.convidadoStatus === 'critical' ? 'destructive' : counter.convidadoStatus === 'warning' ? 'outline' : 'secondary'}
          className="text-xs gap-0.5"
        >
          <Users className="h-2.5 w-2.5" />
          {counter.isConvidadoUnlimited ? <InfinityIcon className="h-2.5 w-2.5" /> : `${counter.convidadoRemaining}`}
        </Badge>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Entrada VIP</DialogTitle>
          <DialogDescription>
            Registre o acesso de uma pessoa à sala VIP
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => handleSubmit(v, false))} className="space-y-4">
            {/* Card Selection */}
            <FormField
              control={form.control}
              name="card_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cartão *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cards?.map((card) => {
                        const counter = counters?.find(c => c.cardId === card.id);
                        return (
                          <SelectItem key={card.id} value={card.id}>
                            <div className="flex items-center gap-2">
                              <CardBrandIcon 
                                brand={getBrandFromName(card.card_name)} 
                                size="sm" 
                                className="shrink-0"
                              />
                              <span>{card.card_name}</span>
                              <span className="text-muted-foreground">
                                (**** {card.last_four_digits || '0000'})
                              </span>
                              {getQuotaDisplay(counter)}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relationship */}
            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vínculo *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="titular" id="titular" />
                        <Label htmlFor="titular" className="cursor-pointer flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Titular
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="convidado" id="convidado" />
                        <Label htmlFor="convidado" className="cursor-pointer flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Convidado
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quota Alerts - now based on selected relationship */}
            {isQuotaLow && selectedCounter && (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  Atenção: restam apenas {currentQuotaRemaining} entrada(s) de {selectedRelationship} este ano.
                </AlertDescription>
              </Alert>
            )}

            {isQuotaExhausted && selectedCounter && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Cota de {selectedRelationship} esgotada!</p>
                  <p className="text-sm mb-2">
                    Este cartão já atingiu o limite de {currentQuotaTotal} entradas de {selectedRelationship} este ano.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConfirmed}
                      onChange={(e) => setOverrideConfirmed(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Registrar mesmo assim (requer justificativa)</span>
                  </label>
                </AlertDescription>
              </Alert>
            )}

            {/* Person Name - only show for convidado or when titular has no cardholder_name */}
            {selectedRelationship === 'convidado' ? (
              <FormField
                control={form.control}
                name="person_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Convidado *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do convidado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="person_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Titular</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={selectedCard?.cardholder_name || "Selecione um cartão"}
                        {...field}
                        value={selectedCard?.cardholder_name || field.value}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                    {!selectedCard?.cardholder_name && selectedCardId && (
                      <FormDescription className="text-warning">
                        Este cartão não tem nome do titular cadastrado. Atualize o cartão em Gestão &gt; Cartões.
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />
            )}

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local *</FormLabel>
                  {customLocation ? (
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Ex: GRU T3 - LATAM" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCustomLocation(false);
                          field.onChange('');
                        }}
                      >
                        Lista
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allLocations.map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomLocation(true)}
                      >
                        Outro
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="access_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observação {isQuotaExhausted && overrideConfirmed && '*'}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={isQuotaExhausted && overrideConfirmed 
                        ? "Justificativa obrigatória para excedente de cota..."
                        : "Observações opcionais..."
                      } 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={form.handleSubmit((v) => handleSubmit(v, true))}
                disabled={createMutation.isPending || !canSubmit}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar + Novo
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !canSubmit}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
