import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, MoreVertical, Plane, DollarSign, Loader2, Upload, User, Mail, CreditCard, TrendingUp, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';
import { useLocalization } from '@/hooks/useLocalization';
import { useNavigate } from 'react-router-dom';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { formatCPF, toTitleCase } from '@/lib/formatters';
import { computeHolderStats } from '@/lib/computeBalances';

type HolderRow = Database['public']['Tables']['holders']['Row'];
type OperationRow = Database['public']['Tables']['operations']['Row'];

export default function Titulares() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    avatar_url: '',
  });
  const [nameError, setNameError] = useState<string | null>(null);

  // Track previous user ID for forced refetch
  const previousUserIdRef = useRef<string | null>(null);

  // Fetch holders
  const { data: holders = [], isLoading, refetch: refetchHolders } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('holders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Force refetch when user.id transitions from null to a valid ID
  useEffect(() => {
    if (user?.id && previousUserIdRef.current === null) {
      refetchHolders();
    }
    previousUserIdRef.current = user?.id ?? null;
  }, [user?.id, refetchHolders]);

  // Fetch operations to calculate real balances
  const { data: operations = [] } = useQuery({
    queryKey: ['operations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'confirmado');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // (program_balances query removed — Titulares now derives totals from
  // operations via computeHolderStats, same as the other 3 surfaces.)

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let avatarUrl = data.avatar_url;
      
      // Upload avatar if file selected
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/holder-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase
        .from('holders')
        .insert({
          user_id: user!.id,
          name: data.name,
          cpf: data.cpf || null,
          email: data.email || null,
          avatar_url: avatarUrl || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holders'] });
      toast.success('Titular cadastrado com sucesso!');
      closeDialog();
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      let avatarUrl = data.avatar_url;
      
      // Upload avatar if file selected
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/holder-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase
        .from('holders')
        .update({
          name: data.name,
          cpf: data.cpf || null,
          email: data.email || null,
          avatar_url: avatarUrl || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holders'] });
      toast.success('Titular atualizado com sucesso!');
      closeDialog();
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('holders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holders'] });
      toast.success('Titular excluído com sucesso!');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', cpf: '', email: '', avatar_url: '' });
    setNameError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleEdit = (holder: HolderRow) => {
    setEditingId(holder.id);
    setFormData({
      name: holder.name || '',
      cpf: holder.cpf || '',
      email: holder.email || '',
      avatar_url: holder.avatar_url || '',
    });
    setAvatarPreview(holder.avatar_url || null);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setNameError('Informe o nome do titular');
      toast.error('Nome é obrigatório');
      return;
    }
    setNameError(null);
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // QA audit sas.txt Bug 3 — Holder mile totals now flow through the same
  // shared reducer (`computeHolderStats` from src/lib/computeBalances.ts)
  // that Dashboard, Análise, and Relatórios use. Previously this screen had
  // its own reducer that included `op.bonus` (which the others don't) and
  // also short-circuited to `program_balances` table data (which can be
  // stale relative to operations). The result was the holder-aggregated
  // total here disagreeing with Dashboard by hundreds of thousands of miles.
  // Operations is now the single source of truth across all four surfaces.
  const getHolderStats = (holderId: string) =>
    computeHolderStats(operations as OperationRow[], holderId);

  const filteredHolders = (holders as HolderRow[]).filter((holder) =>
    holder.name?.toLowerCase().includes(search.toLowerCase()) ||
    holder.email?.toLowerCase().includes(search.toLowerCase()) ||
    holder.cpf?.includes(search)
  );

  // Resumo Consolidado totals are computed over the visible (filtered) list so
  // the numbers always describe what the user actually sees on screen. See
  // gating on filteredHolders.length below.
  const totalMiles = filteredHolders.reduce((acc, holder) => acc + getHolderStats(holder.id).totalMiles, 0);
  const totalValue = filteredHolders.reduce((acc, holder) => acc + getHolderStats(holder.id).totalValue, 0);

  return (
    <DashboardLayout title="Titulares">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Pessoas"
          icon={<Users className="h-5 w-5" />}
          title="Titulares"
          subtitle="Pessoas/contas que possuem saldo em programas de milhas"
        />

        {/* Filter + Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar titular..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setDialogOpen(true)} 
            className="bg-primary hover:bg-primary/90"
            data-tour="add-holder"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Titular
          </Button>
        </div>

        {/* Holders Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredHolders.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Nenhum titular encontrado' : 'Nenhum titular cadastrado'}
            description={search
              ? 'Tente outra busca ou limpe os filtros.'
              : 'Cadastre titulares para gerenciar contas e cartões compartilhados.'}
            actionLabel={search ? undefined : 'Novo titular'}
            onAction={search ? undefined : () => setDialogOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-tour="holders-list">
            {filteredHolders.map((holder) => {
              const stats = getHolderStats(holder.id);
              return (
                <Card key={holder.id} className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                          <AvatarImage src={holder.avatar_url ?? undefined} alt={toTitleCase(holder.name)} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-lg font-semibold">
                            {holder.name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold">{toTitleCase(holder.name)}</CardTitle>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px]">{holder.email || 'Sem email'}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Mais opções">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(holder)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/analises?holder=${holder.id}`)}>Ver operações</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(holder.id)}
                          >
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {holder.cpf && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">CPF:</span>
                        <span className="font-mono">{holder.cpf}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 rounded-lg bg-primary/10 grid place-items-center">
                            <Plane className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Total Milhas</span>
                        </div>
                        <p className="font-mono text-xl font-bold tabular-nums tracking-tight text-foreground">
                          {formatNumber(stats.totalMiles)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 rounded-lg bg-success/10 grid place-items-center">
                            <DollarSign className="h-3.5 w-3.5 text-success" />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Valor Est.</span>
                        </div>
                        <p className="font-mono text-xl font-bold tabular-nums tracking-tight text-foreground">
                          {formatCurrency(stats.totalValue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <Badge variant="secondary" className="rounded-full px-3">
                        <span className="font-mono tabular-nums">{stats.programs}</span> {stats.programs === 1 ? 'programa' : 'programas'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                        onClick={() => navigate(`/analises?holder=${holder.id}`)}
                      >
                        Ver saldos →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary — gated on filteredHolders.length so the totals never
            contradict the empty state above. Without this guard, an empty
            search result paired with a populated Resumo Consolidado made the
            page read as "0 titulares cadastrados / 1 Titulares Cadastrados"
            (sas.txt Bug 8 / P1). */}
        {filteredHolders.length > 0 && (
          <Card className="bg-gradient-to-r from-card to-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Resumo Consolidado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                  <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground mb-1">
                    {formatNumber(totalMiles)}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Total de Milhas</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                  <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground mb-1">
                    {formatCurrency(totalValue)}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Valor Total Estimado</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-info/5 to-info/10 border border-info/10">
                  <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground mb-1">{filteredHolders.length}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {search ? 'Titulares no filtro' : 'Titulares Cadastrados'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog for Create/Edit */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Titular' : 'Novo Titular'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20 shadow-lg">
                  <AvatarImage src={avatarPreview || formData.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl">
                    {formData.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {avatarPreview || formData.avatar_url ? 'Alterar foto' : 'Adicionar foto'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'name-error' : undefined}
                  className={nameError ? 'border-destructive focus-visible:ring-destructive' : undefined}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (nameError && e.target.value.trim()) setNameError(null);
                  }}
                />
                {nameError && (
                  <p id="name-error" className="text-sm text-destructive">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          title="Excluir titular"
          description="Tem certeza que deseja excluir este titular? Esta ação não pode ser desfeita e pode afetar operações e saldos associados."
          isLoading={deleteMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
