// Google Analytics 4 tracking utilities
// Measurement ID should be set in index.html

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

type BillingPeriod = 'monthly' | 'semiannual' | 'annual';
type PlanType = 'free' | 'pro' | 'agency';

interface PricingEventParams {
  billing_period: BillingPeriod;
  plan_type?: PlanType;
  price?: number;
  currency?: string;
}

interface SignupEventParams {
  method: 'inline_form' | 'cta_button' | 'header_button';
  billing_period?: BillingPeriod;
  plan_selected?: PlanType;
}

interface ConversionEventParams {
  billing_period: BillingPeriod;
  plan_type: PlanType;
  value: number;
  currency: string;
}

// Track page view
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

// Track billing period selection
export const trackBillingPeriodChange = (params: PricingEventParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'select_billing_period', {
      billing_period: params.billing_period,
      plan_type: params.plan_type,
      price: params.price,
      currency: params.currency || 'BRL',
    });
  }
};

// Track plan view (when user sees pricing)
export const trackPlanView = (params: PricingEventParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      items: [{
        item_id: params.plan_type,
        item_name: `Plano ${params.plan_type}`,
        price: params.price,
        currency: params.currency || 'BRL',
      }],
    });
  }
};

// Track CTA click (start signup)
export const trackSignupStart = (params: SignupEventParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      method: params.method,
      billing_period: params.billing_period,
      plan_selected: params.plan_selected,
    });
  }
};

// Track successful signup/conversion
export const trackConversion = (params: ConversionEventParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      value: params.value,
      currency: params.currency,
      items: [{
        item_id: params.plan_type,
        item_name: `Plano ${params.plan_type}`,
        price: params.value,
        quantity: 1,
      }],
      billing_period: params.billing_period,
    });
  }
};

// Track scroll depth on landing page
export const trackScrollDepth = (percentage: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'scroll', {
      percent_scrolled: percentage,
    });
  }
};

// Track section view (for funnel analysis)
export const trackSectionView = (sectionName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_section', {
      section_name: sectionName,
    });
  }
};

// Track FAQ expansion
export const trackFAQExpand = (questionIndex: number, question: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'faq_expand', {
      question_index: questionIndex,
      question_text: question.substring(0, 100),
    });
  }
};

// Track testimonial view
export const trackTestimonialView = (testimonialName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'testimonial_view', {
      testimonial_name: testimonialName,
    });
  }
};

// Track comparison table interaction
export const trackComparisonView = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_comparison', {
      event_category: 'engagement',
    });
  }
};

// Track video demo click
export const trackDemoVideoClick = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'video_start', {
      video_title: 'Demo Dashboard',
    });
  }
};
