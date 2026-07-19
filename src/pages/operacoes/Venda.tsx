import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Ticket, AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ValidatedSubmitButton } from '@/components/forms/ValidatedSubmitButton';
import { useOperations } from '@/hooks/useOperations';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useLocalization } from '@/hooks/useLocalization';
import { useFormValidation } from '@/hooks/useFormValidation';
import { cn } from '@/lib/utils';

const intermediarioOptions = [
  { value: 'hotmilhas', label: 'Hotmilhas' },
  { value: 'maxmilhas', label: 'MaxMilhas' },
  { value: '123milhas', label: '123 Milhas' },
  { value: 'bancomilhas', label: 'Banco de Milhas' },
  { value: 'outro', label: 'Outro' },
];

const FIELD_LABELS: Record<string, string> = {
  program: 'Programa',
  quantity: 'Quantidade',
};

export default function Venda() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { balances: programBalances } = useProgramBalances();
  const { 
    formatNumber, 
    formatNumberInput, 
    formatCurrencyInput, 
    parseNumber, 
    parseCurrency,
    formatReadOnlyValue,
    getCurrencySymbol,
  } = useLocalization();
  
  const [formData, setFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    intermediario: '',
    quantity: '',
    valorTotalVenda: '',
    dataVenda: new Date().toISOString().split('T')[0],
    recebimentoEm: '',
    notes: '',
  });

  const quantityNumber = parseNumber(formData.quantity);
  const valorVendaNumber = parseCurrency(formData.valorTotalVenda);

  // Get balance and cost for selected program
  const selectedBalance = programBalances.find(b => b.program === formData.program);
  const saldoDisponivel = selectedBalance?.balance || 0;
  const custoMedio = selectedBalance?.averageCost || 0;

  // Calculations
  const precoMilheiro = quantityNumber && valorVendaNumber
    ? valorVendaNumber / (quantityNumber / 1000)
    : 0;
  
  const custoTotal = quantityNumber ? (quantityNumber / 1000) * custoMedio : 0;
  const lucroOperacao = valorVendaNumber - custoTotal;

  // Validation: check if quantity exceeds available balance
  const excedeSaldo = quantityNumber > saldoDisponivel && saldoDisponivel > 0;
  const saldoInsuficiente = formData.program && saldoDisponivel === 0;

  // Form validation
  const validationData = useMemo(() => ({
    program: formData.program,
    quantity: quantityNumber,
  }), [formData.program, quantityNumber]);

  const {
    fieldValidations,
    isFormValid: baseFormValid,
    markFieldTouched,
    registerFieldRef,
    getInvalidFieldsLabels,
    handleDisabledClick,
  } = useFormValidation(validationData, {
    program: { required: true, requiredMessage: 'Selecione um programa' },
    quantity: { required: true, requiredMessage: 'Informe a quantidade de milhas', minValue: 1, minValueMessage: 'A quantidade deve ser maior que zero' },
  });

  // Additional validation for balance
  const isFormValid = baseFormValid && !excedeSaldo && !saldoInsuficiente;

  // Refs for scrolling to errors
  const programRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerFieldRef('program', programRef.current);
    registerFieldRef('quantity', quantityRef.current);
  }, [registerFieldRef]);

  const handleQuantityChange = (value: string) => {
    setFormData({ ...formData, quantity: formatNumberInput(value) });
  };

  const handleValorVendaChange = (value: string) => {
    setFormData({ ...formData, valorTotalVenda: formatCurrencyInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderId, holderName: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      handleDisabledClick();
      return;
    }

    await createOperation.mutateAsync({
      type: 'venda',
      program: formData.program,
      quantity: quantityNumber,
      total_cost: valorVendaNumber,
      cost_per_thousand: precoMilheiro,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      date: formData.dataVenda,
      validity: formData.recebimentoEm || undefined,
      notes: formData.intermediario 
        ? `Intermediário: ${intermediarioOptions.find(i => i.value === formData.intermediario)?.label || formData.intermediario}. ${formData.notes || ''}`
        : formData.notes || undefined,
      status: 'confirmado',
    });

    navigate('/agencia');
  };

  const programValidation = fieldValidations.program;
  const quantityValidation = fieldValidations.quantity;

  return (
    <DashboardLayout title="Venda de Milhas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<Ticket className="h-5 w-5" />}
          title="Vender Milhas"
          subtitle="Registrar venda do seu saldo e converter em receita"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Titular, Custo Médio, Saldo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta da Operação</Label>
                  <HolderSelect
                    value={formData.holderId}
                    onValueChange={handleHolderChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Médio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                    <Input
                      value={formatReadOnlyValue(custoMedio)}
                      className="bg-muted pl-10"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Saldo Disponível</Label>
                  <Input
                    value={formatNumber(saldoDisponivel)}
                    className="bg-muted"
                    readOnly
                  />
                </div>
              </div>

              {/* Linha 2 - Programa */}
              <div className="space-y-2" ref={programRef}>
                <Label className="text-muted-foreground">Programa *</Label>
                <div className="relative">
                  <div
                    className={cn(
                      'rounded-md transition-all',
                      programValidation?.isTouched && !programValidation?.isValid && '[&>button]:border-destructive',
                      programValidation?.isTouched && programValidation?.isValid && '[&>button]:border-success'
                    )}
                  >
                    <ProgramSelect
                      value={formData.program}
                      onValueChange={(value) => {
                        setFormData({ ...formData, program: value });
                        markFieldTouched('program');
                      }}
                    />
                  </div>
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                    {programValidation?.isTouched && !programValidation?.isValid && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {programValidation?.isTouched && programValidation?.isValid && (
                      <Check className="h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
                {programValidation?.isTouched && programValidation?.error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {programValidation.error}
                  </p>
                )}
              </div>

              {/* Linha 3 - Intermediário */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Intermediário</Label>
                <Select
                  value={formData.intermediario}
                  onValueChange={(value) => setFormData({ ...formData, intermediario: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o intermediário" />
                  </SelectTrigger>
                  <SelectContent>
                    {intermediarioOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alert for balance issues */}
              {saldoInsuficiente && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Você não possui saldo disponível no programa {formData.program}. Registre operações de compra antes de vender.
                  </AlertDescription>
                </Alert>
              )}

              {excedeSaldo && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A quantidade informada ({formatNumber(quantityNumber)}) excede o saldo disponível ({formatNumber(saldoDisponivel)}). Ajuste a quantidade para continuar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Linha 4 - Quantidade, Valor Total, Preço Milheiro, Lucro */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2" ref={quantityRef}>
                  <Label className="text-muted-foreground">Quantidade *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 30.000"
                      value={formData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      onBlur={() => markFieldTouched('quantity')}
                      className={cn(
                        excedeSaldo && 'border-destructive',
                        quantityValidation?.isTouched && !quantityValidation?.isValid && 'border-destructive focus-visible:ring-destructive pr-10',
                        quantityValidation?.isTouched && quantityValidation?.isValid && !excedeSaldo && 'border-success focus-visible:ring-success pr-10'
                      )}
                    />
                    {(quantityValidation?.isTouched && !quantityValidation?.isValid) || excedeSaldo ? (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                    ) : quantityValidation?.isTouched && quantityValidation?.isValid ? (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                    ) : null}
                  </div>
                  {quantityValidation?.isTouched && quantityValidation?.error && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {quantityValidation.error}
                    </p>
                  )}
                  {formData.program && saldoDisponivel > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Máximo disponível: <span className="font-semibold text-primary">{formatNumber(saldoDisponivel)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valor Total da Venda</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.valorTotalVenda}
                      onChange={(e) => handleValorVendaChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Preço por milheiro</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                    <Input
                      value={formatReadOnlyValue(precoMilheiro)}
                      className="bg-muted pl-10"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Lucro da Operação</Label>
                  <div className="relative">
                    {custoMedio > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                    )}
                    <Input
                      value={custoMedio > 0 ? formatReadOnlyValue(lucroOperacao) : '-'}
                      className={cn(
                        'font-mono tabular-nums',
                        custoMedio > 0
                          ? cn('pl-10', lucroOperacao >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')
                          : 'bg-muted text-muted-foreground'
                      )}
                      readOnly
                    />
                  </div>
                  {formData.program && quantityNumber > 0 && custoMedio === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sem custo médio: registre compras desse programa para calcular o lucro real
                    </p>
                  )}
                </div>
              </div>

              {/* Linha 5 - Data Venda e Recebimento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data da Venda</Label>
                  <Input
                    type="date"
                    value={formData.dataVenda}
                    onChange={(e) => setFormData({ ...formData, dataVenda: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Recebimento em</Label>
                  <Input
                    type="date"
                    value={formData.recebimentoEm}
                    onChange={(e) => setFormData({ ...formData, recebimentoEm: e.target.value })}
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
                  rows={4}
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
                <ValidatedSubmitButton
                  isFormValid={isFormValid}
                  isLoading={createOperation.isPending}
                  invalidFieldsLabels={getInvalidFieldsLabels(FIELD_LABELS)}
                  onDisabledClick={handleDisabledClick}
                  validLabel="REGISTRAR VENDA"
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
