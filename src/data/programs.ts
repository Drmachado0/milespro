// Central configuration for all loyalty programs

export interface ProgramInfo {
  name: string;
  abbrev: string;
  defaultPrice: number;
  category: 'pontos' | 'bancos' | 'brasil' | 'americas' | 'europa' | 'asia' | 'hotels' | 'outros';
  airline?: string;
  bank?: string;
}

// Programas de Pontos
export const PROGRAMAS_PONTOS: ProgramInfo[] = [
  { name: 'Livelo', abbrev: 'LV', defaultPrice: 35.00, category: 'pontos' },
  { name: 'Esfera', abbrev: 'ES', defaultPrice: 35.00, category: 'pontos' },
  { name: 'Átomos', abbrev: 'AT', defaultPrice: 35.00, category: 'pontos' },
  { name: 'Loop', abbrev: 'LP', defaultPrice: 30.00, category: 'pontos' },
  { name: 'Dotz', abbrev: 'DZ', defaultPrice: 25.00, category: 'pontos' },
  { name: 'Alloyal', abbrev: 'AL', defaultPrice: 30.00, category: 'pontos' },
  { name: 'Membership Rewards', abbrev: 'MR', defaultPrice: 40.00, category: 'pontos' },
  { name: 'Bilt Rewards', abbrev: 'BR', defaultPrice: 35.00, category: 'pontos' },
  { name: 'RevPoints', abbrev: 'RP', defaultPrice: 30.00, category: 'pontos' },
  { name: 'Virgin Red', abbrev: 'VR', defaultPrice: 35.00, category: 'pontos' },
  { name: 'Porto Plus', abbrev: 'PP', defaultPrice: 30.00, category: 'pontos' },
];

// Bancos & Cartões
export const BANCOS_CARTOES: ProgramInfo[] = [
  { name: 'Itaú', abbrev: 'IT', defaultPrice: 0, category: 'bancos' },
  { name: 'BTG Pactual', abbrev: 'BTG', defaultPrice: 0, category: 'bancos' },
  { name: 'XP Investimentos', abbrev: 'XP', defaultPrice: 0, category: 'bancos' },
  { name: 'Genial Investimentos', abbrev: 'GN', defaultPrice: 0, category: 'bancos' },
  { name: 'Safra Rewards', abbrev: 'SF', defaultPrice: 0, category: 'bancos' },
  { name: 'Nubank Ultravioleta', abbrev: 'NU', defaultPrice: 30.00, category: 'bancos' },
  { name: 'Banco do Brasil', abbrev: 'BB', defaultPrice: 0, category: 'bancos' },
  { name: 'Caixa', abbrev: 'CX', defaultPrice: 0, category: 'bancos' },
  { name: 'BV Merece', abbrev: 'BV', defaultPrice: 0, category: 'bancos' },
  { name: 'Credicard', abbrev: 'CC', defaultPrice: 0, category: 'bancos' },
  { name: 'Banrisul', abbrev: 'BS', defaultPrice: 0, category: 'bancos' },
  { name: 'Banescard', abbrev: 'BC', defaultPrice: 0, category: 'bancos' },
  { name: 'Nomad Pass', abbrev: 'NM', defaultPrice: 0, category: 'bancos' },
  { name: 'BRB StockCar+', abbrev: 'SC', defaultPrice: 0, category: 'bancos' },
  { name: 'Sicredi', abbrev: 'SI', defaultPrice: 0, category: 'bancos' },
  { name: 'Unicred', abbrev: 'UC', defaultPrice: 0, category: 'bancos' },
  { name: 'Ailos', abbrev: 'AIL', defaultPrice: 0, category: 'bancos' },
  { name: 'Coopera', abbrev: 'CO', defaultPrice: 0, category: 'bancos' },
  { name: 'Cresol', abbrev: 'CR', defaultPrice: 0, category: 'bancos' },
  { name: 'Sisprime', abbrev: 'SP', defaultPrice: 0, category: 'bancos' },
  { name: 'Curtaí', abbrev: 'CT', defaultPrice: 30.00, category: 'bancos' },
];

