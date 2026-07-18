import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    window.gtag = vi.fn();
    window.dataLayer = [];
  });

  it('trackPageView calls gtag', async () => {
    const { trackPageView } = await import('./analytics');
    trackPageView('/pricing', 'Pricing');
    expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({ page_path: '/pricing' }));
  });

  it('trackConversion calls gtag with purchase', async () => {
    const { trackConversion } = await import('./analytics');
    trackConversion({ billing_period: 'monthly', plan_type: 'pro', value: 37.9, currency: 'BRL' });
    expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({ value: 37.9 }));
  });

  it('does not call gtag when unavailable', async () => {
    delete (window as Partial<typeof window>).gtag;
    const { trackPageView } = await import('./analytics');
    expect(() => trackPageView('/test')).not.toThrow();
  });

  it('trackScrollDepth works', async () => {
    window.gtag = vi.fn();
    const { trackScrollDepth } = await import('./analytics');
    trackScrollDepth(50);
    expect(window.gtag).toHaveBeenCalledWith('event', 'scroll', expect.objectContaining({ percent_scrolled: 50 }));
  });
});
