import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('pdfLoader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loadPDFLibraries returns jsPDF and autoTable', async () => {
    const { loadPDFLibraries } = await import('./pdfLoader');
    const libs = await loadPDFLibraries();
    expect(libs.jsPDF).toBeDefined();
    expect(libs.autoTable).toBeDefined();
  });

  it('preloadPDFLibraries does not throw', async () => {
    const { preloadPDFLibraries } = await import('./pdfLoader');
    expect(() => preloadPDFLibraries()).not.toThrow();
  });
});
