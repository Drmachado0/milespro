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
import { CreditCard, Loader2, Calendar, CalendarDays } from 'lucide-react';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useOperations } from '@/hooks/useOperations';
import { supabase } from '@/integrations/supabase/client';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useLocalization } from '@/hooks/useLocalization';
import { addDays, format } from 'date-fns';
import { validadeOptions } from '@/data/validadeOptions';

export default function TransferenciaCartao() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { formatNumber, formatNumberInput, formatCurrencyInput, parseNumber, parseCurrency, formatCurrency, getCurrencySymbol, formatReadOnlyValue } = useLocalization();
  
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
    creditCard: '',
    installments: '1',
    programDestino: '',
    quantity: '',
    bonus: '',
    validadeMonths: 'none',
    custoTotal: '',
    dataOperacao: new Date().toISOString().split('T')[0],
    dataBonusMode: 'dias' as 'dias' | 'especifica',
    diasBonus: '45',
    dataBonus: '',
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
          dataBonus: format(bonusDate, 'yyyy-MM-dd')
        }));
      }
    }
  }, [formData.dataBonusMode, formData.dataOperacao, formData.diasBonus]);

  const quantityNumber = parseNumber(formData.quantity);
  const bonusNumber = parseFloat(formData.bonus) || 0;
  const custoTotalNumber = parseCurrency(formData.custoTotal);

  // Calculations
  const pontosBonus = quantityNumber * (bonusNumber / 100);
  const totalPontos = quantityNumber + pontosBonus;
  
  const custoMilheiro = totalPontos > 0
    ? (custoTotalNumber / (totalPontos / 1000))
    : 0;

  const handleQuantityChange = (value: string) => {
    setFormData({ ...formData, quantity: formatNumberInput(value) });
  };

  const handleCustoTotalChange = (value: string) => {
    setFormData({ ...formData, custoTotal: formatCurrencyInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderId, holderName: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.programDestino || !quantityNumber) {
      return;
    }

    // Get card name from selected ID
    const selectedCard = creditCards.find(c => c.id === formData.creditCard);
    const cardName = selectedCard?.card_name || undefined;

    await createOperation.mutateAsync({
      type: 'transferencia',
      program: formData.programDestino,
      quantity: Math.floor(totalPontos),
      total_cost: custoTotalNumber,
      cost_per_thousand: custoMilheiro,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      credit_card: cardName,
      installments: parseInt(formData.installments) || 1,
      bonus: bonusNumber,
      date: formData.dataOperacao,
      notes: `Transferência via Cartão. ${formData.notes || ''}`,
      status: 'pendente',
    });

    navigate('/dashboard');
  };

  return (
    <DashboardLayout title="Transferência via Cartão">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<CreditCard className="h-5 w-5" />}
          title="Transferência via Cartão"
          subtitle="Transferir pontos de cartão (Rewards, Pass) para programas de milhas"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Titular */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Titular/Conta da Operação</Label>
                <HolderSelect
                  value={formData.holderId}
                  onValueChange={handleHolderChange}
                />
              </div>

              {/* Linha 2 - Cartão e Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cartão de Crédito *</Label>
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
                  {!formData.creditCard && (
                    <span className="text-xs text-destructive">Campo obrigatório.</span>
                  )}
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

              {/* Linha 3 - Programa Destino */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Programa Destino *</Label>
                <ProgramSelect
                  value={formData.programDestino}
                  onValueChange={(value) => setFormData({ ...formData, programDestino: value })}
                  placeholder="Selecione o programa destino"
                />
                {!formData.programDestino && (
                  <span className="text-xs text-destructive">Campo obrigatório.</span>
                )}
              </div>

              {/* Linha 4 - Quantidade, Bônus, Validade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Quantidade *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Bônus</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.bonus}
                      onChange={(e) => setFormData({ ...formData, bonus: e.target.value.replace(/\D/g, '') })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Validade (Meses)</Label>
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
              </div>

              {/* Linha 5 - Custo Total, Custo Milheiro, Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Total R$</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.custoTotal}
                      onChange={(e) => handleCustoTotalChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Milheiro</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={custoMilheiro > 0 ? custoMilheiro.toFixed(2).replace('.', ',') : ''}
                      className="bg-muted pl-10"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data Operação</Label>
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
                    <RadioGroupItem value="dias" id="dias-cartao" />
                    <Label htmlFor="dias-cartao" className="flex items-center gap-2 cursor-pointer">
                      <CalendarDays className="h-4 w-4" />
                      Por número de dias
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="especifica" id="especifica-cartao" />
                    <Label htmlFor="especifica-cartao" className="flex items-center gap-2 cursor-pointer">
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
                          value={formData.dataBonus}
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
                        value={formData.dataBonus}
                        onChange={(e) => setFormData({ ...formData, dataBonus: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview pontos */}
              {totalPontos > 0 && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Total de pontos a transferir:</p>
                  <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-primary">
                    {formatNumber(Math.floor(totalPontos))} pontos
                  </p>
                  {pontosBonus > 0 && (
                    <p className="text-sm text-success mt-1 font-mono tabular-nums">
                      +{formatNumber(Math.floor(pontosBonus))} pontos de bônus ({formData.bonus}%)
                    </p>
                  )}
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações</Label>
                <Textarea
                  placeholder="Notas adicionais sobre a operação..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Botão Submit */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.creditCard || !formData.programDestino || !quantityNumber || createOperation.isPending}
                >
                  {createOperation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
