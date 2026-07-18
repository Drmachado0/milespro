import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Home,
  Users,
  CreditCard,
  Banknote,
  Coins,
  ClipboardList,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  Gift,
  Crown,
  Ticket,
  Rocket,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  ArrowLeftRight,
  Calculator,
  Calendar,
  Plane,
  Building2,
  Car,
  Ship,
  ShieldCheck,
  Landmark,
  Bus,
  PiggyBank,
  BarChart3,
  FileText,
  Trophy,
  Bell,
  Layers,
  Users2,
  Settings,
  Plus,
  Search,
  LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProductTier } from '@/hooks/useProductTier';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  group: string;
  keywords?: string[];
  shortcut?: string;
}

// Páginas organizadas por grupo
const PAGES: CommandItem[] = [
  // Dashboard
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', group: 'Páginas', keywords: ['início', 'home'] },
  
  // Cadastro
  { id: 'titulares', label: 'Titulares', icon: Users, path: '/titulares', group: 'Cadastro', keywords: ['holders', 'pessoas', 'contas'] },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard, path: '/gestao/cartoes', group: 'Cadastro', keywords: ['cards', 'crédito'] },
  { id: 'assinaturas', label: 'Assinaturas', icon: Banknote, path: '/gestao/clube-assinante', group: 'Cadastro', keywords: ['clube', 'subscription'] },
  { id: 'milheiros', label: 'Milheiros de Referência', icon: Coins, path: '/gestao/precos-programas', group: 'Cadastro', keywords: ['preços', 'cotações'] },
  
  // Lançamentos
  { id: 'visao-geral', label: 'Visão Geral de Operações', icon: ClipboardList, path: '/operacoes/visao-geral', group: 'Lançamentos', keywords: ['operações', 'histórico'] },
  { id: 'entrada', label: 'Entrada Manual', icon: ArrowDownRight, path: '/lancamentos/entrada', group: 'Lançamentos', keywords: ['adicionar', 'milhas'] },
  { id: 'saida', label: 'Saída Manual', icon: ArrowUpRight, path: '/lancamentos/saida-manual', group: 'Lançamentos', keywords: ['remover', 'milhas'] },
  { id: 'passagem', label: 'Passagem Emitida', icon: Send, path: '/lancamentos/passagem-emitida', group: 'Lançamentos', keywords: ['resgate', 'voo'] },
  { id: 'bonus', label: 'Bônus Pendentes', icon: Gift, path: '/gestao/bonus-pendentes', group: 'Lançamentos', keywords: ['pendente', 'aguardando'] },
  { id: 'vip', label: 'Sala VIP', icon: Crown, path: '/lancamentos/sala-vip', group: 'Lançamentos', keywords: ['lounge', 'acesso'] },
  { id: 'venda', label: 'Venda de Milhas', icon: Ticket, path: '/agencia/venda', group: 'Lançamentos', keywords: ['vender', 'venda'] },
  
  // Estratégias
  { id: 'turbinada', label: 'Compra Turbinada', icon: Rocket, path: '/lancamentos/compra-turbinada', group: 'Estratégias', keywords: ['turbo', 'acelerar'] },
  { id: 'compra', label: 'Compra de Milhas', icon: DollarSign, path: '/lancamentos/compra', group: 'Estratégias', keywords: ['comprar', 'adquirir'] },
  { id: 'carrinho', label: 'Compra do Carrinho', icon: ShoppingCart, path: '/lancamentos/compra-carrinho', group: 'Estratégias', keywords: ['cart', 'shopping'] },
  { id: 'bumerangue', label: 'Bumerangue', icon: RotateCcw, path: '/lancamentos/bumerangue', group: 'Estratégias', keywords: ['boomerang', 'retorno'] },
  { id: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, path: '/lancamentos/transferencia', group: 'Estratégias', keywords: ['transfer'] },
  { id: 'transferencia-cartao', label: 'Transferência via Cartão', icon: CreditCard, path: '/lancamentos/transferencia-cartao', group: 'Estratégias' },
  { id: 'simulador', label: 'Simuladores', icon: Calculator, path: '/simulador', group: 'Estratégias', keywords: ['calcular', 'simular', 'roi'] },
  
  // Reservas
  { id: 'calendario', label: 'Calendário', icon: Calendar, path: '/agencia/calendario', group: 'Reservas', keywords: ['agenda', 'datas'] },
  { id: 'passagens', label: 'Passagens Aéreas', icon: Plane, path: '/agencia/passagens', group: 'Reservas', keywords: ['voos', 'flights'] },
  { id: 'hoteis', label: 'Hotéis', icon: Building2, path: '/agencia/hoteis', group: 'Reservas', keywords: ['hospedagem', 'hotels'] },
  { id: 'carros', label: 'Carros', icon: Car, path: '/agencia/carros', group: 'Reservas', keywords: ['aluguel', 'rental'] },
  { id: 'cruzeiros', label: 'Cruzeiros', icon: Ship, path: '/agencia/cruzeiros', group: 'Reservas', keywords: ['cruise', 'navio'] },
  { id: 'seguros', label: 'Seguro Viagem', icon: ShieldCheck, path: '/agencia/seguros', group: 'Reservas', keywords: ['insurance', 'proteção'] },
  { id: 'atracoes', label: 'Atrações Turísticas', icon: Landmark, path: '/agencia/atracoes', group: 'Reservas', keywords: ['tours', 'passeios'] },
  { id: 'transportes', label: 'Transportes', icon: Bus, path: '/agencia/transportes', group: 'Reservas', keywords: ['transfer', 'traslado'] },
  // QA audit (sas.txt Bug 4) — `/agencia/economia` had no route; the
  // equivalent report lives at `/relatorios/economia`.
  { id: 'economia-reservas', label: 'Economia Gerada (Reservas)', icon: PiggyBank, path: '/relatorios/economia', group: 'Reservas' },
  
  // Análises & Relatórios
  { id: 'programas', label: 'Análise de Programas', icon: BarChart3, path: '/analises', group: 'Análises & Relatórios', keywords: ['analytics', 'gráficos'] },
  { id: 'economia', label: 'Economia Consolidada', icon: PiggyBank, path: '/relatorios/economia', group: 'Análises & Relatórios', keywords: ['savings', 'economia'] },
  { id: 'relatorio-passagens', label: 'Relatório de Passagens', icon: Plane, path: '/relatorios/passagens', group: 'Análises & Relatórios' },
  { id: 'relatorio-cartoes', label: 'Relatório de Cartões', icon: CreditCard, path: '/relatorios/cartoes', group: 'Análises & Relatórios' },
  { id: 'relatorios', label: 'Relatórios Gerais', icon: FileText, path: '/relatorios', group: 'Análises & Relatórios', keywords: ['reports'] },
  
  // Sistema
  { id: 'conquistas', label: 'Conquistas', icon: Trophy, path: '/conquistas', group: 'Sistema', keywords: ['badges', 'achievements'] },
  { id: 'alertas', label: 'Alertas', icon: Bell, path: '/alertas', group: 'Sistema', keywords: ['notificações', 'avisos'] },
  { id: 'programas-sistema', label: 'Programas', icon: Layers, path: '/sistema/programas', group: 'Sistema', keywords: ['fidelidade'] },
  { id: 'limite-cpf', label: 'Limites de CPF', icon: Users2, path: '/sistema/limite-cpf', group: 'Sistema', keywords: ['cpf', 'limites'] },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/configuracoes', group: 'Sistema', keywords: ['settings', 'preferências'] },
];

