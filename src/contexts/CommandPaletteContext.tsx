import { useState, ReactNode, useCallback } from 'react';
import { CommandPaletteContext } from '@/contexts/commandPalette';

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCommandPalette = useCallback(() => setIsOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsOpen(false), []);
  const toggleCommandPalette = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openCommandPalette, closeCommandPalette, toggleCommandPalette }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
