import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { ProgramLogo } from '@/components/ui/program-logo';
import {
  Send, Loader2, ClipboardList, Search, X, Plane, Plus,
  ChevronLeft, ChevronRight, Download, FileSpreadsheet,
  Pencil, Trash2, AlertCircle
} from 'lucide-react';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { useOperations, useInfiniteOperations, type InfiniteOperationsFilters } from '@/hooks/useOperations';
import { useCpfLimits } from '@/hooks/useCpfLimits';
import { useLocalization } from '@/hooks/useLocalization';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Operation = Database['public']['Tables']['operations']['Row'];

// Helper to parse structured notes.
// Format gravado em handleSubmit: `Passageiro: X. Localizador: Y. CPFs utilizados: N. obs`.
// O parser antigo usava `[^.]+`, que corta no primeiro ponto e quebra nomes como
// "Juliano S. Machado" (vira "Juliano S"). Agora o lookahead para no padrão
// completo ". <Label>:" ou no fim da string, então o ponto interno do nome passa.
const parsePassagemNotes = (notes: string | null) => {
  if (!notes) return { passageiro: 'N/A', localizador: 'N/A', cpfs: 1, obs: '' };

  const passageiroMatch = notes.match(/Passageiro:\s*(.*?)(?=\.\s+(?:Localizador|CPFs utilizados):|$)/);
  const localizadorMatch = notes.match(/Localizador:\s*(.*?)(?=\.\s+CPFs utilizados:|$)/);
  const cpfsMatch = notes.match(/CPFs utilizados:\s*(\d+)/);
  const obsMatch = notes.match(/CPFs utilizados:\s*\d+\.\s*(.*)/);

  return {
    passageiro: passageiroMatch?.[1]?.trim() || 'N/A',
    localizador: localizadorMatch?.[1]?.trim() || 'N/A',
    cpfs: parseInt(cpfsMatch?.[1] || '1'),
    obs: obsMatch?.[1]?.trim() || '',
  };
};

// Helper to find matching program with case-insensitive comparison
const findMatchingProgram = (selectedProgram: string, limitsPrograms: string[]): string | null => {
  if (limitsPrograms.includes(selectedProgram)) {
    return selectedProgram;
  }
  const normalizedSelected = selectedProgram.toLowerCase().replace(/\s+/g, '');
  const match = limitsPrograms.find(p => 
    p.toLowerCase().replace(/\s+/g, '') === normalizedSelected
  );
  return match || null;
};