// Ações rápidas
const QUICK_ACTIONS: CommandItem[] = [
  { id: 'nova-entrada', label: 'Nova Entrada Manual', icon: Plus, path: '/lancamentos/entrada', group: 'Ações Rápidas', keywords: ['adicionar milhas'] },
  { id: 'nova-passagem', label: 'Nova Passagem Emitida', icon: Plus, path: '/lancamentos/passagem-emitida', group: 'Ações Rápidas', keywords: ['emitir passagem'] },
  { id: 'nova-venda', label: 'Nova Venda de Milhas', icon: Plus, path: '/agencia/venda', group: 'Ações Rápidas', keywords: ['vender milhas'] },
  { id: 'novo-titular', label: 'Novo Titular', icon: Plus, path: '/titulares', group: 'Ações Rápidas', keywords: ['adicionar titular'] },
  { id: 'novo-cartao', label: 'Novo Cartão', icon: Plus, path: '/gestao/cartoes', group: 'Ações Rápidas', keywords: ['adicionar cartão'] },
];

const ALL_ITEMS = [...QUICK_ACTIONS, ...PAGES];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { hasTier } = useProductTier();

  // Handle global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  // Group items by category, dropping the Pro+ agency surface (every /agencia/*
  // route) for Starter accounts so the palette matches their visible modules.
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    ALL_ITEMS.forEach(item => {
      if (item.path.startsWith('/agencia') && !hasTier('pro')) return;
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });
    return groups;
  }, [hasTier]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border-border/60 shadow-2xl">
        <Command className="rounded-lg bg-popover" shouldFilter={true}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Buscar páginas, ações ou operações..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            {Object.entries(groupedItems).map(([group, items]) => (
              <Command.Group key={group} heading={group} className="px-1 py-2">
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                    onSelect={() => handleSelect(item.path)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                      "text-sm text-foreground transition-colors",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      "hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg",
                      item.group === 'Ações Rápidas' 
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground hidden sm:inline-flex">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer with shortcut hint */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd>
                selecionar
              </span>
            </div>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">K</kbd>
              abrir
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
