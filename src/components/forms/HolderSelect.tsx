import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useHolders } from '@/hooks/useOperations';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { Loader2, UserPlus } from 'lucide-react';
import { formatCPF, toTitleCase } from '@/lib/formatters';

interface HolderSelectProps {
  value: string;
  onValueChange: (value: string, name?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HolderSelect({ 
  value, 
  onValueChange, 
  placeholder = 'Selecione o titular',
  disabled = false,
}: HolderSelectProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { holders, isLoading } = useHolders();
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', cpf: '', email: '' });
  
  const handleChange = (holderId: string) => {
    // Handle "no holder" option
    if (holderId === '__no_holder__') {
      onValueChange('', undefined);
      return;
    }
    const holder = holders.find(h => h.id === holderId);
    onValueChange(holderId, holder?.name);
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data: newHolder, error } = await supabase
        .from('holders')
        .insert({
          user_id: user.id,
          name: data.name,
          cpf: data.cpf || null,
          email: data.email || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newHolder;
    },
    onSuccess: (newHolder) => {
      queryClient.invalidateQueries({ queryKey: ['holders', user?.id] });
      toast.success('Titular cadastrado com sucesso!');
      setSheetOpen(false);
      setFormData({ name: '', cpf: '', email: '' });
      onValueChange(newHolder.id, newHolder.name);
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const handleOpenSheet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Use internal value to handle empty state properly
  const selectValue = value === '' ? undefined : value;
  
  return (
    <>
      <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-primary"
              onClick={handleOpenSheet}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar novo titular
            </Button>
          </div>
          
          {/* Opção explícita para conta geral.
              Audit sas.txt P2: rótulo + descrição reforçam que escolher
              "sem titular" é deliberado, não default. O usuário pode
              vincular um titular depois pelo botão acima. */}
          <SelectItem value="__no_holder__">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground italic">Sem titular específico</span>
              <span className="text-[10px] text-muted-foreground/70">
                Use só se a operação não pertencer a nenhum titular cadastrado
              </span>
            </div>
          </SelectItem>
          
          {holders.length === 0 ? (
            <div className="px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum titular cadastrado
              </p>
            </div>
          ) : (
            holders.map((holder) => (
              <SelectItem key={holder.id} value={holder.id}>
                <div className="flex items-center gap-2">
                  <span>{toTitleCase(holder.name)}</span>
                  {holder.cpf && (
                    <span className="text-xs text-muted-foreground">({holder.cpf})</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Novo Titular</SheetTitle>
            <SheetDescription>
              Cadastre um novo titular para suas operações
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="holder-name">Nome *</Label>
              <Input
                id="holder-name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="holder-cpf">CPF</Label>
              <Input
                id="holder-cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="holder-email">Email</Label>
              <Input
                id="holder-email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
