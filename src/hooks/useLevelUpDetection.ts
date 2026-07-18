import { useState, useEffect, useRef, useCallback } from 'react';
import { getUserLevel, UserLevel } from '@/data/levels';

interface UseLevelUpDetectionProps {
  totalPoints: number;
}

interface UseLevelUpDetectionReturn {
  currentLevel: UserLevel;
  newlyUnlockedLevel: UserLevel | null;
  dismissLevelUp: () => void;
}

export function useLevelUpDetection({ totalPoints }: UseLevelUpDetectionProps): UseLevelUpDetectionReturn {
  const [newlyUnlockedLevel, setNewlyUnlockedLevel] = useState<UserLevel | null>(null);
  const previousLevelRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

  const currentLevel = getUserLevel(totalPoints);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      // Initialize on first load - don't trigger celebration
      previousLevelRef.current = currentLevel.level;
      hasInitializedRef.current = true;
      return;
    }

    // Check if level increased
    if (previousLevelRef.current !== null && currentLevel.level > previousLevelRef.current) {
      setNewlyUnlockedLevel(currentLevel);
    }

    previousLevelRef.current = currentLevel.level;
  }, [currentLevel]);

  const dismissLevelUp = useCallback(() => {
    setNewlyUnlockedLevel(null);
  }, []);

  return {
    currentLevel,
    newlyUnlockedLevel,
    dismissLevelUp,
  };
}
