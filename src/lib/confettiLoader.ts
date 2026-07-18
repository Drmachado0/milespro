// Lazy loader for canvas-confetti to reduce initial bundle size
// This library is ~20KB and should only be loaded for celebrations

type ConfettiFn = typeof import('canvas-confetti');
type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

let confettiFn: ConfettiFn | null = null;

export async function loadConfetti() {
  if (!confettiFn) {
    const mod = await import('canvas-confetti');
    confettiFn = mod.default ?? mod;
  }
  return confettiFn;
}

// Fire confetti with lazy loading
export async function fireConfetti(options: import('canvas-confetti').Options) {
  const confetti = await loadConfetti();
  return confetti(options);
}

// Preload confetti when user is close to leveling up
export function preloadConfetti() {
  const idleWindow = window as IdleWindow;

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(() => {
      loadConfetti().catch(() => {});
    });
  } else {
    setTimeout(() => {
      loadConfetti().catch(() => {});
    }, 2000);
  }
}
