import { useContext } from 'react';
import { CommandPaletteContext } from '@/contexts/commandPalette';

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}
