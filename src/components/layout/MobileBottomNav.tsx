import { useState } from 'react';
import {
  Home,
  BarChart3,
  List,
  Bell,
  MoreHorizontal,
  CreditCard,
  Trophy,
  Sparkles,
  FileText,
  Settings as SettingsIcon,
  User as UserIcon,
  Calculator,
  Building2,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { hapticSelection, hapticImpact } from '@/lib/haptics';
import { useProductTier } from '@/hooks/useProductTier';
import { ProductTier } from '@/config/planModules';

interface BottomNavItem {
  to: string;
  icon: typeof Home;
  label: string;
  /** Product-module gate: hidden below this tier (starter/pro/agency). */
  requiredTier?: ProductTier;
}

// Base primary items (Starter core). The 4th slot is tier-conditional (see
// component): Promoções is an Agency-tier module, so Starter/Pro get Cartões
// promoted into that high-traffic slot instead.
const basePrimaryItems: BottomNavItem[] = [
  { to: '/dashboard', icon: Home, label: 'Início' },
  { to: '/analises', icon: BarChart3, label: 'Programas' },
  { to: '/operacoes/visao-geral', icon: List, label: 'Operações' },
];

const primaryPromocoes: BottomNavItem = { to: '/promocoes', icon: Sparkles, label: 'Promoções' };
const primaryCartoes: BottomNavItem = { to: '/gestao/cartoes', icon: CreditCard, label: 'Cartões' };

const overflowItems: BottomNavItem[] = [
  { to: '/alertas', icon: Bell, label: 'Alertas' },
  { to: '/gestao/cartoes', icon: CreditCard, label: 'Cartões' },
  { to: '/simulador', icon: Calculator, label: 'Simulador' },
  { to: '/relatorios', icon: FileText, label: 'Relatórios' },
  { to: '/conquistas', icon: Trophy, label: 'Conquistas' },
  { to: '/titulares', icon: UserIcon, label: 'Titulares' },
  { to: '/agencia', icon: Building2, label: 'Agência', requiredTier: 'pro' },
  { to: '/configuracoes', icon: SettingsIcon, label: 'Configurações' },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { isAgency, hasTier } = useProductTier();

  // 4th primary slot: Promoções only for Agency (promo engine); otherwise the
  // Cartões shortcut fills the slot so the bar keeps 4 primary items.
  const primaryItems: BottomNavItem[] = [
    ...basePrimaryItems,
    isAgency ? primaryPromocoes : primaryCartoes,
  ];

  // Drop shortcuts above the user's tier (the route would bounce them back to
  // /dashboard via TierRoute anyway). Also de-dupe Cartões when it is already
  // promoted into the primary slot for Starter/Pro.
  const visibleOverflowItems = overflowItems.filter(
    (item) =>
      (!item.requiredTier || hasTier(item.requiredTier)) &&
      !(item.to === primaryCartoes.to && !isAgency)
  );

  const goTo = (to: string) => {
    hapticSelection();
    setMoreOpen(false);
    navigate(to);
  };

  return (
    <>
      {/* Overflow sheet — full-screen action picker */}
      {moreOpen && (
        <div
          role="dialog"
          aria-label="Mais opções"
          aria-modal="true"
          className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-md animate-fade-in"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-border bg-card shadow-[0_-12px_40px_-8px_rgba(0,0,0,.5)]"
            style={{ paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Menu</span>
                </div>
                <h2 className="mt-1 text-base font-semibold">Mais opções</h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => {
                  hapticImpact();
                  setMoreOpen(false);
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-4 gap-2 px-4 pt-3 pb-4">
              {visibleOverflowItems.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <button
                    type="button"
                    onClick={() => goTo(to)}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border border-transparent px-2 py-3 text-center transition-colors hover:border-border hover:bg-muted/40 active:bg-muted/60"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted/40 text-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight text-foreground">{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/85 backdrop-blur-xl"
        style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      >
        <ul className="flex h-[68px] items-center">
          {primaryItems.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                onClick={() => hapticSelection()}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 py-2 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'grid place-items-center transition-all duration-200',
                        'h-8 w-16 rounded-2xl',
                        isActive ? 'bg-primary/16' : 'bg-transparent',
                      ].join(' ')}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium leading-none">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          {/* "Mais" overflow trigger */}
          <li className="flex-1">
            <button
              type="button"
              aria-label="Mais opções"
              aria-expanded={moreOpen}
              onClick={() => {
                hapticSelection();
                setMoreOpen((v) => !v);
              }}
              className={[
                'flex w-full flex-col items-center gap-1 py-2 transition-colors',
                moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span
                className={[
                  'grid h-8 w-16 place-items-center rounded-2xl transition-all duration-200',
                  moreOpen ? 'bg-primary/16' : 'bg-transparent',
                ].join(' ')}
              >
                <MoreHorizontal className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium leading-none">Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
