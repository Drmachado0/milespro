import { useState } from 'react';
import { cn } from '@/lib/utils';

const aspectRatioClasses = {
  'square': 'aspect-square',
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  'auto': '',
} as const;

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: keyof typeof aspectRatioClasses;
  showPlaceholder?: boolean;
  /** Explicit width for CLS prevention */
  width?: number;
  /** Explicit height for CLS prevention */
  height?: number;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className,
  fallback = '/placeholder.svg',
  aspectRatio = 'auto',
  showPlaceholder = true,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  const wrapperClass = aspectRatio !== 'auto' 
    ? cn('relative overflow-hidden', aspectRatioClasses[aspectRatio])
    : 'relative';

  return (
    <div className={wrapperClass}>
      {showPlaceholder && !loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--shimmer-from))] via-[hsl(var(--shimmer-via))] to-[hsl(var(--shimmer-to))] bg-[length:200%_100%] animate-shimmer rounded" />
      )}
      <img
        src={error ? fallback : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          aspectRatio !== 'auto' && 'absolute inset-0 w-full h-full object-cover',
          className
        )}
        {...props}
      />
    </div>
  );
}
