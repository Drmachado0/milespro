import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfill IntersectionObserver for jsdom — framer-motion's `useInView` hook
// (and our own `useFadeInOnScroll`) require it. jsdom does not implement it natively.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
  }
  // @ts-expect-error — jsdom polyfill
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

// Polyfill window.matchMedia for jsdom — used by responsive helpers (e.g., the
// IS_MOBILE module-level check in AnimatedSections.tsx). Returns no-op stubs.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  cleanup();
});
