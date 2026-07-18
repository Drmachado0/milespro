import { useState, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Upload, Layers, Loader2, Image, X, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { ALL_PROGRAMS } from '@/data/programs';
import { toast } from 'sonner';
import { useLocalization } from '@/hooks/useLocalization';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { ProgramLimitBadge } from '@/components/subscription/ProgramLimitBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/milespro';

interface UserProgram {
  id: string;
  user_id: string;
  program_name: string;
  is_active: boolean;
  is_custom: boolean;
  custom_icon_url: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

interface ProgramDisplay {
  name: string;
  category: string;
  isActive: boolean;
  isCustom: boolean;
  customIconUrl: string | null;
  userProgramId?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'pontos', label: 'Programas de Pontos' },
  { value: 'bancos', label: 'Bancos & Cartões' },
  { value: 'brasil', label: 'Cias Aéreas Brasil' },
  { value: 'americas', label: 'Américas' },
  { value: 'europa', label: 'Europa' },
  { value: 'asia', label: 'Oriente Médio & Oceania' },
  { value: 'hotels', label: 'Redes de Hotéis' },
  { value: 'outros', label: 'Outros' },
];

export default function Programas() {
  const { user } = useAuth();
  const { t } = useLocalization();
  const { isFree, canAddProgram, limits } = useSubscription();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for upgrade prompt
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add program dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', category: 'outros' });
  const [newProgramIcon, setNewProgramIcon] = useState<File | null>(null);

  // Edit icon dialog
  const [editIconDialog, setEditIconDialog] = useState<{ open: boolean; program: string | null }>({ open: false, program: null });
  const [editIconFile, setEditIconFile] = useState<File | null>(null);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; program: string | null }>({ open: false, program: null });

  // Fetch user programs preferences
  const { data: userPrograms = [], isLoading } = useQuery({
    queryKey: ['user_programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_programs')
        .select('*')
        .order('program_name');
      if (error) throw error;
      return data as UserProgram[];
    },
    enabled: !!user,
  });

  // Merge global programs with user preferences
  const allProgramsDisplay = useMemo((): ProgramDisplay[] => {
    const globalPrograms: ProgramDisplay[] = ALL_PROGRAMS.map(p => {
      const userProg = userPrograms.find(up => up.program_name === p.name);
      return {
        name: p.name,
        category: p.category,
        isActive: userProg ? userProg.is_active : true, // Default to active
        isCustom: false,
        customIconUrl: userProg?.custom_icon_url || null,
        userProgramId: userProg?.id,
      };
    });

    // Add custom programs from user
    const customPrograms: ProgramDisplay[] = userPrograms
      .filter(up => up.is_custom)
      .map(up => ({
        name: up.program_name,
        category: up.category,
        isActive: up.is_active,
        isCustom: true,
        customIconUrl: up.custom_icon_url,
        userProgramId: up.id,
      }));

    return [...globalPrograms, ...customPrograms].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [userPrograms]);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    return allProgramsDisplay.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive) ||
        (statusFilter === 'inactive' && !p.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [allProgramsDisplay, searchTerm, statusFilter]);

  // Toggle program active/inactive
  const toggleMutation = useMutation({
    mutationFn: async ({ programName, isActive }: { programName: string; isActive: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      const existing = userPrograms.find(p => p.program_name === programName);
      
      if (existing) {
        const { error } = await supabase
          .from('user_programs')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_programs')
          .insert({
            user_id: user.id,
            program_name: programName,
            is_active: isActive,
            is_custom: false,
            category: ALL_PROGRAMS.find(p => p.name === programName)?.category || 'outros',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_programs'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar programa', { description: error.message });
    },
  });

  // Add custom program
  const addProgramMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!newProgram.name.trim()) throw new Error('Nome é obrigatório');

      // Check program limit for free plan
      if (!canAddProgram) {
        throw new Error(`Você atingiu o limite de ${limits.maxPrograms} programas do plano Gratuito. Faça upgrade para o Pro para registrar todos os seus programas sem limite.`);
      }

      // Check if program already exists
      const exists = allProgramsDisplay.some(p => 
        p.name.toLowerCase() === newProgram.name.trim().toLowerCase()
      );
      if (exists) throw new Error('Programa já existe');

      let iconUrl = null;

      // Upload icon if provided
      if (newProgramIcon) {
        const fileExt = newProgramIcon.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('program-icons')
          .upload(fileName, newProgramIcon);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('program-icons')
          .getPublicUrl(fileName);
        
        iconUrl = publicUrl;
      }

      const { error } = await supabase
        .from('user_programs')
        .insert({
          user_id: user.id,
          program_name: newProgram.name.trim(),
          is_active: true,
          is_custom: true,
          category: newProgram.category,
          custom_icon_url: iconUrl,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_programs'] });
      setAddDialogOpen(false);
      setNewProgram({ name: '', category: 'outros' });
      setNewProgramIcon(null);
      toast.success('Programa adicionado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar programa', { description: error.message });
    },
  });

  // Update icon
  const updateIconMutation = useMutation({
    mutationFn: async ({ programName, file }: { programName: string; file: File | null }) => {
      if (!user) throw new Error('Not authenticated');
      
      const existing = userPrograms.find(p => p.program_name === programName);
      let iconUrl: string | null = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('program-icons')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('program-icons')
          .getPublicUrl(fileName);
        
        iconUrl = publicUrl;
      }

      if (existing) {
        const { error } = await supabase
          .from('user_programs')
          .update({ custom_icon_url: iconUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_programs')
          .insert({
            user_id: user.id,
            program_name: programName,
            is_active: true,
            is_custom: false,
            custom_icon_url: iconUrl,
            category: ALL_PROGRAMS.find(p => p.name === programName)?.category || 'outros',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_programs'] });
      setEditIconDialog({ open: false, program: null });
      setEditIconFile(null);
      toast.success('Ícone atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar ícone', { description: error.message });
    },
  });

  // Delete custom program
  const deleteProgramMutation = useMutation({
    mutationFn: async (programName: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const existing = userPrograms.find(p => p.program_name === programName && p.is_custom);
      if (!existing) throw new Error('Programa não encontrado');

      const { error } = await supabase
        .from('user_programs')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_programs'] });
      setDeleteDialog({ open: false, program: null });
      toast.success('Programa excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir programa', { description: error.message });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Selecione um arquivo de imagem');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      if (type === 'new') {
        setNewProgramIcon(file);
      } else {
        setEditIconFile(file);
      }
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
  };

  const handleAddProgramClick = () => {
    if (!canAddProgram) {
      setShowUpgradePrompt(true);
      return;
    }
    setAddDialogOpen(true);
  };

  return (
    <DashboardLayout title={t('programs.title')}>
      {/* Upgrade Prompt for Program Limit */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature="programas ilimitados"
        message={`Você atingiu o limite de ${limits.maxPrograms} programas do plano Gratuito. Faça upgrade para o Pro para registrar todos os seus programas sem limite.`}
        targetPlan="pro"
      />

      <div className="space-y-6">
        <PageHeader
          eyebrow="Sistema"
          title={t('programs.title')}
          subtitle={t('programs.description')}
          icon={<Layers className="h-4 w-4" />}
          actions={<ProgramLimitBadge />}
        />

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('programs.all')}</SelectItem>
                <SelectItem value="active">{t('programs.active')}</SelectItem>
                <SelectItem value="inactive">{t('programs.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Programs Table */}
        <DataTable<ProgramDisplay & Record<string, unknown>>
          title={t('programs.title')}
          countLabel={`${filteredPrograms.length} ${filteredPrograms.length === 1 ? 'programa' : 'programas'}`}
          rows={isLoading ? [] : (filteredPrograms as Array<ProgramDisplay & Record<string, unknown>>)}
          rowKey={(row) => row.name}
          pageSize={20}
          searchPlaceholder={t('programs.search')}
          onSearch={setSearchTerm}
          toolbarRight={
            <Button
              size="sm"
              onClick={handleAddProgramClick}
              className={!canAddProgram ? 'opacity-75' : ''}
            >
              {!canAddProgram && <Lock className="h-4 w-4 mr-1" />}
              <Plus className="h-4 w-4 mr-1" />
              {t('programs.addProgram')}
            </Button>
          }
          emptyState={
            isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando…</span>
              </div>
            ) : (
              <EmptyState
                compact
                icon={Layers}
                title="Nenhum programa encontrado"
                description={searchTerm || statusFilter !== 'all'
                  ? 'Ajuste os filtros para ver outros programas.'
                  : 'Adicione um programa personalizado para começar.'}
              />
            )
          }
          columns={[
            {
              key: 'logo',
              header: 'Logo',
              width: '64px',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setEditIconDialog({ open: true, program: row.name })}
                  className="relative group"
                  title={t('programs.changeIcon')}
                >
                  {row.customIconUrl ? (
                    <img
                      src={row.customIconUrl}
                      alt={row.name}
                      className="w-8 h-8 rounded object-contain"
                    />
                  ) : (
                    <ProgramLogo program={row.name} size="sm" />
                  )}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                    <Edit2 className="h-3 w-3 text-foreground" />
                  </div>
                </button>
              ),
            },
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  {row.isCustom && (
                    <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Categoria',
              sortable: true,
              render: (row) => (
                <span className="text-muted-foreground text-sm">{getCategoryLabel(row.category)}</span>
              ),
            },
            {
              key: 'isActive',
              header: 'Ativo',
              width: '96px',
              render: (row) => (
                <div className="text-center">
                  <Switch
                    checked={row.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ programName: row.name, isActive: checked })
                    }
                    disabled={toggleMutation.isPending}
                  />
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '64px',
              render: (row) =>
                row.isCustom ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog({ open: true, program: row.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null,
            },
          ] satisfies DataTableColumn<ProgramDisplay & Record<string, unknown>>[]}
        />

        {/* Add Program Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('programs.addProgram')}</DialogTitle>
              <DialogDescription>
                Adicione um programa personalizado à sua lista.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="program-name">Nome do Programa</Label>
                <Input
                  id="program-name"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  placeholder="Nome do programa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-category">Categoria</Label>
                <Select
                  value={newProgram.category}
                  onValueChange={(v) => setNewProgram({ ...newProgram, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ícone (opcional)</Label>
                <div className="flex items-center gap-3">
                  {newProgramIcon ? (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(newProgramIcon)}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-contain border"
                      />
                      <button
                        type="button"
                        onClick={() => setNewProgramIcon(null)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('new-icon-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Enviar Imagem
                  </Button>
                  <input
                    id="new-icon-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'new')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">PNG ou JPG, máx 2MB</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => addProgramMutation.mutate()}
                disabled={addProgramMutation.isPending || !newProgram.name.trim()}
              >
                {addProgramMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Icon Dialog */}
        <Dialog open={editIconDialog.open} onOpenChange={(open) => {
          setEditIconDialog({ open, program: open ? editIconDialog.program : null });
          if (!open) setEditIconFile(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('programs.changeIcon')}</DialogTitle>
              <DialogDescription>
                Altere o ícone do programa {editIconDialog.program}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">Ícone atual:</div>
                {(() => {
                  const program = allProgramsDisplay.find(p => p.name === editIconDialog.program);
                  if (program?.customIconUrl) {
                    return <img src={program.customIconUrl} alt="" className="w-12 h-12 rounded object-contain" />;
                  }
                  return <ProgramLogo program={editIconDialog.program || ''} size="md" />;
                })()}
              </div>
              <div className="space-y-2">
                <Label>Novo ícone</Label>
                <div className="flex items-center gap-3">
                  {editIconFile ? (
                    <div className="relative">
                      <img 
                        src={URL.createObjectURL(editIconFile)} 
                        alt="Preview" 
                        className="w-12 h-12 rounded-lg object-contain border"
                      />
                      <button
                        type="button"
                        onClick={() => setEditIconFile(null)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-icon-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Enviar Imagem
                  </Button>
                  <input
                    id="edit-icon-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'edit')}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {(() => {
                const program = allProgramsDisplay.find(p => p.name === editIconDialog.program);
                if (program?.customIconUrl) {
                  return (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (editIconDialog.program) {
                          updateIconMutation.mutate({ programName: editIconDialog.program, file: null });
                        }
                      }}
                      disabled={updateIconMutation.isPending}
                    >
                      Restaurar Padrão
                    </Button>
                  );
                }
                return null;
              })()}
              <Button variant="outline" onClick={() => setEditIconDialog({ open: false, program: null })}>
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (editIconDialog.program && editIconFile) {
                    updateIconMutation.mutate({ programName: editIconDialog.program, file: editIconFile });
                  }
                }}
                disabled={updateIconMutation.isPending || !editIconFile}
              >
                {updateIconMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, program: open ? deleteDialog.program : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Programa</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o programa "{deleteDialog.program}"? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false, program: null })}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (deleteDialog.program) {
                    deleteProgramMutation.mutate(deleteDialog.program);
                  }
                }}
                disabled={deleteProgramMutation.isPending}
              >
                {deleteProgramMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
