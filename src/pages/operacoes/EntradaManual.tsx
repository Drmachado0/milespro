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
import { Edit, AlertCircle, Check } from 'lucide-react';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ValidatedSubmitButton } from '@/components/forms/ValidatedSubmitButton';
import { useOperations } from '@/hooks/useOperations';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useLocalization } from '@/hooks/useLocalization';
import { useFormValidation } from '@/hooks/useFormValidation';
import { validadeOptions, calculateValidityDate } from '@/data/validadeOptions';
import { cn } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
  program: 'Programa',
  quantity: 'Quantidade',
};

export default function EntradaManual() {
  const navigate = useNavigate();
  const { createOperation } = useOperations();
  const { balances: programBalances } = useProgramBalances();
  const { 
    formatNumber, 
    formatNumberInput, 
    formatCurrencyInput, 
    parseNumber, 
    parseCurrency,
  } = useLocalization();
  
  const [formData, setFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    quantity: '',
    totalCost: '',
    validadeMonths: 'none',
    operationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const quantityNumber = parseNumber(formData.quantity);
  const totalCostNumber = parseCurrency(formData.totalCost);
  
  const costPerThousand = quantityNumber && totalCostNumber
    ? totalCostNumber / (quantityNumber / 1000)
    : 0;

  // Form validation
  const validationData = useMemo(() => ({
    program: formData.program,
    quantity: quantityNumber,
  }), [formData.program, quantityNumber]);

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

  // Get balance for selected program
  const selectedBalance = programBalances.find(b => b.program === formData.program);
  const saldoDisponivel = selectedBalance?.balance || 0;

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

  const handleTotalCostChange = (value: string) => {
    setFormData({ ...formData, totalCost: formatCurrencyInput(value) });
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
      type: 'entrada_manual',
      program: formData.program,
      quantity: quantityNumber,
      total_cost: totalCostNumber || 0,
      cost_per_thousand: costPerThousand,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      validity: calculateValidityDate(formData.validadeMonths) || undefined,
      date: formData.operationDate,
      notes: formData.notes || undefined,
      status: 'confirmado',
    });

    navigate('/dashboard');
  };

  const programValidation = fieldValidations.program;
  const quantityValidation = fieldValidations.quantity;

  return (
    <DashboardLayout title="Entrada Manual">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<Edit className="h-5 w-5" />}
          title="Entrada Manual"
          subtitle="Adicionar milhas/pontos sem custo associado (bônus, transferências externas)"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Titular e Saldo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta da Operação</Label>
                  <HolderSelect
                    value={formData.holderId}
                    onValueChange={handleHolderChange}
                  />
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
              <div className="space-y-2" data-tour="select-program" ref={programRef}>
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

              {/* Linha 3 - Quantidade, Custo Total, Preço do Milheiro */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2" data-tour="input-quantity" ref={quantityRef}>
                  <Label className="text-muted-foreground">Quantidade *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 50.000"
                      value={formData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      onBlur={() => markFieldTouched('quantity')}
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
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.totalCost}
                      onChange={(e) => handleTotalCostChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Preço do Milheiro</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      value={costPerThousand > 0 ? costPerThousand.toFixed(2).replace('.', ',') : ''}
                      className="bg-muted pl-10"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Linha 4 - Data Operação e Validade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data Operação</Label>
                  <Input
                    type="date"
                    value={formData.operationDate}
                    onChange={(e) => setFormData({ ...formData, operationDate: e.target.value })}
                  />
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
                  validLabel="REGISTRAR ENTRADA"
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
