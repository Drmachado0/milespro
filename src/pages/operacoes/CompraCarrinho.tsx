import { useState } from 'react';
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
import { ShoppingCart, Loader2, CreditCard, Check, ArrowRight } from 'lucide-react';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramLogo } from '@/components/ui/program-logo';
import { BankLogo } from '@/components/ui/bank-logo';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useOperations } from '@/hooks/useOperations';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/hooks/useLocalization';
import { ALL_PROGRAMS } from '@/data/programs';

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

export default function CompraCarrinho() {
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
    t,
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
    // Estratégia
    holderId: '',
    holderName: '',
    programaOrigem: '',
    querTransferir: '',      // Quanto quer transferir no total
    quantidadeCompra: '',    // Quantidade que vai comprar (digitado pelo usuário)
    
    // Pagamento
    valorTotal: '',          // Valor pago (R$)
    formaPagamento: 'nao_contabilizar',
    creditCardId: '',
    parcelas: '1',
    
    // Destino
    programaDestino: '',
    paridade: '1',           // Só o número da paridade (ex: 1, 1.4)
    bonusPercent: '',
    dataCompra: new Date().toISOString().split('T')[0],  // Data da compra com valor padrão hoje
    dataRecebimentoBonus: '',
    
    // Geral
    notes: '',
  });

  // Parse paridade (agora é só o número)
  const parseParidade = (paridade: string): number => {
    const num = parseFloat(paridade.replace(',', '.'));
    return isNaN(num) || num <= 0 ? 1 : num;
  };

  const querTransferirNumber = parseNumber(formData.querTransferir);
  const quantidadeCompraNumber = parseNumber(formData.quantidadeCompra);
  const valorTotalNumber = parseCurrency(formData.valorTotal);
  const paridadeNumber = parseParidade(formData.paridade);
  const bonusPercentNumber = parseFloat(formData.bonusPercent) || 0;

  // ============= CÁLCULOS AUTOMÁTICOS =============
  
  // Milheiro da compra na origem (baseado no input do usuário)
  const milheiroOrigem = quantidadeCompraNumber > 0 
    ? valorTotalNumber / (quantidadeCompraNumber / 1000) 
    : 0;
  
  // Quantidade no destino após paridade
  const quantidadeDestino = querTransferirNumber * paridadeNumber;
  
  // Quantidade bônus
  const quantidadeBonus = quantidadeDestino * (bonusPercentNumber / 100);
  
  // Total final de milhas
  const totalFinal = quantidadeDestino + quantidadeBonus;
  
  // Custo total = valor pago no carrinho (já que os pontos da conta não têm custo adicional)
  const custoTotal = valorTotalNumber;
  
  // Milheiro final (considerando bônus e paridade)
  const milheiroFinal = totalFinal > 0 && valorTotalNumber > 0
    ? valorTotalNumber / (totalFinal / 1000)
    : 0;

  // Programs for selection
  const allPrograms = ALL_PROGRAMS;
  const programsWithBalance = programBalances.filter(b => b.balance > 0);

  const handleQuerTransferirChange = (value: string) => {
    setFormData({ ...formData, querTransferir: formatNumberInput(value) });
  };

  const handleQuantidadeCompraChange = (value: string) => {
    setFormData({ ...formData, quantidadeCompra: formatNumberInput(value) });
  };

  const handleValorTotalChange = (value: string) => {
    setFormData({ ...formData, valorTotal: formatCurrencyInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderId, holderName: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!querTransferirNumber || !quantidadeCompraNumber || !formData.programaOrigem || !formData.programaDestino || !valorTotalNumber) {
      return;
    }

    const notesBuilder = [
      `Compra do Carrinho`,
      `Origem: ${formData.programaOrigem} → Destino: ${formData.programaDestino}`,
      `Quer transferir: ${formatNumber(querTransferirNumber)} pts`,
      `Compra no carrinho: ${formatNumber(quantidadeCompraNumber)} pts por ${formatCurrency(valorTotalNumber)}`,
      `Milheiro origem: ${formatCurrency(milheiroOrigem)}`,
    ];

    if (paridadeNumber !== 1) {
      notesBuilder.push(`Paridade: 1:${formData.paridade}`);
    }

    if (bonusPercentNumber > 0) {
      notesBuilder.push(`Bônus: ${bonusPercentNumber}% (+${formatNumber(Math.floor(quantidadeBonus))} milhas)`);
    }

    notesBuilder.push(`Total final: ${formatNumber(Math.floor(totalFinal))} milhas`);
    notesBuilder.push(`Custo final: ${formatCurrency(milheiroFinal)}/milheiro`);

    if (formData.notes) {
      notesBuilder.push(`Obs: ${formData.notes}`);
    }

    await createOperation.mutateAsync({
      type: 'compra',
      program: formData.programaDestino,
      quantity: Math.floor(totalFinal),
      total_cost: custoTotal || 0,
      cost_per_thousand: milheiroFinal,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      bonus: bonusPercentNumber,
      date: formData.dataCompra,
      credit_card: formData.creditCardId && formData.creditCardId !== 'none' ? formData.creditCardId : undefined,
      installments: parseInt(formData.parcelas),
      notes: notesBuilder.join('. '),
      status: 'confirmado',
    });

    navigate('/dashboard');
  };

  // Validation check
  const isFormValid = querTransferirNumber > 0 && 
    quantidadeCompraNumber > 0 &&
    formData.programaOrigem && 
    formData.programaDestino && 
    valorTotalNumber > 0 &&
    formData.dataCompra;

  return (
    <DashboardLayout title={t('operations.cartPurchase')}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<ShoppingCart className="h-5 w-5" />}
          title={t('operations.cartPurchase')}
          subtitle="Estratégia de compra múltipla com múltiplos programas"
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ============= SEÇÃO 1: ESTRATÉGIA ============= */}
          <Card className="overflow-hidden">
            <div className="rounded-t-lg bg-primary px-4 py-2">
              <span className="font-semibold text-white">Estratégia</span>
            </div>
            <CardContent className="pt-6 space-y-4">
              {/* Titular */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Titular/Conta</Label>
                <HolderSelect
                  value={formData.holderId}
                  onValueChange={handleHolderChange}
                />
              </div>

              {/* Programa Origem e Quer Transferir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Programa Origem *</Label>
                  <Select 
                    value={formData.programaOrigem} 
                    onValueChange={(value) => setFormData({ ...formData, programaOrigem: value })}
                  >
                    <SelectTrigger>
                      {formData.programaOrigem ? (
                        <div className="flex items-center gap-2">
                          <ProgramLogo program={formData.programaOrigem} size="sm" />
                          <span>{formData.programaOrigem}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecione o programa" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {programsWithBalance.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Com saldo</div>
                          {programsWithBalance.map((balance, idx) => (
                            <SelectItem key={`balance-${balance.program}-${idx}`} value={balance.program}>
                              <div className="flex items-center gap-2">
                                <ProgramLogo program={balance.program} size="sm" />
                                <span>{balance.program}</span>
                                <span className="text-muted-foreground">
                                  ({formatNumber(balance.balance)})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium mt-2">Todos os programas</div>
                        </>
                      )}
                      {allPrograms.map((program) => (
                        <SelectItem key={program.name} value={program.name}>
                          <div className="flex items-center gap-2">
                            <ProgramLogo program={program.name} size="sm" />
                            <span>{program.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Quer transferir *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 300.000"
                      value={formData.querTransferir}
                      onChange={(e) => handleQuerTransferirChange(e.target.value)}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">pts</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Vai comprar *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 297.000"
                      value={formData.quantidadeCompra}
                      onChange={(e) => handleQuantidadeCompraChange(e.target.value)}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">pts</span>
                  </div>
                </div>
              </div>

              {/* Card Resumo Estratégia */}
              {querTransferirNumber > 0 && quantidadeCompraNumber > 0 && formData.programaOrigem && (
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span>Quer transferir: <strong className="font-mono tabular-nums">{formatNumber(querTransferirNumber)} pts</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span>Vai comprar: <strong className="text-primary font-mono tabular-nums">{formatNumber(quantidadeCompraNumber)} pts</strong></span>
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============= SEÇÃO 2: PAGAMENTO ============= */}
          <Card className="overflow-hidden">
            <div className="rounded-t-lg bg-primary px-4 py-2">
              <span className="font-semibold text-white">
                {formData.programaOrigem || 'Programa'} está cobrando
              </span>
            </div>
            <CardContent className="pt-6 space-y-4">
              {/* Valor Total e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valor Total *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 8.500,00"
                      value={formData.valorTotal}
                      onChange={(e) => handleValorTotalChange(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Forma de Pagamento</Label>
                  <Select
                    value={formData.formaPagamento}
                    onValueChange={(value) => setFormData({ ...formData, formaPagamento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_contabilizar">Não contabilizar no fluxo de caixa</SelectItem>
                      <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cartão e Parcelas */}
              {formData.formaPagamento === 'cartao' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Cartão de Crédito</Label>
                    <Select
                      value={formData.creditCardId}
                      onValueChange={(value) => setFormData({ ...formData, creditCardId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cartão" />
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
              )}

              {/* Card Cálculo Milheiro */}
              {valorTotalNumber > 0 && quantidadeCompraNumber > 0 && (
                <div className="bg-warning/10 rounded-lg p-4 border border-warning/30">
                  <h4 className="font-bold text-warning mb-2">
                    Calculando o milheiro:
                  </h4>
                  <p className="text-sm text-foreground/80">
                    • <span className="font-mono tabular-nums">{formatCurrency(valorTotalNumber)}</span> para <span className="font-mono tabular-nums">{formatNumber(quantidadeCompraNumber)}</span> pts
                  </p>
                  <p className="text-sm mt-2 font-semibold text-foreground/80">
                    • <span className="font-mono tabular-nums">{formatCurrency(valorTotalNumber)} / {(quantidadeCompraNumber / 1000).toFixed(0)}</span> = <strong className="text-warning font-mono tabular-nums">{formatCurrency(milheiroOrigem)}/milheiro</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============= SEÇÃO 3: DESTINO ============= */}
          <Card className="overflow-hidden">
            <div className="rounded-t-lg bg-info px-4 py-2">
              <span className="font-semibold text-white">Transferindo para</span>
            </div>
            <CardContent className="pt-6 space-y-4">
              {/* Programa Destino e Paridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Programa Destino *</Label>
                  <Select 
                    value={formData.programaDestino} 
                    onValueChange={(value) => setFormData({ ...formData, programaDestino: value })}
                  >
                    <SelectTrigger>
                      {formData.programaDestino ? (
                        <div className="flex items-center gap-2">
                          <ProgramLogo program={formData.programaDestino} size="sm" />
                          <span>{formData.programaDestino}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecione o programa" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {allPrograms.map((program) => (
                        <SelectItem key={program.name} value={program.name}>
                          <div className="flex items-center gap-2">
                            <ProgramLogo program={program.name} size="sm" />
                            <span>{program.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Paridade (1:X)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">1:</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="1"
                      value={formData.paridade}
                      onChange={(e) => setFormData({ ...formData, paridade: e.target.value })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Bônus e Data Recebimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Bônus</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 35"
                      value={formData.bonusPercent}
                      onChange={(e) => setFormData({ ...formData, bonusPercent: e.target.value.replace(/\D/g, '') })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data da Compra *</Label>
                  <Input
                    type="date"
                    value={formData.dataCompra}
                    onChange={(e) => setFormData({ ...formData, dataCompra: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Data Recebimento Bônus (condicional) */}
              {bonusPercentNumber > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Data Recebimento Bônus</Label>
                    <Input
                      type="date"
                      value={formData.dataRecebimentoBonus}
                      onChange={(e) => setFormData({ ...formData, dataRecebimentoBonus: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Card Resultado Final */}
              {formData.programaDestino && valorTotalNumber > 0 && querTransferirNumber > 0 && (
                <div className="bg-info/10 rounded-lg p-4 border border-info/30">
                  <h4 className="font-bold text-info mb-2">
                    Transferindo para {formData.programaDestino}{bonusPercentNumber > 0 ? ` ${bonusPercentNumber}%` : ''}:
                  </h4>

                  {bonusPercentNumber > 0 && milheiroOrigem > 0 && (
                    <p className="text-sm text-foreground/80">
                      • <span className="font-mono tabular-nums">{formatCurrency(milheiroOrigem)} / {(1 + bonusPercentNumber / 100).toFixed(2)}</span> = <strong className="text-info font-mono tabular-nums">{formatCurrency(milheiroFinal)}/milheiro</strong>
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-info/20 space-y-1">
                    <p className="text-sm flex items-center gap-2 text-foreground/80">
                      <Check className="h-4 w-4 text-success" />
                      Total final: <strong className="text-success font-mono tabular-nums">{formatNumber(Math.floor(totalFinal))} milhas</strong>
                    </p>
                    <p className="text-sm flex items-center gap-2 text-foreground/80">
                      <Check className="h-4 w-4 text-success" />
                      Custo final: <strong className="text-success font-mono tabular-nums">{formatCurrency(milheiroFinal)}/milheiro</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Observação */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observação</Label>
                <Textarea
                  placeholder="Adicione observações..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <div className="flex gap-3 self-end">
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
                Salvar Operação
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
