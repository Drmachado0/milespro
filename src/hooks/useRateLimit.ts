const STORAGE_KEY = 'login_rate_limit';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutos

interface RateLimitState {
  attempts: number[];
  blockedUntil: number | null;
}

function getState(): RateLimitState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { attempts: [], blockedUntil: null };
}

function setState(state: RateLimitState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cleanOldAttempts(attempts: number[]): number[] {
  const now = Date.now();
  return attempts.filter(timestamp => now - timestamp < WINDOW_MS);
}

export function useRateLimit() {
  const checkCanAttempt = (): boolean => {
    const state = getState();
    const now = Date.now();
    
    // Verificar se está bloqueado
    if (state.blockedUntil && now < state.blockedUntil) {
      return false;
    }
    
    // Se o bloqueio expirou, limpar
    if (state.blockedUntil && now >= state.blockedUntil) {
      setState({ attempts: [], blockedUntil: null });
      return true;
    }
    
    // Limpar tentativas antigas e verificar limite
    const validAttempts = cleanOldAttempts(state.attempts);
    return validAttempts.length < MAX_ATTEMPTS;
  };

  const getRemainingAttempts = (): number => {
    const state = getState();
    
    if (state.blockedUntil && Date.now() < state.blockedUntil) {
      return 0;
    }
    
    const validAttempts = cleanOldAttempts(state.attempts);
    return Math.max(0, MAX_ATTEMPTS - validAttempts.length);
  };

  const getBlockedUntil = (): Date | null => {
    const state = getState();
    
    if (state.blockedUntil && Date.now() < state.blockedUntil) {
      return new Date(state.blockedUntil);
    }
    
    return null;
  };

  const getBlockedMinutesRemaining = (): number => {
    const blockedUntil = getBlockedUntil();
    if (!blockedUntil) return 0;
    
    const remaining = blockedUntil.getTime() - Date.now();
    return Math.ceil(remaining / 60000);
  };

  const recordAttempt = (): void => {
    const state = getState();
    const now = Date.now();
    
    // Se já está bloqueado, não fazer nada
    if (state.blockedUntil && now < state.blockedUntil) {
      return;
    }
    
    // Limpar tentativas antigas e adicionar nova
    const validAttempts = cleanOldAttempts(state.attempts);
    validAttempts.push(now);
    
    // Verificar se deve bloquear
    if (validAttempts.length >= MAX_ATTEMPTS) {
      setState({
        attempts: validAttempts,
        blockedUntil: now + BLOCK_DURATION_MS,
      });
    } else {
      setState({
        attempts: validAttempts,
        blockedUntil: null,
      });
    }
  };

  const reset = (): void => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    canAttempt: checkCanAttempt(),
    remainingAttempts: getRemainingAttempts(),
    blockedUntil: getBlockedUntil(),
    blockedMinutesRemaining: getBlockedMinutesRemaining(),
    recordAttempt,
    reset,
  };
}
