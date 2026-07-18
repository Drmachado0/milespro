import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  className?: string;
}

export function CategoryCard({ title, description, icon: Icon, image, className }: CategoryCardProps) {
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl h-64 md:h-72 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        className
      )}
    >
      {/* Background Image */}
      <img 
        src={image} 
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white">
            {title}
          </h3>
        </div>
        <p className="text-sm md:text-base text-white/90 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
