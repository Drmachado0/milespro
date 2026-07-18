import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import { OptimizedLogo } from './optimized-logo';

// Import bank logos
import bbLogo from '@/assets/banks/bb.png';
import interLogo from '@/assets/banks/inter.png';
import masterLogo from '@/assets/banks/master.png';
import mercantilLogo from '@/assets/banks/mercantil.png';
import modalLogo from '@/assets/banks/modal.png';
import originalLogo from '@/assets/banks/original.png';
import panLogo from '@/assets/banks/pan.png';
import safraLogo from '@/assets/banks/safra.png';
import topazioLogo from '@/assets/banks/topazio.png';
import bmgLogo from '@/assets/banks/bmg.png';
import bradescoLogo from '@/assets/banks/bradesco.png';
import btgLogo from '@/assets/banks/btg.png';
import c6Logo from '@/assets/banks/c6.png';
import caixaLogo from '@/assets/banks/caixa.png';
import cresolLogo from '@/assets/banks/cresol.png';
import genialLogo from '@/assets/banks/genial.png';
import itauLogo from '@/assets/banks/itau.png';
import mercadopagoLogo from '@/assets/banks/mercadopago.png';
import neonLogo from '@/assets/banks/neon.png';
import nextLogo from '@/assets/banks/next.png';
import nubankLogo from '@/assets/banks/nubank.png';
import pagbankLogo from '@/assets/banks/pagbank.png';
import santanderLogo from '@/assets/banks/santander.png';
import sicoobLogo from '@/assets/banks/sicoob.png';
import sicrediLogo from '@/assets/banks/sicredi.png';
import xpLogo from '@/assets/banks/xp.png';

export type BankValue = 
  | 'bb' | 'inter' | 'master' | 'mercantil' | 'modal' | 'original' | 'pan' | 'safra' 
  | 'topazio' | 'bmg' | 'bradesco' | 'btg' | 'c6' | 'caixa' | 'cresol' | 'genial' 
  | 'itau' | 'mercadopago' | 'neon' | 'next' | 'nubank' | 'pagbank' | 'santander' 
  | 'sicoob' | 'sicredi' | 'xp' | 'other';

const bankLogos: Record<string, string> = {
  bb: bbLogo,
  inter: interLogo,
  master: masterLogo,
  mercantil: mercantilLogo,
  modal: modalLogo,
  original: originalLogo,
  pan: panLogo,
  safra: safraLogo,
  topazio: topazioLogo,
  bmg: bmgLogo,
  bradesco: bradescoLogo,
  btg: btgLogo,
  c6: c6Logo,
  caixa: caixaLogo,
  cresol: cresolLogo,
  genial: genialLogo,
  itau: itauLogo,
  mercadopago: mercadopagoLogo,
  neon: neonLogo,
  next: nextLogo,
  nubank: nubankLogo,
  pagbank: pagbankLogo,
  santander: santanderLogo,
  sicoob: sicoobLogo,
  sicredi: sicrediLogo,
  xp: xpLogo,
};

interface BankLogoProps {
  bank: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function BankLogo({ bank, size = 'md', className }: BankLogoProps) {
  const logo = bankLogos[bank];
  const bankLabel = issuerBanks.find(b => b.value === bank)?.label || bank;

  if (logo) {
    return (
      <OptimizedLogo 
        src={logo} 
        alt={`${bankLabel} logo`}
        containerClassName={cn(sizeClasses[size], 'rounded-sm')}
        className="w-full h-full object-contain"
        disableWebP={true}
      />
    );
  }

  // Fallback to icon for "other" or unknown banks
  return (
    <Building2 className={cn(sizeClasses[size], 'text-muted-foreground', className)} />
  );
}

// Lista de bancos emissores brasileiros (ordenada alfabeticamente)
export const issuerBanks = [
  { value: 'bb', label: 'Banco do Brasil' },
  { value: 'inter', label: 'Banco Inter' },
  { value: 'master', label: 'Banco Master' },
  { value: 'mercantil', label: 'Banco Mercantil do Brasil' },
  { value: 'modal', label: 'Banco Modal' },
  { value: 'original', label: 'Banco Original' },
  { value: 'pan', label: 'Banco Pan' },
  { value: 'safra', label: 'Banco Safra' },
  { value: 'topazio', label: 'Banco Topázio' },
  { value: 'bmg', label: 'BMG' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'btg', label: 'BTG Pactual' },
  { value: 'c6', label: 'C6 Bank' },
  { value: 'caixa', label: 'Caixa Econômica Federal' },
  { value: 'cresol', label: 'Cresol' },
  { value: 'genial', label: 'Genial' },
  { value: 'itau', label: 'Itaú Unibanco' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'neon', label: 'Neon' },
  { value: 'next', label: 'Next' },
  { value: 'nubank', label: 'Nubank' },
  { value: 'pagbank', label: 'PagBank' },
  { value: 'santander', label: 'Santander' },
  { value: 'sicoob', label: 'Sicoob' },
  { value: 'sicredi', label: 'Sicredi' },
  { value: 'xp', label: 'XP Investimentos' },
  { value: 'other', label: 'Outro' },
] as const;

export function getBankLabelFromValue(value: string): string {
  return issuerBanks.find(b => b.value === value)?.label || value;
}

export function getBankValueFromLabel(label: string | null): string {
  if (!label) return '';
  const bank = issuerBanks.find(b => b.label.toLowerCase() === label.toLowerCase());
  return bank?.value || 'other';
}
