import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getProgramAbbrev } from '@/data/programs';
import { OptimizedLogo } from './optimized-logo';

// Import program logos - Brazil
// Padrão: importar .png como fonte canônica; o <picture> em OptimizedLogo
// serve .webp automaticamente quando o navegador suporta.
import liveloLogo from '@/assets/programs/livelo.png';
import esferaLogo from '@/assets/programs/esfera.png';
import smilesLogo from '@/assets/programs/smiles.png';
import tudoazulLogo from '@/assets/programs/tudoazul.png';
import azulFidelidadeLogo from '@/assets/programs/tudoazul.png';
import latamLogo from '@/assets/programs/latam.png';
import itauLogo from '@/assets/programs/itau.png';
import itauPontosLogo from '@/assets/programs/itaupontos.png';
import brbLogo from '@/assets/programs/brb.png';
import santanderLogo from '@/assets/programs/santander.png';
import tapLogo from '@/assets/programs/tap.png';
import curtaiLogo from '@/assets/programs/curtai.png';
import loopLogo from '@/assets/programs/loop.png';
import atomosLogo from '@/assets/programs/atomos.png';
import iberiaLogo from '@/assets/programs/iberia.png';
import nubankrewardsLogo from '@/assets/programs/nubankrewards.png';
import surpreendaLogo from '@/assets/programs/surpreenda.png';

// Import bank logos
import interLogo from '@/assets/banks/inter.png';
import c6Logo from '@/assets/banks/c6.png';
import bbLogo from '@/assets/banks/bb.png';
import caixaLogo from '@/assets/banks/caixa.png';
import btgLogo from '@/assets/banks/btg.png';
import xpLogo from '@/assets/banks/xp.png';
import genialLogo from '@/assets/banks/genial.png';
import safraLogo from '@/assets/banks/safra.png';
import sicrediLogo from '@/assets/banks/sicredi.png';
import cresolLogo from '@/assets/banks/cresol.png';
import nubankLogo from '@/assets/banks/nubank.svg';
import mercadopagoLogo from '@/assets/banks/mercadopago.png';
import unicredLogo from '@/assets/banks/unicred.png';
import itauBankLogo from '@/assets/banks/itau.svg';

// Import club/outros logos
import flamengoLogo from '@/assets/programs/flamengo.png';

// Import program logos - Americas
import mileageplusLogo from '@/assets/programs/mileageplus.png';
import aadvantageLogo from '@/assets/programs/aadvantage.png';
import aeroplanLogo from '@/assets/programs/aeroplan.png';
import connectmilesLogo from '@/assets/programs/connectmiles.png';
import deltaLogo from '@/assets/programs/delta.png';

// Import program logos - Europe
import britishairwaysLogo from '@/assets/programs/britishairways.png';
import flyingblueLogo from '@/assets/programs/flyingblue.png';
import milesandmoreLogo from '@/assets/programs/milesandmore.png';
import sumaLogo from '@/assets/programs/suma.png';

// Import program logos - Asia/Middle East
import qatarLogo from '@/assets/programs/qatar.png';
import emiratesLogo from '@/assets/programs/emirates.png';
import etihadLogo from '@/assets/programs/etihad.png';
import krisflyerLogo from '@/assets/programs/krisflyer.png';

// Import program logos - Hotels
import accorLogo from '@/assets/programs/accor.png';
import hiltonLogo from '@/assets/programs/hilton.png';
import marriottLogo from '@/assets/programs/marriott.png';
import hyattLogo from '@/assets/programs/hyatt.png';
import ihgLogo from '@/assets/programs/ihg.png';
import wyndhamLogo from '@/assets/programs/wyndham.png';
import choiceLogo from '@/assets/programs/choice.png';
import radissonLogo from '@/assets/programs/radisson.png';
import bestwesternLogo from '@/assets/programs/bestwestern.png';
import sonestaLogo from '@/assets/programs/sonesta.png';
import mgmLogo from '@/assets/programs/mgm.png';
import meliaLogo from '@/assets/programs/melia.png';
import ghaLogo from '@/assets/programs/gha.png';
import shangrilaLogo from '@/assets/programs/shangrila.png';
import omniLogo from '@/assets/programs/omni.png';
import palladiumLogo from '@/assets/programs/palladium.png';
import nhLogo from '@/assets/programs/nh.png';

