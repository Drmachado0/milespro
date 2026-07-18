/**
 * CreateManagedAccountDialog — Phase 2 W2b (Plan 02-06) / TIER-05.
 *
 * Dialog form (shadcn Dialog) that lets a VIP owner add a managed CPF.
 * Wraps a single supabase.functions.invoke('create-managed-account')
 * call with optimistic toast + react-query invalidation.
 *
 * CPF input is plain digits with a light mask; we strip non-digits before
 * sending to the edge function. The edge function expects exactly 11 digits
 * and rejects anything else with a 400.
 *
 * Non-VIP users should not see the dialog at all — its caller (a dashboard
 * button or settings menu item) is responsible for the entrypoint visibility.
 * As defense, this component still no-ops if isVip === false.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { logger } from '@/lib/logger';
import { isValidCpf } from '@/lib/cpf';

function formatCpfMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  // Loose 000.000.000-00 mask for UX; we still strip on submit.
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export interface CreateManagedAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateManagedAccountDialog({
  open,
  onOpenChange,
}: CreateManagedAccountDialogProps) {
  const { isVip } = useSubscription();
  const qc = useQueryClient();

  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpfMasked, setCpfMasked] = useState('');

  const mutation = useMutation({
    mutationFn: async (input: { label: string; full_name: string; cpf: string }) => {
      const { data, error } = await supabase.functions.invoke('create-managed-account', {
        body: input,
      });
      if (error) {
        throw new Error(error.message || 'Falha ao criar conta gerenciada');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Conta gerenciada adicionada!');
      qc.invalidateQueries({ queryKey: ['managed_accounts'] });
      setLabel('');
      setFullName('');
      setCpfMasked('');
      onOpenChange(false);
    },
    onError: (err: Error) => {
      logger.warn('[CreateManagedAccountDialog] create failed', err.message);
      toast.error(`Não foi possível criar a conta: ${err.message}`);
    },
  });

  if (!isVip) return null;

  const handleSubmit = () => {
    const cpf = cpfMasked.replace(/\D/g, '');
    // P2 — Full CPF validation (check digits + sentinel rejection) so we
    // don't waste an Asaas API round-trip on values that we can locally
    // prove invalid. Same util used by future server-side checks.
    if (!isValidCpf(cpf)) {
      toast.error('CPF inválido. Confira os dígitos e tente novamente.');
      return;
    }
    if (label.trim().length === 0) {
      toast.error('Informe um apelido para o perfil (ex.: "Filha", "Cliente João").');
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error('Informe o nome completo do titular.');
      return;
    }
    mutation.mutate({ label: label.trim(), full_name: fullName.trim(), cpf });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar conta gerenciada</DialogTitle>
          <DialogDescription>
            Cadastre um novo CPF que você quer gerenciar dentro do seu MilesPro VIP.
            Esse perfil pode ter seus próprios programas, saldos e relatórios — você
            controla tudo de um único painel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="managed-label">Apelido do perfil</Label>
            <Input
              id="managed-label"
              placeholder="ex.: Filha, Cliente João, Sócio"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="managed-name">Nome completo do titular</Label>
            <Input
              id="managed-name"
              placeholder="Nome completo (como aparece nos programas)"
              value={fullName}
              maxLength={120}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="managed-cpf">CPF</Label>
            <Input
              id="managed-cpf"
              placeholder="000.000.000-00"
              value={cpfMasked}
              inputMode="numeric"
              onChange={(e) => setCpfMasked(formatCpfMask(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Usamos o CPF apenas para identificar o titular do perfil — não fazemos
              consultas externas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Adicionando…' : 'Adicionar conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
