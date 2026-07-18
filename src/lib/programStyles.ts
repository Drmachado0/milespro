/**
 * Cores e gradientes oficiais por programa, compartilhados pelas várias
 * visualizações de dashboard. Mantém uma única fonte de verdade visual.
 */
export type ProgramStyle = {
  color: string;
  gradient: string;
  /** Texto escuro funciona melhor sobre este gradiente. */
  textOnLight?: boolean;
};

export const PROGRAM_STYLES: Record<string, ProgramStyle> = {
  Livelo: { color: '#FF0066', gradient: 'linear-gradient(180deg, #FF2885 0%, #FF0066 100%)' },
  Smiles: { color: '#FF6A00', gradient: 'linear-gradient(180deg, #FF7E1B 0%, #FF6A00 100%)' },
  LatamPass: { color: '#ED1C24', gradient: 'linear-gradient(180deg, #F23A40 0%, #ED1C24 100%)' },
  'Latam Pass': { color: '#ED1C24', gradient: 'linear-gradient(180deg, #F23A40 0%, #ED1C24 100%)' },
  TudoAzul: { color: '#2BB7F6', gradient: 'linear-gradient(180deg, #45C5FF 0%, #2BB7F6 100%)', textOnLight: true },
  'Azul Fidelidade': { color: '#003DA5', gradient: 'linear-gradient(180deg, #0653B8 0%, #003DA5 100%)' },
  Esfera: { color: '#6B3FA0', gradient: 'linear-gradient(180deg, #7E4FB8 0%, #6B3FA0 100%)' },
  'Itaú Pontos': { color: '#EC7000', gradient: 'linear-gradient(180deg, #FF8418 0%, #EC7000 100%)' },
  'Mastercard Surpreenda': { color: '#0A1F44', gradient: 'linear-gradient(180deg, #1A335E 0%, #0A1F44 100%)' },
};

export const DEFAULT_PROGRAM_STYLE: ProgramStyle = {
  color: '#6B6E7A',
  gradient: 'linear-gradient(180deg, #8B8E9A 0%, #6B6E7A 100%)',
};

export const getProgramStyle = (name: string): ProgramStyle =>
  PROGRAM_STYLES[name] ?? DEFAULT_PROGRAM_STYLE;