// Cias Aéreas Brasil
export const CIAS_BRASIL: ProgramInfo[] = [
  { name: 'Smiles', abbrev: 'SM', defaultPrice: 17.50, category: 'brasil', airline: 'GOL' },
  { name: 'Azul Fidelidade', abbrev: 'AZ', defaultPrice: 17.50, category: 'brasil', airline: 'Azul' },
  { name: 'LatamPass', abbrev: 'LT', defaultPrice: 25.00, category: 'brasil', airline: 'LATAM' },
  { name: 'TAP Miles&Go', abbrev: 'TP', defaultPrice: 35.00, category: 'brasil', airline: 'TAP' },
];

// Américas
export const CIAS_AMERICAS: ProgramInfo[] = [
  { name: 'AAdvantage', abbrev: 'AA', defaultPrice: 40.00, category: 'americas', airline: 'American' },
  { name: 'Aeroplan', abbrev: 'AP', defaultPrice: 38.00, category: 'americas', airline: 'Air Canada' },
  { name: 'United Airlines', abbrev: 'UA', defaultPrice: 40.00, category: 'americas', airline: 'United' },
  { name: 'Delta SkyMiles', abbrev: 'DL', defaultPrice: 42.00, category: 'americas', airline: 'Delta' },
  { name: 'ConnectMiles', abbrev: 'CM', defaultPrice: 35.00, category: 'americas', airline: 'Copa' },
  { name: 'Alaska Airlines', abbrev: 'AS', defaultPrice: 38.00, category: 'americas', airline: 'Alaska' },
  { name: 'Southwest Rapid Rewards', abbrev: 'SW', defaultPrice: 35.00, category: 'americas', airline: 'Southwest' },
  { name: 'Aerolíneas Argentinas', abbrev: 'AR', defaultPrice: 30.00, category: 'americas', airline: 'Aerolíneas' },
  { name: 'LifeMiles', abbrev: 'LM', defaultPrice: 35.00, category: 'americas', airline: 'Avianca' },
];

// Europa
export const CIAS_EUROPA: ProgramInfo[] = [
  { name: 'Flying Blue', abbrev: 'FB', defaultPrice: 40.00, category: 'europa', airline: 'Air France/KLM' },
  { name: 'British Executive Club', abbrev: 'BA', defaultPrice: 45.00, category: 'europa', airline: 'British Airways' },
  { name: 'Lufthansa', abbrev: 'LH', defaultPrice: 45.00, category: 'europa', airline: 'Lufthansa' },
  { name: 'Ibéria', abbrev: 'IB', defaultPrice: 70.00, category: 'europa', airline: 'Iberia' },
  { name: 'Air Europa SUMA', abbrev: 'SU', defaultPrice: 35.00, category: 'europa', airline: 'Air Europa' },
  { name: 'Finnair Plus', abbrev: 'AY', defaultPrice: 40.00, category: 'europa', airline: 'Finnair' },
  { name: 'Miles&Smiles Turkish', abbrev: 'TK', defaultPrice: 42.00, category: 'europa', airline: 'Turkish' },
  { name: 'Volare ITA Airways', abbrev: 'AZI', defaultPrice: 38.00, category: 'europa', airline: 'ITA Airways' },
  { name: 'Flying Club', abbrev: 'VS', defaultPrice: 40.00, category: 'europa', airline: 'Virgin Atlantic' },
];

// Oriente Médio & Oceania
export const CIAS_ASIA: ProgramInfo[] = [
  { name: 'Emirates Skywards', abbrev: 'EK', defaultPrice: 55.00, category: 'asia', airline: 'Emirates' },
  { name: 'Qatar Privilege Club', abbrev: 'QR', defaultPrice: 50.00, category: 'asia', airline: 'Qatar Airways' },
  { name: 'Etihad Guest', abbrev: 'EY', defaultPrice: 50.00, category: 'asia', airline: 'Etihad' },
  { name: 'Saudia Al Fursan', abbrev: 'SV', defaultPrice: 45.00, category: 'asia', airline: 'Saudia' },
  { name: 'Qantas', abbrev: 'QF', defaultPrice: 48.00, category: 'asia', airline: 'Qantas' },
];

