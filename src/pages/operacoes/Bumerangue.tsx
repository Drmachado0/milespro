import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RefreshCw, Loader2, Info, Calendar, CalendarDays } from 'lucide-react';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useOperations } from '@/hooks/useOperations';
import { supabase } from '@/integrations/supabase/client';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useLocalization } from '@/hooks/useLocalization';
import { addDays, format } from 'date-fns';
import { validadeOptions } from '@/data/validadeOptions';

// Removed fixed bonusOptions - user can now input any bonus percentage

export default function Bumerangue() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { 
    formatNumber, 
    formatNumberInput, 
    formatCurrencyInput, 
    parseNumber, 
    parseCurrency,
    formatReadOnlyValue,
    formatCurrency,
    getCurrencySymbol,
  } = useLocalization();
  
  // Fetch credit cards from database
  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('card_name');
      if (error) throw error;
      return data;
    },
  });
  
  const [formData, setFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    pontosComprados: '',
    custoTotal: '',
    bonusPromocao: '100',
    validadeMonths: 'none',
    creditCard: '',
    installments: '1',
    dataOperacao: new Date().toISOString().split('T')[0],
    dataBonusMode: 'dias' as 'dias' | 'especifica',
    diasBonus: '45',
    dataBonusCredito: '',
    notes: '',
  });

  // Calculate bonus date automatically when using days mode
  useEffect(() => {
    if (formData.dataBonusMode === 'dias' && formData.dataOperacao && formData.diasBonus) {
      const operationDate = new Date(formData.dataOperacao + 'T00:00:00');
      const days = parseInt(formData.diasBonus);
      if (!isNaN(days) && days > 0) {
        const bonusDate = addDays(operationDate, days);
        setFormData(prev => ({
          ...prev,
          dataBonusCredito: format(bonusDate, 'yyyy-MM-dd')
        }));
      }
    }
  }, [formData.dataBonusMode, formData.dataOperacao, formData.diasBonus]);

  const pontosCompradosNumber = parseNumber(formData.pontosComprados);
  const custoTotalNumber = parseCurrency(formData.custoTotal);
  const bonusPercentNumber = parseFloat(formData.bonusPromocao) || 100;

  // Cálculos conforme mecânica Bumerangue Livelo
  // 1. Compra X pontos por R$ Y
  // 2. Livelo devolve X pontos × (bonus% / 100) como bônus
  // 3. Total = pontos comprados + pontos bônus devolvidos
  const pontosBonus = pontosCompradosNumber * (bonusPercentNumber / 100);
  const totalPontos = pontosCompradosNumber + pontosBonus;
  
  // Custo final do milheiro = Custo Total / (Total Pontos / 1000)
  const custoFinalMilheiro = totalPontos > 0 && custoTotalNumber > 0
    ? custoTotalNumber / (totalPontos / 1000)
    : 0;

  const handlePontosCompradosChange = (value: string) => {
    setFormData({ ...formData, pontosComprados: formatNumberInput(value) });
  };

  const handleCustoTotalChange = (value: string) => {
    setFormData({ ...formData, custoTotal: formatCurrencyInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderId, holderName: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pontosCompradosNumber || !custoTotalNumber) {
      return;
    }

    // Get card name from selected ID
    const selectedCard = creditCards.find(c => c.id === formData.creditCard);
    const cardName = selectedCard?.card_name || undefined;

    // Bumerangue is split into two rows so the canonical balance reducer
    // (src/lib/computeBalances.ts) shows the right numbers on day zero AND when
    // the bonus eventually credits:
    //   Row 1 — confirmado: the points the user actually has now (paid for).
    //   Row 2 — pendente:   the bonus points that will land on dataBonusCredito.
    // Without the split, status='pendente' on a single row of totalPontos meant
    // the entire purchase was invisible in the dashboard until the bonus dropped.
    const milheiroCompra = custoTotalNumber / (pontosCompradosNumber / 1000);
    const bonusFloor = Math.floor(pontosBonus);

    await createOperation.mutateAsync({
      type: 'bumerangue',
      program: formData.program,
      quantity: pontosCompradosNumber,
      total_cost: custoTotalNumber,
      cost_per_thousand: milheiroCompra,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      credit_card: cardName,
      installments: parseInt(formData.installments) || 1,
      bonus: 0,
      date: formData.dataOperacao,
      validity: formData.dataBonusCredito || undefined,
      notes: `Bumerangue ${formData.program}: Compra de ${formatNumber(pontosCompradosNumber)} pts por ${formatCurrency(custoTotalNumber)} (milheiro ${formatCurrency(milheiroCompra)}). Bônus de ${bonusPercentNumber}% (${formatNumber(bonusFloor)} pts) previsto para ${formData.dataBonusCredito || 'a definir'}. ${formData.notes || ''}`,
      status: 'confirmado',
    });

    if (bonusFloor > 0) {
      await createOperation.mutateAsync({
        type: 'bumerangue',
        program: formData.program,
        quantity: bonusFloor,
        total_cost: 0,
        cost_per_thousand: 0,
        holder_id: formData.holderId || undefined,
        holder_name: formData.holderName || undefined,
        bonus: bonusPercentNumber,
        date: formData.dataBonusCredito || formData.dataOperacao,
        notes: `Bumerangue ${formData.program}: Bônus pendente ${bonusPercentNumber}% (${formatNumber(bonusFloor)} pts) vinculado à compra de ${formatNumber(pontosCompradosNumber)} pts em ${formData.dataOperacao}. Custo final do milheiro com bônus: ${formatCurrency(custoFinalMilheiro)}.`,
        status: 'pendente',
      });
    }

    navigate('/dashboard');
  };

  const isFormValid = formData.program && pontosCompradosNumber > 0 && custoTotalNumber > 0;

  return (
    <DashboardLayout title="Promoção Bumerangue">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<RefreshCw className="h-5 w-5" />}
          title="Promoção Bumerangue"
          subtitle="Comprar e revender milhas aproveitando promoção — lucro imediato"
        />

        {/* Explicação da mecânica */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Como funciona:</p>
              <p>1. Você compra pontos do programa selecionado</p>
              <p>2. O programa devolve os pontos comprados em dobro (ou mais, dependendo da promoção)</p>
              <p className="mt-1 text-primary font-medium">Ex: Compra 10.000 pts por R$ 350 → Recebe 20.000 pts → Custo: R$ 17,50/mil</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Titular */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Titular/Conta</Label>
                <HolderSelect
                  value={formData.holderId}
                  onValueChange={handleHolderChange}
                />
              </div>

              {/* Programa */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Programa *</Label>
                <ProgramSelect
                  value={formData.program}
                  onValueChange={(value) => setFormData({ ...formData, program: value })}
                  placeholder="Selecione o programa"
                />
              </div>

              {/* Pontos Comprados e Custo Total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pontos Comprados *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 10.000"
                    value={formData.pontosComprados}
                    onChange={(e) => handlePontosCompradosChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Total R$ *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 350,00"
                      value={formData.custoTotal}
                      onChange={(e) => handleCustoTotalChange(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bônus da Promoção */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Bônus da Promoção (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      placeholder="Ex: 100"
                      value={formData.bonusPromocao}
                      onChange={(e) => setFormData({ ...formData, bonusPromocao: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">100% = dobro dos pontos</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pontos Bônus (devolvidos)</Label>
                  <Input
                    value={formatNumber(Math.floor(pontosBonus))}
                    className="bg-success/10 text-success font-mono tabular-nums font-medium"
                    readOnly
                  />
                </div>
              </div>

              {/* Resumo do Bumerangue */}
              {totalPontos > 0 && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Total de Pontos</p>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-primary">
                        {formatNumber(Math.floor(totalPontos))}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono tabular-nums">
                        {formatNumber(pontosCompradosNumber)} + {formatNumber(Math.floor(pontosBonus))} bônus
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Custo Total</p>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                        {formatCurrency(custoTotalNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Custo Final/Milheiro</p>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-success">
                        {formatCurrency(custoFinalMilheiro)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cartão e Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cartão de Crédito</Label>
                  <Select
                    value={formData.creditCard}
                    onValueChange={(value) => setFormData({ ...formData, creditCard: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          <div className="flex items-center gap-2">
                            <CardBrandIcon brand={getBrandFromName(card.card_name)} size="sm" />
                            <span>{card.card_name}</span>
                            {card.last_four_digits && (
                              <span className="text-muted-foreground">*{card.last_four_digits}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Parcelas</Label>
                  <Select
                    value={formData.installments}
                    onValueChange={(value) => setFormData({ ...formData, installments: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Validade e Data Operação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Validade dos Pontos</Label>
                  <Select
                    value={formData.validadeMonths}
                    onValueChange={(value) => setFormData({ ...formData, validadeMonths: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {validadeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data da Operação</Label>
                  <Input
                    type="date"
                    value={formData.dataOperacao}
                    onChange={(e) => setFormData({ ...formData, dataOperacao: e.target.value })}
                  />
                </div>
              </div>

              {/* Data do Bônus */}
              <div className="space-y-4">
                <Label className="text-muted-foreground">Data do Bônus</Label>
                <RadioGroup
                  value={formData.dataBonusMode}
                  onValueChange={(value: 'dias' | 'especifica') => setFormData({ ...formData, dataBonusMode: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dias" id="dias" />
                    <Label htmlFor="dias" className="flex items-center gap-2 cursor-pointer">
                      <CalendarDays className="h-4 w-4" />
                      Por número de dias
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="especifica" id="especifica" />
                    <Label htmlFor="especifica" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4" />
                      Data específica
                    </Label>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.dataBonusMode === 'dias' ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Dias para o bônus cair</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="Ex: 45"
                          value={formData.diasBonus}
                          onChange={(e) => setFormData({ ...formData, diasBonus: e.target.value })}
                        />
                        <span className="text-xs text-muted-foreground">Digite o número de dias (ex: 30, 45, 60)</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Data prevista (calculada)</Label>
                        <Input
                          type="date"
                          value={formData.dataBonusCredito}
                          className="bg-muted"
                          readOnly
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Data específica do bônus</Label>
                      <Input
                        type="date"
                        value={formData.dataBonusCredito}
                        onChange={(e) => setFormData({ ...formData, dataBonusCredito: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações</Label>
                <Textarea
                  placeholder="Adicione observações..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createOperation.isPending || !isFormValid}
                >
                  {createOperation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Bumerangue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
