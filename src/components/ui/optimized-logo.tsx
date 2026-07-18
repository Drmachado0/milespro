import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedLogoProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  disableWebP?: boolean;
  /** Intrinsic pixel width (helps prevent CLS and enables srcset/sizes). */
  width?: number;
  /** Intrinsic pixel height. */
  height?: number;
  /** Responsive sizes attribute, e.g. "(max-width: 640px) 32px, 48px". */
  sizes?: string;
  /** When true, eagerly load with high fetch priority (above-the-fold hero). */
  priority?: boolean;
  /** Called when every fallback in the chain fails to load. */
  onError?: () => void;
}

// Eagerly map every logo asset (webp/png/jpg/svg) so we can build a
// hierarchical fallback chain at render time.
type FormatRegistry = Partial<Record<'webp' | 'png' | 'jpg' | 'svg', string>>;
const assetRegistry: Record<string, FormatRegistry> = {};
{
  const mods = import.meta.glob('@/assets/**/*.{webp,png,jpg,jpeg,svg}', {
    eager: true,
    import: 'default',
    query: '?url',
  }) as Record<string, string>;
  for (const [path, url] of Object.entries(mods)) {
    const file = path.split('/').pop() ?? '';
    const m = file.match(/^(.+)\.(webp|png|jpe?g|svg)$/i);
    if (!m) continue;
    const base = m[1].toLowerCase();
    const ext = m[2].toLowerCase().replace('jpeg', 'jpg') as keyof FormatRegistry;
    (assetRegistry[base] ||= {})[ext] = url;
  }
}

// Extract original basename from any URL form (dev path or hashed prod URL).
const baseNameFromUrl = (url: string): string | null => {
  const file = url.split('/').pop()?.split('?')[0] ?? '';
  const m = file.match(/^(.+?)(?:[-.][A-Za-z0-9_]{6,})?\.(?:webp|png|jpe?g|svg)$/i);
  return m ? m[1].toLowerCase() : null;
};

/** Returns true when at least one image format is registered for the given src. */
export function hasLogoAsset(src: string): boolean {
  const base = baseNameFromUrl(src);
  if (!base) return false;
  const reg = assetRegistry[base];
  return !!reg && Object.keys(reg).length > 0;
}

export function OptimizedLogo({
  src,
  alt,
  className,
  fallbackSrc,
  containerClassName,
  disableWebP = false,
  width,
  height,
  sizes,
  priority = false,
  onError,
}: OptimizedLogoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const loadingAttr = priority ? 'eager' : 'lazy';
  const fetchPriorityAttr = priority ? 'high' : 'low';
  const fetchPriorityProps: Record<string, string> = {
    fetchpriority: fetchPriorityAttr,
  };

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    }
  }, [fallbackSrc, currentSrc, onError]);

  // Build hierarchical fallback chain: webp → png → jpg → svg, plus original src.
  const base = baseNameFromUrl(src);
  const reg = (base && assetRegistry[base]) || {};
  const webpSrc = !disableWebP ? reg.webp ?? null : null;
  const pngSrc = reg.png ?? null;
  const jpgSrc = reg.jpg ?? null;
  const svgSrc = reg.svg ?? null;
  // Best non-webp fallback for <img src>: prefer original src, then registry.
  const baseImgSrc = currentSrc || pngSrc || jpgSrc || svgSrc || src;

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          containerClassName
        )}
        aria-label={alt}
      >
        <svg 
          className={cn('w-1/2 h-1/2 opacity-50', className)} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton/blur loading state */}
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/70 to-muted',
            'rounded-inherit'
          )}
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
      
      {/* Hierarchical fallback chain: webp → png → jpg → svg/original */}
      <picture>
        {webpSrc && <source srcSet={webpSrc} type="image/webp" sizes={sizes} />}
        {pngSrc && pngSrc !== baseImgSrc && (
          <source srcSet={pngSrc} type="image/png" sizes={sizes} />
        )}
        {jpgSrc && jpgSrc !== baseImgSrc && (
          <source srcSet={jpgSrc} type="image/jpeg" sizes={sizes} />
        )}
        {svgSrc && svgSrc !== baseImgSrc && (
          <source srcSet={svgSrc} type="image/svg+xml" sizes={sizes} />
        )}
        <img
          src={baseImgSrc}
          alt={alt}
          loading={loadingAttr}
          decoding="async"
          {...fetchPriorityProps}
          width={width}
          height={height}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
        />
      </picture>
    </div>
  );
}

// Add shimmer keyframes to global styles via CSS-in-JS
const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'optimized-logo-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyles;
    document.head.appendChild(style);
  }
}
