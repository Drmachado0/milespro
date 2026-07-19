import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, ArrowRight, ClipboardList } from 'lucide-react';
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
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) setIsDismissed(true);
  }, []);

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
        "relative overflow-hidden border-0 shadow-lg",
        "bg-gradient-to-r from-info via-info to-info",
        "animate-fade-in"
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <CardContent className="relative p-4 sm:p-6">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
            <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 shrink-0" />
              Relatório para Imposto de Renda
            </h3>
            <p className="text-sm sm:text-base text-white/90">
              Gere seu relatório com todos os dados de compra e venda de milhas para sua declaração de IR {currentYear}.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleNavigate}
            size="lg"
            className="w-full sm:w-auto bg-white text-info hover:bg-white/90 font-semibold shadow-md group"
          >
            Gerar Relatório IR
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