// Redes de Hotéis
export const REDES_HOTEIS: ProgramInfo[] = [
  { name: 'All Accor', abbrev: 'AC', defaultPrice: 25.00, category: 'hotels' },
  { name: 'Marriott Bonvoy', abbrev: 'MB', defaultPrice: 35.00, category: 'hotels' },
  { name: 'Hilton Honors', abbrev: 'HH', defaultPrice: 30.00, category: 'hotels' },
  { name: 'World of Hyatt', abbrev: 'WH', defaultPrice: 40.00, category: 'hotels' },
  { name: 'IHG', abbrev: 'IHG', defaultPrice: 28.00, category: 'hotels' },
  { name: 'Meliã', abbrev: 'ML', defaultPrice: 25.00, category: 'hotels' },
];

// Combustíveis & Varejo
export const COMBUSTIVEIS_VAREJO: ProgramInfo[] = [
  { name: 'Km de Vantagens', abbrev: 'KM', defaultPrice: 25.00, category: 'outros' },
  { name: 'Shell Box', abbrev: 'SH', defaultPrice: 25.00, category: 'outros' },
  { name: 'Premmia', abbrev: 'PM', defaultPrice: 25.00, category: 'outros' },
  { name: 'Ale', abbrev: 'ALE', defaultPrice: 25.00, category: 'outros' },
  { name: 'GPA', abbrev: 'GPA', defaultPrice: 25.00, category: 'outros' },
];

// Clubes & Outros
export const CLUBES_OUTROS: ProgramInfo[] = [
  { name: '+Mengão', abbrev: 'FLA', defaultPrice: 30.00, category: 'outros' },
];

// All programs combined
export const ALL_PROGRAMS: ProgramInfo[] = [
  ...PROGRAMAS_PONTOS,
  ...BANCOS_CARTOES,
  ...CIAS_BRASIL,
  ...CIAS_AMERICAS,
  ...CIAS_EUROPA,
  ...CIAS_ASIA,
  ...REDES_HOTEIS,
  ...COMBUSTIVEIS_VAREJO,
  ...CLUBES_OUTROS,
];

// Programs grouped by category for UI display
export const PROGRAMS_BY_CATEGORY = {
  pontos: { title: 'Programas de Pontos', programs: PROGRAMAS_PONTOS },
  bancos: { title: 'Bancos & Cartões', programs: BANCOS_CARTOES },
  brasil: { title: 'Cias Aéreas Brasil', programs: CIAS_BRASIL },
  americas: { title: 'Américas', programs: CIAS_AMERICAS },
  europa: { title: 'Europa', programs: CIAS_EUROPA },
  asia: { title: 'Oriente Médio & Oceania', programs: CIAS_ASIA },
  hotels: { title: 'Redes de Hotéis', programs: REDES_HOTEIS },
  outros: { title: 'Combustíveis, Varejo & Outros', programs: [...COMBUSTIVEIS_VAREJO, ...CLUBES_OUTROS] },
};

// Get program info by name
export function getProgramInfo(name: string): ProgramInfo | undefined {
  return ALL_PROGRAMS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

// Get abbreviation for a program
export function getProgramAbbrev(name: string): string {
  const program = getProgramInfo(name);
  return program?.abbrev || name.substring(0, 2).toUpperCase();
}

// Programs that can receive transfers (destination programs)
export const TRANSFER_DESTINATIONS = [
  ...CIAS_BRASIL,
  ...CIAS_AMERICAS,
  ...CIAS_EUROPA,
  ...CIAS_ASIA,
];

// Programs that can send transfers (source programs - typically points programs)
export const TRANSFER_SOURCES = [
  ...PROGRAMAS_PONTOS,
  ...BANCOS_CARTOES,
];

// Legacy aliases for backward compatibility
export const LEGACY_PROGRAM_ALIASES: Record<string, string> = {
  'TudoAzul': 'Azul Fidelidade',
  'Latam': 'LatamPass',
  'LATAM': 'LatamPass',
  'TAP': 'TAP Miles&Go',
  'British Airways': 'British Executive Club',
  'Accor ALL': 'All Accor',
  'Qatar Privilege': 'Qatar Privilege Club',
  'SUMA': 'Air Europa SUMA',
  'MileagePlus': 'United Airlines',
  'Nubank Rewards': 'Nubank Ultravioleta',
  'Curtai – BRB': 'Curtaí',
  'IHG One Rewards': 'IHG',
  'MeliaRewards': 'Meliã',
};

// Resolve legacy program name to current name
export function resolveProgramName(name: string): string {
  return LEGACY_PROGRAM_ALIASES[name] || name;
}
