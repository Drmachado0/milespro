import { PiggyBank, Plane, TrendingUp, Hotel, LucideIcon } from 'lucide-react';
import { useInView, motion, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface Metric {
  icon: LucideIcon;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

const metrics: Metric[] = [
  { icon: PiggyBank, value: 150000, prefix: '+R$ ', label: 'Economizados pelos nossos usuários' },
  { icon: Plane, value: 450, suffix: '+', label: 'Viagens já planejadas com o MilesPro' },
  { icon: TrendingUp, value: 62, suffix: '%', label: 'De economia média por viagem' },
  { icon: Hotel, value: 20, suffix: '+', label: 'Programas de fidelidade suportados' },
];

const AnimatedCounter = ({ 
  value, 
  prefix = '', 
  suffix = '',
  inView 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  inView: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(easeOutQuart * value);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [inView, value]);

  const formattedValue = displayValue.toLocaleString('pt-BR');

  return (
    <span>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

export const TrustMetricsSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-primary/5 via-muted/40 to-primary/10">
      <div ref={ref} className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {metrics.map((metric, index) => (
            <motion.div 
              key={metric.label}
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors shadow-sm">
                <metric.icon className="w-7 h-7 text-primary" />
              </div>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                <AnimatedCounter 
                  value={metric.value} 
                  prefix={metric.prefix} 
                  suffix={metric.suffix}
                  inView={isInView}
                />
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
