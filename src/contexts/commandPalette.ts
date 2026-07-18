import { createContext } from 'react';

export interface CommandPaletteContextType {
  isOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);
