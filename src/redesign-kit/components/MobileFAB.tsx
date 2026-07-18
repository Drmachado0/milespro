/**
 * Mobile FAB speed-dial — Material 3 floating action button.
 *
 * Posicionado 76px do bottom pra ficar acima da bottom-nav.
 * Expande 4 quick actions com labels flutuantes ao tocar.
 *
 * Requisitos: react-router-dom, lucide-react, função opcional haptics.
 * Edita o array `actions` pras rotas do seu app.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, DollarSign, RotateCcw, ArrowLeftRight, Send } from 'lucide-react';
import { hapticImpact, hapticSelection } from '@/lib/haptics';

interface QuickAction {
  to: string;
  icon: typeof DollarSign;
  label: string;
}

// EDITA pras 4 ações mais usadas no seu produto
const actions: QuickAction[] = [
  { to: '/lancamentos/compra',         icon: DollarSign,     label: 'Compra' },
  { to: '/lancamentos/bumerangue',     icon: RotateCcw,      label: 'Bumerangue' },
  { to: '/lancamentos/transferencia',  icon: ArrowLeftRight, label: 'Transferência' },
  { to: '/agencia/venda',              icon: Send,           label: 'Venda' },
];

export function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    hapticImpact();
    setOpen((v) => !v);
  };

  const handleAction = (to: string) => {
    hapticSelection();
    setOpen(false);
    navigate(to);
  };

  return (
    <div
      className="fixed right-4 z-40 md:hidden"
      style={{ bottom: 'calc(76px + var(--safe-area-inset-bottom))' }}
    >
      {/* Speed-dial backdrop */}
      {open && (
        <button
          aria-label="Fechar menu de ações"
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 bg-background/60 backdrop-blur-sm animate-fade-in"
        />
      )}

      {/* Action items */}
      <ul
        className={[
          'absolute bottom-16 right-0 flex flex-col items-end gap-3',
          'transition-all duration-200',
          open
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 translate-y-2',
        ].join(' ')}
      >
        {actions.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex items-center gap-3">
            <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              {label}
            </span>
            <button
              type="button"
              onClick={() => handleAction(to)}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label={label}
            >
              <Icon className="h-5 w-5 text-primary" />
            </button>
          </li>
        ))}
      </ul>

      {/* Main FAB */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
        className={[
          'grid h-14 w-14 place-items-center rounded-2xl',
          'bg-gradient-to-br from-primary to-primary/80',
          'text-primary-foreground shadow-[0_8px_16px_-2px_hsl(var(--primary)/0.45),0_4px_8px_-2px_rgba(0,0,0,0.3)]',
          'transition-transform active:scale-95',
          open && 'rotate-45',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
