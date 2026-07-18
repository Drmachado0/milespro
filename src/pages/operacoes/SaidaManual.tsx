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
import { ArrowUpRight, Paperclip, AlertCircle, Check } from 'lucide-react';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ValidatedSubmitButton } from '@/components/forms/ValidatedSubmitButton';
import { useOperations } from '@/hooks/useOperations';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useLocalization } from '@/hooks/useLocalization';
import { useFormValidation } from '@/hooks/useFormValidation';
import { cn } from '@/lib/utils';

const origemMilhasOptions = [
  { value: 'milhas_proprias', label: 'Milhas Próprias' },
  { value: 'milhas_terceiros', label: 'Milhas de Terceiros' },
];

const motivoSaidaOptions = [
  { value: 'venda', label: 'Venda' },
  { value: 'emissao', label: 'Emissão de Passagem' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'expiracao', label: 'Expiração' },
  { value: 'outros', label: 'Outros' },
];

const FIELD_LABELS: Record<string, string> = {
  program: 'Programa',
  quantity: 'Quantidade',
};

export default function SaidaManual() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { balances: programBalances } = useProgramBalances();
  const { formatNumber, formatCurrency, formatNumberInput, formatCurrencyInput, parseNumber, parseCurrency } = useLocalization();
  
  const [formData, setFormData] = useState({
    origemMilhas: 'milhas_proprias',
    holderId: '',
    holderName: '',
    program: '',
    motivoSaida: '',
    dataOperacao: new Date().toISOString().split('T')[0],
    precoPagante: '',
    extras: '',
    quantidade: '',
    observacoes: '',
    arquivo: null as File | null,
  });

  const quantidadeNumber = parseNumber(formData.quantidade);
  const precoPaganteNumber = parseCurrency(formData.precoPagante);
  const extrasNumber = parseCurrency(formData.extras);

  // Form validation
  const validationData = useMemo(() => ({
    program: formData.program,
    quantity: quantidadeNumber,
  }), [formData.program, quantidadeNumber]);

  const {
    fieldValidations,
    isFormValid,
    markFieldTouched,
    registerFieldRef,
    getInvalidFieldsLabels,
    handleDisabledClick,
  } = useFormValidation(validationData, {
    program: { required: true, requiredMessage: 'Selecione um programa' },
    quantity: { required: true, requiredMessage: 'Informe a quantidade de milhas', minValue: 1, minValueMessage: 'A quantidade deve ser maior que zero' },
  });

  // Get balance and cost for selected program
  const selectedBalance = programBalances.find(b => b.program === formData.program);
  const saldoDisponivel = selectedBalance?.balance || 0;
  const custoMedio = selectedBalance?.averageCost || 0;

  // Calculate values
  const custoTotal = quantidadeNumber ? (quantidadeNumber / 1000) * custoMedio : 0;
  const economiaGerada = precoPaganteNumber && quantidadeNumber 
    ? precoPaganteNumber - custoTotal - extrasNumber 
    : 0;
  const economiaPercentual = precoPaganteNumber && custoTotal 
    ? ((economiaGerada / precoPaganteNumber) * 100).toFixed(1) 
    : '0';

  // Refs for scrolling to errors
  const programRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerFieldRef('program', programRef.current);
    registerFieldRef('quantity', quantityRef.current);
  }, [registerFieldRef]);

  const handleQuantidadeChange = (value: string) => {
    setFormData({ ...formData, quantidade: formatNumberInput(value) });
  };

  const handlePrecoPaganteChange = (value: string) => {
    setFormData({ ...formData, precoPagante: formatCurrencyInput(value) });
  };

  const handleExtrasChange = (value: string) => {
    setFormData({ ...formData, extras: formatCurrencyInput(value) });
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

    const motivoLabel = motivoSaidaOptions.find(o => o.value === formData.motivoSaida)?.label || '';
    const origemLabel = origemMilhasOptions.find(o => o.value === formData.origemMilhas)?.label || '';

    await createOperation.mutateAsync({
      type: 'resgate',
      program: formData.program,
      quantity: quantidadeNumber,
      total_cost: custoTotal,
      cost_per_thousand: custoMedio,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      date: formData.dataOperacao,
      notes: `Origem: ${origemLabel}. Motivo: ${motivoLabel}. Preço pagante: ${formatCurrency(precoPaganteNumber)}. Economia: ${formatCurrency(economiaGerada)} (${economiaPercentual}%). ${formData.observacoes || ''}`,
      status: 'confirmado',
    });

    navigate('/dashboard');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, arquivo: e.target.files[0] });
    }
  };

  const programValidation = fieldValidations.program;
  const quantityValidation = fieldValidations.quantity;

  return (
    <DashboardLayout title="Saída Manual">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<ArrowUpRight className="h-5 w-5" />}
          title="Saída Manual"
          subtitle="Baixar milhas/pontos fora de uma operação padrão"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Origem das Milhas */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Origem das Milhas:</Label>
                <Select
                  value={formData.origemMilhas}
                  onValueChange={(value) => setFormData({ ...formData, origemMilhas: value })}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {origemMilhasOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linha 2 - Titular, Custo Médio, Saldo */}
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={custoMedio.toFixed(2).replace('.', ',')}
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

              {/* Linha 3 - Programa */}
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

              {/* Linha 4 - Motivo e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Motivo da Saída</Label>
                  <Select
                    value={formData.motivoSaida}
                    onValueChange={(value) => setFormData({ ...formData, motivoSaida: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {motivoSaidaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data Operação</Label>
                  <Input
                    type="date"
                    value={formData.dataOperacao}
                    onChange={(e) =>
                      setFormData({ ...formData, dataOperacao: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Linha 5 - Preço, Print, Extras, Quantidade */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Preço Pagante</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.precoPagante}
                      onChange={(e) => handlePrecoPaganteChange(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground sr-only">Anexar Print</Label>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      PRINT
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {formData.arquivo ? formData.arquivo.name : 'Nenhum arquivo selecionado.'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Extras</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.extras}
                      onChange={(e) => handleExtrasChange(e.target.value)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2" ref={quantityRef}>
                  <Label className="text-muted-foreground">Quantidade *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.quantidade}
                      onChange={(e) => handleQuantidadeChange(e.target.value)}
                      onBlur={() => markFieldTouched('quantity')}
                      placeholder="Ex: 50.000"
                      className={cn(
                        quantityValidation?.isTouched && !quantityValidation?.isValid && 'border-destructive focus-visible:ring-destructive pr-10',
                        quantityValidation?.isTouched && quantityValidation?.isValid && 'border-success focus-visible:ring-success pr-10'
                      )}
                    />
                    {quantityValidation?.isTouched && !quantityValidation?.isValid && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                    )}
                    {quantityValidation?.isTouched && quantityValidation?.isValid && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                    )}
                  </div>
                  {quantityValidation?.isTouched && quantityValidation?.error && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {quantityValidation.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Linha 6 - Custo Total, Economia Gerada, Economia % */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={formatCurrency(custoTotal).replace(/^R\$\s+/, '')}
                      className="bg-muted pl-10"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Economia Gerada</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={formatCurrency(economiaGerada).replace(/^R\$\s+/, '')}
                      className={cn(
                        'pl-10 font-mono tabular-nums',
                        economiaGerada >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      )}
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Economia em %</Label>
                  <div className="relative">
                    <Input
                      value={economiaPercentual}
                      className={cn(
                        'pr-8 font-mono tabular-nums',
                        parseFloat(economiaPercentual) >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      )}
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações:</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={4}
                  placeholder="Adicione observações sobre a saída..."
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
                  validLabel="REGISTRAR SAÍDA"
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
