import * as React from "react";

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Enhanced mobile detection hook
 * Detects mobile devices via screen size and user agent
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Use matchMedia for initial check to avoid forced reflow
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

/**
 * Detect tablet devices (between mobile and desktop)
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Use matchMedia for initial check to avoid forced reflow
    const mqlMin = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const mqlMax = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    return mqlMin.matches && mqlMax.matches;
  });

  React.useEffect(() => {
    const mqlMin = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const mqlMax = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    
    const checkTablet = () => {
      setIsTablet(mqlMin.matches && mqlMax.matches);
    };
    
    mqlMin.addEventListener("change", checkTablet);
    mqlMax.addEventListener("change", checkTablet);
    checkTablet();
    
    return () => {
      mqlMin.removeEventListener("change", checkTablet);
      mqlMax.removeEventListener("change", checkTablet);
    };
  }, []);

  return isTablet;
}

/**
 * Detect touch-capable devices
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  React.useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

/**
 * Detect iOS devices specifically
 */
export function useIsIOS() {
  const [isIOS, setIsIOS] = React.useState<boolean>(false);

  React.useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (userAgent.includes('mac') && 'ontouchend' in document);
    setIsIOS(isIOSDevice);
  }, []);

  return isIOS;
}

/**
 * Detect Android devices specifically
 */
export function useIsAndroid() {
  const [isAndroid, setIsAndroid] = React.useState<boolean>(false);

  React.useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsAndroid(/android/.test(userAgent));
  }, []);

  return isAndroid;
}

/**
 * Detect if running as PWA (standalone mode)
 */
export function useIsPWA() {
  const [isPWA, setIsPWA] = React.useState<boolean>(false);

  React.useEffect(() => {
    const standaloneNavigator = window.navigator as StandaloneNavigator;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      standaloneNavigator.standalone === true;
    setIsPWA(isStandalone);
  }, []);

  return isPWA;
}

/**
 * Combined device info hook
 */
export function useDeviceInfo() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTouch = useIsTouchDevice();
  const isIOS = useIsIOS();
  const isAndroid = useIsAndroid();
  const isPWA = useIsPWA();

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isTouch,
    isIOS,
    isAndroid,
    isPWA,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
  };
}
