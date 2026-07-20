import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ir-report-banner-dismissed-v2';

export function IRReportBanner() {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if we're in IR season (January - April)
  const currentMonth = new Date().getMonth(); // 0-indexed
  const isIRSeason = currentMonth >= 0 && currentMonth <= 3; // Jan (0) to Apr (3)
  const currentYear = new Date().getFullYear();

  // Check dismissal on mount only
  useEffect(() => {
    const dismissedYear = localStorage.getItem(STORAGE_KEY);
    if (dismissedYear === currentYear.toString()) setIsDismissed(true);
  }, [currentYear]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, currentYear.toString());
    setIsDismissed(true);
  };

  const handleNavigate = () => {
    navigate('/relatorios?type=tax');
  };

  // Don't render if dismissed or outside IR season
  if (isDismissed || !isIRSeason) {
    return null;
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-white/[0.07] bg-[hsl(var(--mp-surface-2))] shadow-flat",
        "animate-fade-in"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

      <CardContent className="relative p-4 sm:p-6">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-start gap-4 pr-10 sm:flex-row sm:items-center sm:gap-5">
          {/* Icon */}
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="max-w-2xl flex-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Seu relatório de imposto de renda está pronto para gerar
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Gere seu relatório com todos os dados de compra e venda de milhas para sua declaração de IR {currentYear}.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleNavigate}
            size="lg"
            className="group w-full shrink-0 sm:w-auto"
          >
            Gerar Relatório IR
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
