import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  trackBillingPeriodChange,
  trackSignupStart,
  trackSectionView,
  trackFAQExpand,
  trackComparisonView,
} from '@/lib/analytics';

type BillingPeriod = 'monthly' | 'semiannual' | 'annual';
type PlanType = 'free' | 'pro' | 'agency';

export const useAnalytics = () => {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  // Track billing period selection
  const trackBillingChange = useCallback((
    billingPeriod: BillingPeriod,
    planType?: PlanType,
    price?: number
  ) => {
    trackBillingPeriodChange({
      billing_period: billingPeriod,
      plan_type: planType,
      price,
      currency: 'BRL',
    });
  }, []);

  // Track CTA clicks
  const trackCTAClick = useCallback((
    method: 'inline_form' | 'cta_button' | 'header_button',
    billingPeriod?: BillingPeriod,
    planSelected?: PlanType
  ) => {
    trackSignupStart({
      method,
      billing_period: billingPeriod,
      plan_selected: planSelected,
    });
  }, []);

  // Track section visibility
  const trackSection = useCallback((sectionName: string) => {
    trackSectionView(sectionName);
  }, []);

  // Track FAQ interaction
  const trackFAQ = useCallback((index: number, question: string) => {
    trackFAQExpand(index, question);
  }, []);

  // Track comparison section view
  const trackComparison = useCallback(() => {
    trackComparisonView();
  }, []);

  return {
    trackBillingChange,
    trackCTAClick,
    trackSection,
    trackFAQ,
    trackComparison,
  };
};
