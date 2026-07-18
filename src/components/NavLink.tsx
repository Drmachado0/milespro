import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { hapticSelection } from "@/lib/haptics";
import { prefetchRoute } from "@/hooks/useIntersectionPrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onClick, ...props }, ref) => {
    const internalRef = useRef<HTMLAnchorElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLAnchorElement>) || internalRef;

    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
      hapticSelection();
      if (onClick) {
        onClick(e);
      }
    }, [onClick]);

    const handlePrefetch = useCallback(() => {
      prefetchRoute(to as string);
    }, [to]);

    // IntersectionObserver for mobile prefetch (no hover events on touch)
    useEffect(() => {
      const element = resolvedRef.current;
      if (!element) return;

      // Only use IntersectionObserver on mobile/touch devices
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isTouchDevice) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Delay prefetch slightly to avoid loading everything at once
              setTimeout(() => prefetchRoute(to as string), 150);
              observer.unobserve(element);
            }
          });
        },
        {
          rootMargin: '100px',
          threshold: 0.1,
        }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, [to, resolvedRef]);

    return (
      <RouterNavLink
        ref={resolvedRef}
        to={to}
        onClick={handleClick}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        className={({ isActive, isPending }) =>
          cn(
            "touch-manipulation select-none active:scale-[0.98] transition-transform duration-75",
            className, 
            isActive && activeClassName, 
            isPending && pendingClassName
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
