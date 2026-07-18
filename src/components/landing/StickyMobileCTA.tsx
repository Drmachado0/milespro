import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const StickyMobileCTA = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('floatingCtaDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    const handleScroll = () => {
      // Show after scrolling 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('floatingCtaDismissed', 'true');
  };

  // Don't render on desktop (md+) or if dismissed
  if (isDismissed) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        md:hidden
        transition-transform duration-300 ease-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 pt-4 pb-4">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* CTA Content */}
        <div className="space-y-2">
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base shadow-lg"
          >
Criar Conta Grátis
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sem cartão de crédito • plano grátis
          </p>
        </div>
      </div>
    </div>
  );
};