// Import airline logos
import turkishLogo from '@/assets/airlines/turkish.png';
import alaskaLogo from '@/assets/airlines/alaska.png';
import cathayLogo from '@/assets/airlines/cathay.png';
import airindiaLogo from '@/assets/airlines/airindia.png';
import finnairLogo from '@/assets/airlines/finnair.png';
import airnewzealandLogo from '@/assets/airlines/airnewzealand.png';
import qantasLogo from '@/assets/airlines/qantas.svg';
import jalLogo from '@/assets/airlines/jal.svg';
import southwestLogo from '@/assets/airlines/southwest.svg';
import ryanairLogo from '@/assets/airlines/ryanair.svg';
import westjetLogo from '@/assets/airlines/westjet.svg';
import aerlingusLogo from '@/assets/airlines/aerlingus.svg';
import anaLogo from '@/assets/airlines/ana.svg';
import ethiopianLogo from '@/assets/airlines/ethiopian.svg';
import sasLogo from '@/assets/airlines/sas.svg';
import lotLogo from '@/assets/airlines/lot.svg';
import itaLogo from '@/assets/airlines/ita.svg';
import hawaiianLogo from '@/assets/airlines/hawaiian.svg';
import aerolineasLogo from '@/assets/airlines/aerolineas.svg';
import royalairmarocLogo from '@/assets/airlines/royalairmaroc.svg';
import chinaeasternLogo from '@/assets/airlines/chinaeastern.svg';
import airchinaLogo from '@/assets/airlines/airchina.svg';
import chinaairlinesLogo from '@/assets/airlines/chinaairlines.svg';
import frontierLogo from '@/assets/airlines/frontier.svg';
import americanLogo from '@/assets/airlines/american.png';

