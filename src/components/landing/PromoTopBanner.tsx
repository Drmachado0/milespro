import { X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const PromoTopBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('promoTopBannerDismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('promoTopBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-primary text-white text-sm md:text-base px-4 py-2.5 flex items-center justify-center gap-2 relative">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute left-4 p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Fechar banner"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Main content */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="font-medium">🚀 Oferta fundadora: comece grátis e evolua para Plus quando suas milhas já estiverem organizadas</span>
        <button
          onClick={() => navigate('/auth')}
          className="inline-flex items-center gap-1 font-semibold hover:underline transition-all hover:gap-1.5"
        >
          Criar conta grátis
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Close button - right side for mobile */}
      <button
        onClick={handleClose}
        className="absolute right-4 md:hidden p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Fechar banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