export default function PassagemEmitida() {
  const navigate = useNavigate();
  const { createOperation, updateOperation, deleteOperation } = useOperations();
  const { addCpfUsage, programsWithLimits, cpfUsage, deleteCpfUsage, getCpfUsage } = useCpfLimits();
  const { formatNumberInput, parseNumber, formatNumber, formatDate } = useLocalization();
  
  // Form state
  const [formData, setFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    nomePassageiro: '',
    milhasUtilizadas: '',
    localizador: '',
    cpfsUtilizados: 1,
    dataEmissao: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  // Track if passenger name was manually edited
  const [isPassageiroManuallyEdited, setIsPassageiroManuallyEdited] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  // Server-side filters — always restricted to `resgate` (passagem emitida).
  const infiniteFilters: InfiniteOperationsFilters = useMemo(() => ({
    types: ['resgate'],
    programs: programFilter !== 'all' ? [programFilter] : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearchTerm.trim() || undefined,
  }), [programFilter, dateFrom, dateTo, debouncedSearchTerm]);

  const {
    data: infiniteData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOperations(infiniteFilters);

  const operations = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.rows) ?? [],
    [infiniteData],
  );
  const totalCount =
    infiniteData?.pages[infiniteData.pages.length - 1]?.totalCount ?? operations.length;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, operations.length]);

  // Edit/Delete state
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deleteOperationId, setDeleteOperationId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    nomePassageiro: '',
    milhasUtilizadas: '',
    localizador: '',
    cpfsUtilizados: 1,
    dataEmissao: '',
    observacoes: '',
  });

  const handleMilhasChange = (value: string) => {
    setFormData({ ...formData, milhasUtilizadas: formatNumberInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    // Pré-preencher o nome do passageiro com o nome do titular se não foi editado manualmente
    const newNomePassageiro = !isPassageiroManuallyEdited && holderName ? holderName : formData.nomePassageiro;
    setFormData({ 
      ...formData,
      holderId, 
      holderName: holderName || '',
      nomePassageiro: newNomePassageiro,
    });
    // Resetar o flag se o titular foi alterado
    setIsPassageiroManuallyEdited(false);
  };

  const handlePassageiroChange = (value: string) => {
    // Marcar como editado manualmente quando o usuário alterar o campo
    setIsPassageiroManuallyEdited(value !== formData.holderName);
    setFormData({ ...formData, nomePassageiro: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const milhas = parseNumber(formData.milhasUtilizadas);
    
    if (!formData.program || !milhas) {
      return;
    }

    const result = await createOperation.mutateAsync({
      type: 'resgate',
      program: formData.program,
      quantity: milhas,
      total_cost: 0,
      cost_per_thousand: 0,
      holder_id: formData.holderId || undefined,
      holder_name: formData.holderName || undefined,
      date: formData.dataEmissao,
      notes: `Passageiro: ${formData.nomePassageiro || 'N/A'}. Localizador: ${formData.localizador || 'N/A'}. CPFs utilizados: ${formData.cpfsUtilizados || 1}. ${formData.observacoes || ''}`,
      status: 'confirmado',
    });

    // Register CPF usage if holder and program have CPF limits
    if (result && formData.holderId && formData.program) {
      const matchingProgram = findMatchingProgram(formData.program, programsWithLimits);
      if (matchingProgram) {
        try {
          await addCpfUsage.mutateAsync({
            holderId: formData.holderId,
            operationId: result.id,
            programName: matchingProgram,
            cpfCount: formData.cpfsUtilizados || 1,
            emissionDate: formData.dataEmissao,
            passengerName: formData.nomePassageiro || undefined,
            locator: formData.localizador || undefined,
          });
        } catch (error) {
          logger.error('Failed to register CPF usage:', error);
        }
      }
    }

    // Reset form
    setFormData({
      holderId: '',
      holderName: '',
      program: '',
      nomePassageiro: '',
      milhasUtilizadas: '',
      localizador: '',
      cpfsUtilizados: 1,
      dataEmissao: new Date().toISOString().split('T')[0],
      observacoes: '',
    });
    setIsPassageiroManuallyEdited(false);
  };

  // Rows already come from the server filtered + ordered by date DESC. Name
  // kept for JSX compatibility.
  const passagensEmitidas = operations;

  // Unique program list (derived from loaded rows). This is a filter affordance,
  // not authoritative — the server still accepts any program string.
  const uniquePrograms = useMemo(() => {
    const programs = operations.map((op) => op.program);
    return [...new Set(programs)].sort();
  }, [operations]);

  // CPF status for the current form selection
  const currentCpfStatus = useMemo(() => {
    if (!formData.holderId || !formData.program) return null;
    const matchingProgram = findMatchingProgram(formData.program, programsWithLimits);
    if (!matchingProgram) return null;
    return getCpfUsage(formData.holderId, matchingProgram);
  }, [formData.holderId, formData.program, programsWithLimits, getCpfUsage]);

  const hasActiveFilters = searchTerm || programFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setProgramFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Open edit dialog
  const handleEdit = (operation: Operation) => {
    const { passageiro, localizador, cpfs, obs } = parsePassagemNotes(operation.notes);
    setEditFormData({
      holderId: operation.holder_id || '',
      holderName: operation.holder_name || '',
      program: operation.program,
      nomePassageiro: passageiro !== 'N/A' ? passageiro : '',
      milhasUtilizadas: formatNumber(operation.quantity),
      localizador: localizador !== 'N/A' ? localizador : '',
      cpfsUtilizados: cpfs,
      dataEmissao: operation.date,
      observacoes: obs,
    });
    setEditingOperation(operation);
  };

  // Handle edit form submit
  const handleEditSubmit = async () => {
    if (!editingOperation) return;
    
    const milhas = parseNumber(editFormData.milhasUtilizadas);
    if (!editFormData.program || !milhas) {
      toast.error('Programa e milhas são obrigatórios');
      return;
    }

    await updateOperation.mutateAsync({
      id: editingOperation.id,
      program: editFormData.program,
      quantity: milhas,
      holder_id: editFormData.holderId || undefined,
      holder_name: editFormData.holderName || undefined,
      date: editFormData.dataEmissao,
      notes: `Passageiro: ${editFormData.nomePassageiro || 'N/A'}. Localizador: ${editFormData.localizador || 'N/A'}. CPFs utilizados: ${editFormData.cpfsUtilizados || 1}. ${editFormData.observacoes || ''}`,
    });

    setEditingOperation(null);
  };

  // Handle delete - also delete linked CPF usage record
  const handleDelete = async () => {
    if (!deleteOperationId) return;
    
    // Find and delete any linked CPF usage record
    const linkedCpfRecord = cpfUsage.find(u => u.operation_id === deleteOperationId);
    if (linkedCpfRecord) {
      try {
        await deleteCpfUsage.mutateAsync(linkedCpfRecord.id);
      } catch (error) {
        logger.error('Failed to delete linked CPF usage:', error);
      }
    }
    
    await deleteOperation.mutateAsync(deleteOperationId);
    setDeleteOperationId(null);
  };

  const handleEditMilhasChange = (value: string) => {
    setEditFormData({ ...editFormData, milhasUtilizadas: formatNumberInput(value) });
  };

  const handleEditHolderChange = (holderId: string, holderName?: string) => {
    setEditFormData({ ...editFormData, holderId, holderName: holderName || '' });
  };

  const exportToCSV = () => {
    if (passagensEmitidas.length === 0) {
      toast.error('Não há passagens para exportar');
      return;
    }

    const headers = ['Data', 'Programa', 'Passageiro', 'Milhas', 'Localizador', 'CPFs', 'Titular', 'Observações'];
    const rows = passagensEmitidas.map(op => {
      const { passageiro, localizador, cpfs, obs } = parsePassagemNotes(op.notes);
      return [
        formatDate(op.date),
        op.program,
        passageiro,
        op.quantity.toString(),
        localizador,
        cpfs.toString(),
        op.holder_name || '',
        obs
      ].join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passagens_emitidas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exportado com sucesso');
  };

  const exportToJSON = () => {
    if (passagensEmitidas.length === 0) {
      toast.error('Não há passagens para exportar');
      return;
    }

    const data = passagensEmitidas.map(op => {
      const { passageiro, localizador, cpfs, obs } = parsePassagemNotes(op.notes);
      return {
        data: op.date,
        programa: op.program,
        passageiro,
        milhas: op.quantity,
        localizador,
        cpfsUtilizados: cpfs,
        titular: op.holder_name,
        observacoes: obs
      };
    });

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passagens_emitidas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('JSON exportado com sucesso');
  };

  return (
    <DashboardLayout title="Passagem Emitida">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<Send className="h-5 w-5" />}
          title="Passagem Emitida"
          subtitle="Registrar resgate de milhas em emissão de passagem aérea"
        />

        {/* Registration Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta da Operação</Label>
                  <HolderSelect
                    value={formData.holderId}
                    onValueChange={handleHolderChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Programa *</Label>
                  <ProgramSelect
                    value={formData.program}
                    onValueChange={(value) => setFormData({ ...formData, program: value })}
                    categories={['brasil', 'americas', 'europa', 'asia']}
                  />
                </div>
              </div>

              {/* Row 2 - Passenger Name */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome do Passageiro</Label>
                <Input
                  value={formData.nomePassageiro}
                  onChange={(e) => handlePassageiroChange(e.target.value)}
                  placeholder="Nome completo do passageiro"
                />
                <p className="text-xs text-muted-foreground italic">
                  Preenchido automaticamente com o nome do titular. Altere se o passageiro for outra pessoa.
                </p>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Milhas Utilizadas na Emissão *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formData.milhasUtilizadas}
                    onChange={(e) => handleMilhasChange(e.target.value)}
                    placeholder="Ex: 50.000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Localizador</Label>
                  <Input
                    value={formData.localizador}
                    onChange={(e) =>
                      setFormData({ ...formData, localizador: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nº CPFs Utilizados</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.cpfsUtilizados}
                    onChange={(e) =>
                      setFormData({ ...formData, cpfsUtilizados: parseInt(e.target.value) || 1 })
                    }
                  />
                  {currentCpfStatus && (
                    <div className={`text-sm ${currentCpfStatus.isNearLimit ? 'text-warning' : 'text-muted-foreground'}`}>
                      CPFs disponíveis: <span className="font-mono tabular-nums">{currentCpfStatus.remaining}</span> de <span className="font-mono tabular-nums">{currentCpfStatus.limit}</span>
                      {currentCpfStatus.isAtLimit && (
                        <span className="text-destructive ml-2 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Limite atingido
                        </span>
                      )}
                      {currentCpfStatus.isNearLimit && !currentCpfStatus.isAtLimit && (
                        <span className="text-warning ml-2 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Próximo do limite
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4 */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Data da Emissão</Label>
                <Input
                  type="date"
                  value={formData.dataEmissao}
                  onChange={(e) =>
                    setFormData({ ...formData, dataEmissao: e.target.value })
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações:</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={4}
                  placeholder="Adicione observações sobre a emissão..."
                />
              </div>

              {/* Buttons */}
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
                  disabled={createOperation.isPending || !formData.program || !parseNumber(formData.milhasUtilizadas)}
                >
                  {createOperation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Emissão
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Histórico de Passagens ({passagensEmitidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar passageiro, localizador ou titular..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Programas</SelectItem>
                  {uniquePrograms.map(program => (
                    <SelectItem key={program} value={program}>{program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
                placeholder="Data início"
              />
              
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
                placeholder="Data fim"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mb-4">
              <div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <X className="h-4 w-4 mr-1" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={passagensEmitidas.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToJSON} disabled={passagensEmitidas.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Table */}
            {passagensEmitidas.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma passagem emitida</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                  Registre suas passagens emitidas para controlar suas milhas e CPFs utilizados.
                </p>
                <Button size="sm" onClick={() => navigate('/lancamentos/passagem-emitida')}><Plus className="h-4 w-4 mr-2" />Nova Passagem</Button>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Programa</TableHead>
                      <TableHead>Passageiro</TableHead>
                      <TableHead className="text-right">Milhas</TableHead>
                      <TableHead>Localizador</TableHead>
                      <TableHead className="text-center">CPFs</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead className="text-center w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passagensEmitidas.map(op => {
                      const { passageiro, localizador, cpfs } = parsePassagemNotes(op.notes);
                      return (
                        <TableRow key={op.id}>
                          <TableCell className="font-mono tabular-nums">{formatDate(op.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={op.program} size="sm" />
                              <span className="text-sm">{op.program}</span>
                            </div>
                          </TableCell>
                          <TableCell>{passageiro}</TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {formatNumber(op.quantity)}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">{localizador}</TableCell>
                          <TableCell className="text-center font-mono tabular-nums">{cpfs}</TableCell>
                          <TableCell>{op.holder_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleEdit(op)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteOperationId(op.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Infinite scroll sentinel + fallback button */}
            {passagensEmitidas.length > 0 && (
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums">{formatNumber(passagensEmitidas.length)} de {formatNumber(totalCount)}</span>
                  {hasNextPage ? ' · role para carregar mais' : ''}
                </span>
                <div className="flex items-center gap-2">
                  {isFetchingNextPage && (
                    <span className="text-xs text-muted-foreground">Carregando…</span>
                  )}
                  {hasNextPage && !isFetchingNextPage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                    >
                      Carregar mais
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingOperation} onOpenChange={(open) => !open && setEditingOperation(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Passagem Emitida</DialogTitle>
              <DialogDescription>
                Altere os dados da passagem e clique em salvar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular/Conta</Label>
                  <HolderSelect
                    value={editFormData.holderId}
                    onValueChange={handleEditHolderChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Programa *</Label>
                  <ProgramSelect
                    value={editFormData.program}
                    onValueChange={(value) => setEditFormData({ ...editFormData, program: value })}
                    categories={['brasil', 'americas', 'europa', 'asia']}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome do Passageiro</Label>
                <Input
                  value={editFormData.nomePassageiro}
                  onChange={(e) => setEditFormData({ ...editFormData, nomePassageiro: e.target.value })}
                  placeholder="Nome completo do passageiro"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Milhas Utilizadas *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={editFormData.milhasUtilizadas}
                    onChange={(e) => handleEditMilhasChange(e.target.value)}
                    placeholder="Ex: 50.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Localizador</Label>
                  <Input
                    value={editFormData.localizador}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, localizador: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nº CPFs</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={editFormData.cpfsUtilizados}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cpfsUtilizados: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Data da Emissão</Label>
                <Input
                  type="date"
                  value={editFormData.dataEmissao}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, dataEmissao: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações</Label>
                <Textarea
                  value={editFormData.observacoes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, observacoes: e.target.value })
                  }
                  rows={3}
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingOperation(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={updateOperation.isPending || !editFormData.program || !parseNumber(editFormData.milhasUtilizadas)}
              >
                {updateOperation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={!!deleteOperationId}
          onOpenChange={(open) => !open && setDeleteOperationId(null)}
          onConfirm={handleDelete}
          title="Excluir Passagem"
          description="Tem certeza que deseja excluir esta passagem emitida? Esta ação não pode ser desfeita."
          isLoading={deleteOperation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