interface ProgramLogoProps {
  program: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const programLogos: Record<string, { logo: string; abbrev: string }> = {
  // ===== PROGRAMAS DE PONTOS =====
  Livelo: { logo: liveloLogo, abbrev: 'LV' },
  Esfera: { logo: esferaLogo, abbrev: 'ES' },
  Átomos: { logo: atomosLogo, abbrev: 'AT' },
  Loop: { logo: loopLogo, abbrev: 'LP' },
  Dotz: { logo: mercadopagoLogo, abbrev: 'DZ' }, // Fallback
  Alloyal: { logo: loopLogo, abbrev: 'AL' }, // Fallback
  'Membership Rewards': { logo: aadvantageLogo, abbrev: 'MR' }, // Amex - fallback
  'Bilt Rewards': { logo: deltaLogo, abbrev: 'BR' }, // Fallback
  RevPoints: { logo: loopLogo, abbrev: 'RP' }, // Fallback
  'Virgin Red': { logo: deltaLogo, abbrev: 'VR' }, // Fallback
  'Porto Plus': { logo: loopLogo, abbrev: 'PP' }, // Fallback
  // Legacy names
  'Nubank Rewards': { logo: nubankrewardsLogo, abbrev: 'NB' },
  'Mastercard Surpreenda': { logo: surpreendaLogo, abbrev: 'MS' },
  'Átomos – Inter': { logo: interLogo, abbrev: 'AI' },
  'Átomos – C6 Bank': { logo: c6Logo, abbrev: 'AC6' },
  'Curtai – BRB': { logo: curtaiLogo, abbrev: 'CT' },
  'Itaú Pontos': { logo: itauPontosLogo, abbrev: 'IP' },
  
  // ===== BANCOS & CARTÕES =====
  Itaú: { logo: itauBankLogo, abbrev: 'IT' },
  'BTG Pactual': { logo: btgLogo, abbrev: 'BTG' },
  'XP Investimentos': { logo: xpLogo, abbrev: 'XP' },
  'Genial Investimentos': { logo: genialLogo, abbrev: 'GN' },
  'Safra Rewards': { logo: safraLogo, abbrev: 'SF' },
  'Nubank Ultravioleta': { logo: nubankLogo, abbrev: 'NU' },
  'Banco do Brasil': { logo: bbLogo, abbrev: 'BB' },
  Caixa: { logo: caixaLogo, abbrev: 'CX' },
  BRB: { logo: brbLogo, abbrev: 'BR' },
  'BRB StockCar+': { logo: brbLogo, abbrev: 'SC' },
  Sicredi: { logo: sicrediLogo, abbrev: 'SI' },
  Unicred: { logo: unicredLogo, abbrev: 'UC' },
  Cresol: { logo: cresolLogo, abbrev: 'CR' },
  Curtaí: { logo: curtaiLogo, abbrev: 'CT' },
  Santander: { logo: santanderLogo, abbrev: 'ST' },
  
  // ===== CLUBES & OUTROS =====
  '+Mengão': { logo: flamengoLogo, abbrev: 'FLA' },
  
  // ===== CIAS AÉREAS BRASIL =====
  Smiles: { logo: smilesLogo, abbrev: 'SM' },
  'Azul Fidelidade': { logo: azulFidelidadeLogo, abbrev: 'AZ' },
  TudoAzul: { logo: tudoazulLogo, abbrev: 'TA' }, // Legacy
  LatamPass: { logo: latamLogo, abbrev: 'LT' },
  Latam: { logo: latamLogo, abbrev: 'LT' }, // Legacy
  LATAM: { logo: latamLogo, abbrev: 'LT' }, // Legacy
  'TAP Miles&Go': { logo: tapLogo, abbrev: 'TP' },
  TAP: { logo: tapLogo, abbrev: 'TP' }, // Legacy
  
  // ===== AMÉRICAS =====
  AAdvantage: { logo: aadvantageLogo, abbrev: 'AA' },
  Aeroplan: { logo: aeroplanLogo, abbrev: 'AP' },
  'United Airlines': { logo: mileageplusLogo, abbrev: 'UA' },
  MileagePlus: { logo: mileageplusLogo, abbrev: 'MP' }, // Legacy
  'Delta SkyMiles': { logo: deltaLogo, abbrev: 'DL' },
  ConnectMiles: { logo: connectmilesLogo, abbrev: 'CM' },
  'Alaska Airlines': { logo: alaskaLogo, abbrev: 'AS' },
  'Southwest Rapid Rewards': { logo: southwestLogo, abbrev: 'SW' },
  'Aerolíneas Argentinas': { logo: aerolineasLogo, abbrev: 'AR' },
  LifeMiles: { logo: aadvantageLogo, abbrev: 'LM' }, // Avianca partner
  
  // North American airlines (for airline select)
  'American Airlines': { logo: americanLogo, abbrev: 'AA' },
  'Delta Air Lines': { logo: deltaLogo, abbrev: 'DL' },
  'Southwest Airlines': { logo: southwestLogo, abbrev: 'SW' },
  'Air Canada': { logo: aeroplanLogo, abbrev: 'AC' },
  'JetBlue': { logo: deltaLogo, abbrev: 'JB' },
  'Frontier Airlines': { logo: frontierLogo, abbrev: 'FR' },
  'Hawaiian Airlines': { logo: hawaiianLogo, abbrev: 'HA' },
  'WestJet': { logo: westjetLogo, abbrev: 'WJ' },
  'Copa Airlines': { logo: connectmilesLogo, abbrev: 'CM' },
  Avianca: { logo: aadvantageLogo, abbrev: 'AV' },
  
  // South American airlines
  'LATAM Airlines Brasil': { logo: latamLogo, abbrev: 'LT' },
  'LATAM Chile': { logo: latamLogo, abbrev: 'LC' },
  'LATAM Peru': { logo: latamLogo, abbrev: 'LP' },
  'LATAM Colombia': { logo: latamLogo, abbrev: 'LO' },
  'Aerolineas Argentinas': { logo: aerolineasLogo, abbrev: 'AR' },
  'GOL Linhas Aéreas': { logo: smilesLogo, abbrev: 'GL' },
  'Azul Linhas Aéreas Brasileiras': { logo: tudoazulLogo, abbrev: 'AZ' },
  
  // ===== EUROPA =====
  'Flying Blue': { logo: flyingblueLogo, abbrev: 'FB' },
  'British Executive Club': { logo: britishairwaysLogo, abbrev: 'BA' },
  'British Airways': { logo: britishairwaysLogo, abbrev: 'BA' }, // Legacy
  Lufthansa: { logo: milesandmoreLogo, abbrev: 'LH' },
  'Miles & More': { logo: milesandmoreLogo, abbrev: 'MM' }, // Legacy
  Ibéria: { logo: iberiaLogo, abbrev: 'IB' },
  Iberia: { logo: iberiaLogo, abbrev: 'IB' },
  'Air Europa SUMA': { logo: sumaLogo, abbrev: 'SU' },
  SUMA: { logo: sumaLogo, abbrev: 'SU' }, // Legacy
  'Finnair Plus': { logo: finnairLogo, abbrev: 'AY' },
  Finnair: { logo: finnairLogo, abbrev: 'AY' },
  'Miles&Smiles Turkish': { logo: turkishLogo, abbrev: 'TK' },
  'Turkish Airlines': { logo: turkishLogo, abbrev: 'TK' },
  'Volare ITA Airways': { logo: itaLogo, abbrev: 'AZI' },
  'ITA Airways': { logo: itaLogo, abbrev: 'AZ' },
  'Flying Club': { logo: deltaLogo, abbrev: 'VS' }, // Virgin Atlantic fallback
  
  // European airlines
  'TAP Air Portugal': { logo: tapLogo, abbrev: 'TP' },
  Swiss: { logo: milesandmoreLogo, abbrev: 'LX' },
  Austrian: { logo: milesandmoreLogo, abbrev: 'OS' },
  KLM: { logo: flyingblueLogo, abbrev: 'KL' },
  'Air France': { logo: flyingblueLogo, abbrev: 'AF' },
  'Air Europa': { logo: sumaLogo, abbrev: 'UX' },
  SAS: { logo: sasLogo, abbrev: 'SK' },
  LOT: { logo: lotLogo, abbrev: 'LO' },
  Ryanair: { logo: ryanairLogo, abbrev: 'FR' },
  'Aer Lingus': { logo: aerlingusLogo, abbrev: 'EI' },
  
  // ===== ORIENTE MÉDIO & OCEANIA =====
  'Emirates Skywards': { logo: emiratesLogo, abbrev: 'EK' },
  Emirates: { logo: emiratesLogo, abbrev: 'EK' },
  'Qatar Privilege Club': { logo: qatarLogo, abbrev: 'QR' },
  'Qatar Privilege': { logo: qatarLogo, abbrev: 'QA' }, // Legacy
  'Qatar Airways': { logo: qatarLogo, abbrev: 'QR' },
  'Etihad Guest': { logo: etihadLogo, abbrev: 'EY' },
  'Etihad Airways': { logo: etihadLogo, abbrev: 'EY' },
  'Saudia Al Fursan': { logo: qatarLogo, abbrev: 'SV' }, // Fallback
  Qantas: { logo: qantasLogo, abbrev: 'QF' },
  
  // Asian airlines
  'Singapore Airlines': { logo: krisflyerLogo, abbrev: 'SQ' },
  KrisFlyer: { logo: krisflyerLogo, abbrev: 'KF' },
  'Cathay Pacific': { logo: cathayLogo, abbrev: 'CX' },
  ANA: { logo: anaLogo, abbrev: 'NH' },
  'Japan Airlines': { logo: jalLogo, abbrev: 'JL' },
  'Air India': { logo: airindiaLogo, abbrev: 'AI' },
  'China Airlines': { logo: chinaairlinesLogo, abbrev: 'CI' },
  'China Eastern': { logo: chinaeasternLogo, abbrev: 'MU' },
  'Air China': { logo: airchinaLogo, abbrev: 'CA' },
  
  // Oceania airlines
  'Air New Zealand': { logo: airnewzealandLogo, abbrev: 'NZ' },
  
  // Africa airlines
  'Ethiopian Airlines': { logo: ethiopianLogo, abbrev: 'ET' },
  'Royal Air Maroc': { logo: royalairmarocLogo, abbrev: 'AT' },
  
  // ===== REDES DE HOTÉIS =====
  'All Accor': { logo: accorLogo, abbrev: 'AC' },
  'Accor ALL': { logo: accorLogo, abbrev: 'AC' }, // Legacy
  'Marriott Bonvoy': { logo: marriottLogo, abbrev: 'MB' },
  'Hilton Honors': { logo: hiltonLogo, abbrev: 'HH' },
  'World of Hyatt': { logo: hyattLogo, abbrev: 'WH' },
  IHG: { logo: ihgLogo, abbrev: 'IHG' },
  'IHG One Rewards': { logo: ihgLogo, abbrev: 'IHG' }, // Legacy
  Meliã: { logo: meliaLogo, abbrev: 'ML' },
  MeliaRewards: { logo: meliaLogo, abbrev: 'MR' }, // Legacy
  'Wyndham Rewards': { logo: wyndhamLogo, abbrev: 'WR' },
  'Choice Privileges': { logo: choiceLogo, abbrev: 'CP' },
  'Radisson Rewards': { logo: radissonLogo, abbrev: 'RR' },
  'Best Western Rewards': { logo: bestwesternLogo, abbrev: 'BW' },
  'Sonesta Travel Pass': { logo: sonestaLogo, abbrev: 'ST' },
  'MGM Rewards': { logo: mgmLogo, abbrev: 'MGM' },
  'GHA Discovery': { logo: ghaLogo, abbrev: 'GHA' },
  'Shangri-La Circle': { logo: shangrilaLogo, abbrev: 'SL' },
  'Omni Select Guest': { logo: omniLogo, abbrev: 'OS' },
  'PALLADIUM Rewards': { logo: palladiumLogo, abbrev: 'PR' },
  'NH Rewards': { logo: nhLogo, abbrev: 'NH' },
};

// Category colors for programs without logos (fallback)
const categoryColors: Record<string, { from: string; to: string }> = {
  pontos: { from: 'from-violet-500', to: 'to-violet-700' },
  bancos: { from: 'from-success', to: 'to-success' },
  brasil: { from: 'from-success', to: 'to-success' },
  americas: { from: 'from-info', to: 'to-info' },
  europa: { from: 'from-indigo-500', to: 'to-indigo-700' },
  asia: { from: 'from-warning', to: 'to-warning' },
  oceania: { from: 'from-info', to: 'to-info' },
  africa: { from: 'from-primary', to: 'to-primary' },
  hotels: { from: 'from-destructive', to: 'to-destructive' },
  outros: { from: 'from-slate-500', to: 'to-slate-700' },
};

// Map programs to their categories for color coding (fallback)
const programCategories: Record<string, string> = {
  // Pontos
  Livelo: 'pontos',
  Esfera: 'pontos',
  Átomos: 'pontos',
  Loop: 'pontos',
  Dotz: 'pontos',
  Alloyal: 'pontos',
  'Membership Rewards': 'pontos',
  'Bilt Rewards': 'pontos',
  RevPoints: 'pontos',
  'Virgin Red': 'pontos',
  'Porto Plus': 'pontos',
  'Nubank Rewards': 'pontos',
  'Mastercard Surpreenda': 'pontos',
  'Átomos – Inter': 'pontos',
  'Átomos – C6 Bank': 'pontos',
  'Curtai – BRB': 'pontos',
  'Itaú Pontos': 'pontos',
  
  // Bancos
  Itaú: 'bancos',
  'BTG Pactual': 'bancos',
  'XP Investimentos': 'bancos',
  'Genial Investimentos': 'bancos',
  'Safra Rewards': 'bancos',
  'Nubank Ultravioleta': 'bancos',
  'Banco do Brasil': 'bancos',
  Caixa: 'bancos',
  'BV Merece': 'bancos',
  Credicard: 'bancos',
  Banrisul: 'bancos',
  Banescard: 'bancos',
  'Nomad Pass': 'bancos',
  'BRB StockCar+': 'bancos',
  BRB: 'bancos',
  Sicredi: 'bancos',
  Unicred: 'bancos',
  Ailos: 'bancos',
  Coopera: 'bancos',
  Cresol: 'bancos',
  Sisprime: 'bancos',
  Curtaí: 'bancos',
  Santander: 'bancos',
  
  // Brasil Airlines
  Smiles: 'brasil',
  'Azul Fidelidade': 'brasil',
  TudoAzul: 'brasil',
  LatamPass: 'brasil',
  Latam: 'brasil',
  LATAM: 'brasil',
  'TAP Miles&Go': 'brasil',
  TAP: 'brasil',
  'GOL Linhas Aéreas': 'brasil',
  'Azul Linhas Aéreas Brasileiras': 'brasil',
  'LATAM Airlines Brasil': 'brasil',
  
  // Americas
  AAdvantage: 'americas',
  Aeroplan: 'americas',
  'United Airlines': 'americas',
  MileagePlus: 'americas',
  'Delta SkyMiles': 'americas',
  ConnectMiles: 'americas',
  'Alaska Airlines': 'americas',
  'Southwest Rapid Rewards': 'americas',
  'Aerolíneas Argentinas': 'americas',
  LifeMiles: 'americas',
  'American Airlines': 'americas',
  'Delta Air Lines': 'americas',
  'Southwest Airlines': 'americas',
  'Air Canada': 'americas',
  WestJet: 'americas',
  'JetBlue': 'americas',
  'Frontier Airlines': 'americas',
  'Hawaiian Airlines': 'americas',
  'Copa Airlines': 'americas',
  Avianca: 'americas',
  'LATAM Chile': 'americas',
  'LATAM Peru': 'americas',
  'LATAM Colombia': 'americas',
  'Aerolineas Argentinas': 'americas',
  
  // Europa
  'Flying Blue': 'europa',
  'British Executive Club': 'europa',
  'British Airways': 'europa',
  Lufthansa: 'europa',
  'Miles & More': 'europa',
  Ibéria: 'europa',
  Iberia: 'europa',
  'Air Europa SUMA': 'europa',
  SUMA: 'europa',
  'Finnair Plus': 'europa',
  Finnair: 'europa',
  'Miles&Smiles Turkish': 'europa',
  'Turkish Airlines': 'europa',
  'Volare ITA Airways': 'europa',
  'ITA Airways': 'europa',
  'Flying Club': 'europa',
  'TAP Air Portugal': 'europa',
  Swiss: 'europa',
  Austrian: 'europa',
  KLM: 'europa',
  'Air France': 'europa',
  'Air Europa': 'europa',
  SAS: 'europa',
  LOT: 'europa',
  Ryanair: 'europa',
  'Aer Lingus': 'europa',
  
  // Oriente Médio & Ásia
  'Emirates Skywards': 'asia',
  Emirates: 'asia',
  'Qatar Privilege Club': 'asia',
  'Qatar Privilege': 'asia',
  'Qatar Airways': 'asia',
  'Etihad Guest': 'asia',
  'Etihad Airways': 'asia',
  'Saudia Al Fursan': 'asia',
  Qantas: 'asia',
  KrisFlyer: 'asia',
  'Singapore Airlines': 'asia',
  'Cathay Pacific': 'asia',
  ANA: 'asia',
  'Japan Airlines': 'asia',
  'Air India': 'asia',
  'China Airlines': 'asia',
  'China Eastern': 'asia',
  'Air China': 'asia',
  
  // Oceania
  'Air New Zealand': 'oceania',
  'Virgin Australia': 'oceania',
  
  // Africa
  'Ethiopian Airlines': 'africa',
  'Royal Air Maroc': 'africa',
  
  // Hotéis
  'All Accor': 'hotels',
  'Accor ALL': 'hotels',
  'Marriott Bonvoy': 'hotels',
  'Hilton Honors': 'hotels',
  'World of Hyatt': 'hotels',
  IHG: 'hotels',
  'IHG One Rewards': 'hotels',
  Meliã: 'hotels',
  MeliaRewards: 'hotels',
  'Wyndham Rewards': 'hotels',
  'Choice Privileges': 'hotels',
  'Radisson Rewards': 'hotels',
  'Best Western Rewards': 'hotels',
  'Sonesta Travel Pass': 'hotels',
  'MGM Rewards': 'hotels',
  'GHA Discovery': 'hotels',
  'Shangri-La Circle': 'hotels',
  'Omni Select Guest': 'hotels',
  'PALLADIUM Rewards': 'hotels',
  'NH Rewards': 'hotels',
  
  // Outros
  'Km de Vantagens': 'outros',
  'Shell Box': 'outros',
  Premmia: 'outros',
  Ale: 'outros',
  GPA: 'outros',
  '+Mengão': 'outros',
};

const sizeClasses = {
  xs: 'w-5 h-5 rounded-md',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-16 h-16 rounded-2xl',
};

const imgSizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

// Intrinsic pixel dimensions per size — prevents CLS and informs srcset/sizes.
const imgPixelSize = {
  xs: 16,
  sm: 28,
  md: 40,
  lg: 56,
};

// Logos that are horizontal/text-based need full width
const horizontalLogos = ['Smiles', 'British Airways', 'British Executive Club', 'Flying Blue', 'Miles & More', 'American Airlines'];

export function ProgramLogo({ program, size = 'md', className }: ProgramLogoProps) {
  const programData = programLogos[program];
  const isHorizontal = horizontalLogos.includes(program);
  const px = imgPixelSize[size];
  const [loadFailed, setLoadFailed] = useState(false);

  // Imported assets can become hashed URLs or inlined data URLs in production.
  // Trust the import and only fall back if the browser reports a load failure.
  const hasValidAsset = !!programData?.logo;

  if (hasValidAsset && !loadFailed && programData?.logo) {
    return (
      <OptimizedLogo
        src={programData.logo}
        alt={`${program} logo`}
        containerClassName={cn(
          'flex items-center justify-center shadow-sm border border-border/50 overflow-hidden bg-white',
          sizeClasses[size],
          className
        )}
        className={cn(
          'object-contain',
          isHorizontal ? 'w-full h-auto px-0.5' : imgSizeClasses[size]
        )}
        width={isHorizontal ? undefined : px}
        height={isHorizontal ? undefined : px}
        sizes={`${px}px`}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  // Fallback to gradient + abbreviation
  const abbrev = getProgramAbbrev(program);
  const category = programCategories[program] || 'pontos';
  const colors = categoryColors[category] || categoryColors.pontos;
  
  return (
    <div 
      className={cn(
        'flex items-center justify-center font-bold text-white shadow-md bg-gradient-to-br',
        colors.from,
        colors.to,
        sizeClasses[size],
        size === 'xs' && 'text-[8px]',
        size === 'sm' && 'text-[10px]',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        className
      )}
    >
      {abbrev}
    </div>
  );
}
