import Icon from '@mdi/react';
import {
  mdiAccountGroupOutline,
  mdiAccountMultipleOutline,
  mdiAirplane,
  mdiBellOutline,
  mdiBookOpenPageVariantOutline,
  mdiBus,
  mdiCalculatorVariantOutline,
  mdiCalendarMonthOutline,
  mdiCarOutline,
  mdiCartOutline,
  mdiChartBar,
  mdiChartLine,
  mdiClipboardTextOutline,
  mdiCogOutline,
  mdiCreditCardOutline,
  mdiCrownOutline,
  mdiCurrencyUsd,
  mdiFerry,
  mdiFileDocumentOutline,
  mdiFileQuestionOutline,
  mdiFolderCogOutline,
  mdiGiftOutline,
  mdiLayersOutline,
  mdiLightningBoltOutline,
  mdiMapMarkerRadiusOutline,
  mdiOfficeBuildingOutline,
  mdiPiggyBankOutline,
  mdiReceiptTextOutline,
  mdiRestore,
  mdiRocketLaunchOutline,
  mdiShieldCheckOutline,
  mdiSwapHorizontal,
  mdiTicketConfirmationOutline,
  mdiTrayArrowDown,
  mdiTrayArrowUp,
  mdiTrophyOutline,
  mdiTuneVariant,
  mdiViewDashboardOutline,
  mdiWalletMembership,
} from '@mdi/js';
import { cn } from '@/lib/utils';

type IconTone = 'orange' | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';

interface NavIconSpec {
  path: string;
  tone: IconTone;
}

const toneClasses: Record<IconTone, string> = {
  orange: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  blue: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  cyan: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
};

const routeIcons: Record<string, NavIconSpec> = {
  '/dashboard': { path: mdiViewDashboardOutline, tone: 'orange' },
  '/titulares': { path: mdiAccountGroupOutline, tone: 'blue' },
  '/gestao/cartoes': { path: mdiCreditCardOutline, tone: 'violet' },
  '/gestao/clube-assinante': { path: mdiWalletMembership, tone: 'emerald' },
  '/gestao/precos-programas': { path: mdiCurrencyUsd, tone: 'amber' },
  '/operacoes/visao-geral': { path: mdiClipboardTextOutline, tone: 'blue' },
  '/lancamentos/entrada': { path: mdiTrayArrowDown, tone: 'emerald' },
  '/lancamentos/saida-manual': { path: mdiTrayArrowUp, tone: 'rose' },
  '/lancamentos/passagem-emitida': { path: mdiAirplane, tone: 'cyan' },
  '/gestao/bonus-pendentes': { path: mdiGiftOutline, tone: 'violet' },
  '/lancamentos/sala-vip': { path: mdiCrownOutline, tone: 'amber' },
  '/lancamentos/compra-turbinada': { path: mdiRocketLaunchOutline, tone: 'violet' },
  '/lancamentos/compra': { path: mdiCurrencyUsd, tone: 'emerald' },
  '/lancamentos/compra-carrinho': { path: mdiCartOutline, tone: 'blue' },
  '/lancamentos/bumerangue': { path: mdiRestore, tone: 'cyan' },
  '/lancamentos/transferencia': { path: mdiSwapHorizontal, tone: 'violet' },
  '/lancamentos/transferencia-cartao': { path: mdiCreditCardOutline, tone: 'amber' },
  '/simulador': { path: mdiCalculatorVariantOutline, tone: 'blue' },
  '/agencia': { path: mdiChartLine, tone: 'orange' },
  '/agencia/clientes': { path: mdiAccountGroupOutline, tone: 'blue' },
  '/agencia/orcamentos': { path: mdiFileQuestionOutline, tone: 'violet' },
  '/agencia/contas-receber': { path: mdiReceiptTextOutline, tone: 'emerald' },
  '/agencia/venda': { path: mdiTicketConfirmationOutline, tone: 'amber' },
  '/agencia/imposto-renda': { path: mdiFileDocumentOutline, tone: 'rose' },
  '/agencia/configuracoes': { path: mdiCogOutline, tone: 'blue' },
  '/agencia/calendario': { path: mdiCalendarMonthOutline, tone: 'violet' },
  '/agencia/passagens': { path: mdiAirplane, tone: 'cyan' },
  '/agencia/hoteis': { path: mdiOfficeBuildingOutline, tone: 'blue' },
  '/agencia/carros': { path: mdiCarOutline, tone: 'emerald' },
  '/agencia/cruzeiros': { path: mdiFerry, tone: 'cyan' },
  '/agencia/seguros': { path: mdiShieldCheckOutline, tone: 'emerald' },
  '/agencia/atracoes': { path: mdiMapMarkerRadiusOutline, tone: 'rose' },
  '/agencia/transportes': { path: mdiBus, tone: 'amber' },
  '/relatorios/economia': { path: mdiPiggyBankOutline, tone: 'emerald' },
  '/analises': { path: mdiChartBar, tone: 'violet' },
  '/relatorios/passagens': { path: mdiAirplane, tone: 'cyan' },
  '/relatorios/cartoes': { path: mdiCreditCardOutline, tone: 'blue' },
  '/relatorios': { path: mdiFileDocumentOutline, tone: 'amber' },
  '/conquistas': { path: mdiTrophyOutline, tone: 'amber' },
  '/alertas': { path: mdiBellOutline, tone: 'rose' },
  '/sistema/programas': { path: mdiLayersOutline, tone: 'violet' },
  '/sistema/limite-cpf': { path: mdiAccountMultipleOutline, tone: 'blue' },
  '/admin/blog': { path: mdiBookOpenPageVariantOutline, tone: 'cyan' },
  '/configuracoes': { path: mdiCogOutline, tone: 'blue' },
};

const groupIcons: Record<string, NavIconSpec> = {
  'nav.registration': { path: mdiFolderCogOutline, tone: 'blue' },
  'nav.operations': { path: mdiBookOpenPageVariantOutline, tone: 'emerald' },
  'nav.strategies': { path: mdiLightningBoltOutline, tone: 'violet' },
  'nav.analyticsReports': { path: mdiChartLine, tone: 'amber' },
  'nav.travelAgency': { path: mdiOfficeBuildingOutline, tone: 'rose' },
  'nav.reservations': { path: mdiCalendarMonthOutline, tone: 'cyan' },
  'nav.system': { path: mdiTuneVariant, tone: 'blue' },
};

interface MaterialNavIconProps {
  route?: string;
  groupKey?: string;
  active?: boolean;
  compact?: boolean;
  className?: string;
}

export function MaterialNavIcon({ route, groupKey, active = false, compact = false, className }: MaterialNavIconProps) {
  const spec = (route ? routeIcons[route] : undefined) ?? (groupKey ? groupIcons[groupKey] : undefined);
  if (!spec) return null;

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center transition-[transform,background-color,color,box-shadow] duration-300 ease-out group-hover:scale-105',
        compact ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-[10px]',
        active
          ? 'bg-primary text-primary-foreground shadow-[0_5px_14px_hsl(var(--primary)/0.24)]'
          : toneClasses[spec.tone],
        className,
      )}
      aria-hidden="true"
    >
      <Icon path={spec.path} size={compact ? 0.72 : 0.82} />
    </span>
  );
}
