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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingCart, Loader2, Calendar, CalendarDays, CreditCard } from 'lucide-react';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramLogo } from '@/components/ui/program-logo';
import { BankLogo } from '@/components/ui/bank-logo';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useOperations } from '@/hooks/useOperations';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/hooks/useLocalization';
import { addDays, format } from 'date-fns';
import { validadeOptions } from '@/data/validadeOptions';

const parcelasOptions = [
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '3', label: '3x' },
  { value: '4', label: '4x' },
  { value: '5', label: '5x' },
  { value: '6', label: '6x' },
  { value: '10', label: '10x' },
  { value: '12', label: '12x' },
];

export default function Transferencia() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { balances: programBalances, getBalanceByProgram } = useProgramBalances();
  const { 
    formatNumber, 
    formatNumberInput, 
    formatCurrencyInput, 
    parseNumber, 
    parseCurrency,
    formatCurrency,
    getCurrencySymbol,
    formatReadOnlyValue,
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
    holderIdOrigem: '',
    holderNameOrigem: '',
    holderIdDestino: '',
    holderNameDestino: '',
    programaOrigem: '',
    pontosConta: '',
    conversao: '1',
    usarCarrinho: false,
    pontosCarrinho: '',
    custoCarrinho: '',
    creditCardId: '',
    parcelas: '1',
    validadeMilhas: 'none',
    bonus: '100',
    validadeBonus: 'none',
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

  const pontosContaNumber = parseNumber(formData.pontosConta);
  const conversaoNumber = parseFloat(formData.conversao) || 1;
  const bonusPercent = parseFloat(formData.bonus) || 0;
  const pontosCarrinhoNumber = parseNumber(formData.pontosCarrinho);
  const custoCarrinhoNumber = parseCurrency(formData.custoCarrinho);

  // Get balance for selected program
  const selectedBalance = formData.programaOrigem ? getBalanceByProgram(formData.programaOrigem) : undefined;
  const saldoDisponivel = selectedBalance?.balance || 0;
  const custoMedio = selectedBalance?.averageCost || 0;

  // Calculations - Fixed logic:
  // 1. Total Pontos = Pontos Conta + Pontos Carrinho
  const totalPontosTransferencia = pontosContaNumber + (formData.usarCarrinho ? pontosCarrinhoNumber : 0);
  
  // 2. Milhas = Total Pontos × Conversão
  const milhas = totalPontosTransferencia * conversaoNumber;
  
  // 3. Milhas Bônus = Milhas × (Bônus%)
  const milhasBonus = milhas * (bonusPercent / 100);
  
  // 4. Total final de milhas (para cálculo do custo)
  const totalMilhasFinal = milhas + milhasBonus;
  
  // 5. Custo calculation - based on total milhas including bonus
  // Custo dos pontos da conta (baseado no custo médio)
  const custoPontosConta = pontosContaNumber * (custoMedio / 1000);
  // Custo do carrinho (se usado)
  const custoCarrinho = formData.usarCarrinho ? custoCarrinhoNumber : 0;
  // Custo total = custo da conta + custo carrinho
  const custoTotal = custoPontosConta + custoCarrinho;
  // Custo milheiro final baseado no total de milhas (incluindo bônus)
  const custoMilheiroFinal = totalMilhasFinal > 0
    ? custoTotal / (totalMilhasFinal / 1000)
    : 0;

  const handlePontosContaChange = (value: string) => {
    setFormData({ ...formData, pontosConta: formatNumberInput(value) });
  };

  const handlePontosCarrinhoChange = (value: string) => {
    setFormData({ ...formData, pontosCarrinho: formatNumberInput(value) });
  };

  const handleCustoCarrinhoChange = (value: string) => {
    setFormData({ ...formData, custoCarrinho: formatCurrencyInput(value) });
  };

  const handleHolderOrigemChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderIdOrigem: holderId, holderNameOrigem: holderName || '' });
  };

  const handleHolderDestinoChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderIdDestino: holderId, holderNameDestino: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pontosContaNumber || !formData.programaOrigem) {
      return;
    }

    await createOperation.mutateAsync({
      type: 'transferencia',
      program: formData.programaOrigem,
      quantity: Math.floor(totalMilhasFinal),
      total_cost: custoTotal || 0,
      cost_per_thousand: custoMilheiroFinal,
      holder_id: formData.holderIdDestino || formData.holderIdOrigem || undefined,
      holder_name: formData.holderNameDestino || formData.holderNameOrigem || undefined,
      bonus: bonusPercent,
      date: formData.dataOperacao,
      credit_card: formData.creditCardId && formData.creditCardId !== 'none' ? formData.creditCardId : undefined,
      installments: parseInt(formData.parcelas),
      notes: `Pontos Conta: ${formatNumber(pontosContaNumber)}. ${formData.usarCarrinho ? `Pontos Carrinho: ${formatNumber(pontosCarrinhoNumber)}.` : ''} Total Pontos: ${formatNumber(totalPontosTransferencia)}. Conversão: ${conversaoNumber}x. Milhas: ${formatNumber(milhas)}. Bônus: ${bonusPercent}%. Milhas Bônus: ${formatNumber(milhasBonus)}. Total Milhas: ${formatNumber(totalMilhasFinal)}. ${formData.usarCarrinho ? `Custo Carrinho: R$ ${formData.custoCarrinho}.` : ''} ${formData.notes || ''}`,
      status: 'confirmado',
    });

    navigate('/dashboard');
  };

  // Programs with balance for selection
  const programsWithBalance = programBalances.filter(b => b.balance > 0);

  return (
    <DashboardLayout title="Transferência entre Contas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Transferência entre Contas"
          subtitle="Converta pontos de um programa em milhas de outro com conversão e custo configuráveis"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Titular Origem >> Titular Destino */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta de Origem</Label>
                  <HolderSelect
                    value={formData.holderIdOrigem}
                    onValueChange={handleHolderOrigemChange}
                  />
                </div>
                <div className="flex justify-center pb-2">
                  <span className="text-xl text-primary font-bold">&gt;&gt;</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta de Destino</Label>
                  <HolderSelect
                    value={formData.holderIdDestino}
                    onValueChange={handleHolderDestinoChange}
                  />
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Programa e Custo médio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Saldo disponível *</Label>
                      <Select 
                        value={formData.programaOrigem} 
                        onValueChange={(value) => setFormData({ ...formData, programaOrigem: value })}
                      >
                        <SelectTrigger>
                          {formData.programaOrigem ? (
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={formData.programaOrigem} size="sm" />
                              <span>{formData.programaOrigem}</span>
                              <span className="text-muted-foreground text-xs">
                                ({formatNumber(getBalanceByProgram(formData.programaOrigem)?.balance || 0)})
                              </span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Selecione" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {programsWithBalance.length === 0 ? (
                            <SelectItem value="no-programs" disabled>
                              Nenhum programa com saldo
                            </SelectItem>
                          ) : (
                            programsWithBalance.map((balance) => (
                              <SelectItem key={balance.program} value={balance.program}>
                                <div className="flex items-center gap-2">
                                  <ProgramLogo program={balance.program} size="sm" />
                                  <span>{balance.program}</span>
                                  <span className="text-muted-foreground">
                                    ({formatNumber(balance.balance)})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Custo médio</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          value={custoMedio.toFixed(2).replace('.', ',')}
                          className="bg-muted pl-10"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pontos Conta e Conversão */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Pontos Conta *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ex: 1.000"
                          value={formData.pontosConta}
                          onChange={(e) => handlePontosContaChange(e.target.value)}
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Conversão</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        value={formData.conversao}
                        onChange={(e) => setFormData({ ...formData, conversao: e.target.value.replace(/[^0-9.,]/g, '') })}
                      />
                    </div>
                  </div>

                  {/* Checkbox - Usar Carrinho */}
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="usarCarrinho"
                      checked={formData.usarCarrinho}
                      onCheckedChange={(checked) => setFormData({ ...formData, usarCarrinho: checked === true })}
                    />
                    <Label htmlFor="usarCarrinho" className="cursor-pointer">
                      Esta operação usou carrinho.
                    </Label>
                  </div>

                  {/* Campos do Carrinho (condicionais) */}
                  {formData.usarCarrinho && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Pontos Carrinho</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ex: 99.000"
                            value={formData.pontosCarrinho}
                            onChange={(e) => handlePontosCarrinhoChange(e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Custo Carrinho</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 3.000,00"
                            value={formData.custoCarrinho}
                            onChange={(e) => handleCustoCarrinhoChange(e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cartão de Crédito e Parcelas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Cartão de Crédito</Label>
                      <Select
                        value={formData.creditCardId}
                        onValueChange={(value) => setFormData({ ...formData, creditCardId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span>Nenhum cartão</span>
                            </div>
                          </SelectItem>
                          {creditCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              <div className="flex items-center gap-2">
                                {card.issuer_bank ? (
                                  <BankLogo bank={card.issuer_bank} size="sm" />
                                ) : (
                                  <CardBrandIcon brand={getBrandFromName(card.card_name)} size="sm" />
                                )}
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
                        value={formData.parcelas}
                        onValueChange={(value) => setFormData({ ...formData, parcelas: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {parcelasOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Total de Pontos da Transferência */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Total de Pontos da Transferência</Label>
                    <Input
                      value={formatNumber(Math.floor(totalPontosTransferencia))}
                      className="bg-muted font-bold"
                      readOnly
                    />
                  </div>

                  {/* Bônus */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Bônus</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formData.bonus}
                        onChange={(e) => setFormData({ ...formData, bonus: e.target.value.replace(/\D/g, '') })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Custo Milheiro de Milhas */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Custo Milheiro de Milhas</Label>
                    <div className="relative">
                      <Input
                        value={custoMilheiroFinal > 0 ? custoMilheiroFinal.toFixed(2).replace('.', ',') : ''}
                        className="bg-muted"
                        readOnly
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    </div>
                  </div>

                  {/* Milhas e Validade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Milhas</Label>
                      <div className="relative">
                        <Input
                          value={formatNumber(Math.floor(milhas))}
                          className="bg-muted"
                          readOnly
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Validade</Label>
                      <Select
                        value={formData.validadeMilhas}
                        onValueChange={(value) => setFormData({ ...formData, validadeMilhas: value })}
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

                  {/* Milhas Bônus e Validade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Milhas Bônus</Label>
                      <div className="relative">
                        <Input
                          value={formatNumber(Math.floor(milhasBonus))}
                          className="bg-muted"
                          readOnly
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Validade</Label>
                      <Select
                        value={formData.validadeBonus}
                        onValueChange={(value) => setFormData({ ...formData, validadeBonus: value })}
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

                  {/* Total de Milhas Final e Custo Milheiro Final */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-semibold">Total Milhas Final</Label>
                      <div className="relative">
                        <Input
                          value={formatNumber(Math.floor(totalMilhasFinal))}
                          className="bg-primary/10 font-bold text-lg border-primary/30"
                          readOnly
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-semibold">Custo Milheiro Final</Label>
                      <div className="relative">
                        <Input
                          value={custoMilheiroFinal > 0 ? `R$ ${custoMilheiroFinal.toFixed(2).replace('.', ',')}` : ''}
                          className="bg-primary/10 font-bold text-lg border-primary/30"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data do Bônus */}
                  <div className="space-y-4 pt-2">
                    <Label className="text-muted-foreground">Data do Bônus</Label>
                    <RadioGroup
                      value={formData.dataBonusMode}
                      onValueChange={(value: 'dias' | 'especifica') => setFormData({ ...formData, dataBonusMode: value })}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dias" id="dias" />
                        <Label htmlFor="dias" className="flex items-center gap-2 cursor-pointer text-sm">
                          <CalendarDays className="h-4 w-4" />
                          Por dias
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="especifica" id="especifica" />
                        <Label htmlFor="especifica" className="flex items-center gap-2 cursor-pointer text-sm">
                          <Calendar className="h-4 w-4" />
                          Data específica
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formData.dataBonusMode === 'dias' ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Dias</Label>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              placeholder="45"
                              value={formData.diasBonus}
                              onChange={(e) => setFormData({ ...formData, diasBonus: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Data prevista</Label>
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
                          <Label className="text-muted-foreground text-sm">Data específica</Label>
                          <Input
                            type="date"
                            value={formData.dataBonus}
                            onChange={(e) => setFormData({ ...formData, dataBonus: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data da Operação (full width) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data da Operação</Label>
                  <Input
                    type="date"
                    value={formData.dataOperacao}
                    onChange={(e) => setFormData({ ...formData, dataOperacao: e.target.value })}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações:</Label>
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
                  disabled={createOperation.isPending || !pontosContaNumber || !formData.programaOrigem}
                >
                  {createOperation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Transferência
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
