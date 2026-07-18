import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavigationBreadcrumb } from './NavigationBreadcrumb';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileFAB } from './MobileFAB';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Plane } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { hapticSelection } from '@/lib/haptics';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

const SWIPE_THRESHOLD = 50;
const EDGE_THRESHOLD = 30;

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle swipe gestures for mobile menu
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only handle horizontal swipes (not vertical scrolling)
    if (deltaY > Math.abs(deltaX)) return;

    // Swipe right from left edge to open
    if (!mobileMenuOpen && touchStartX.current < EDGE_THRESHOLD && deltaX > SWIPE_THRESHOLD) {
      hapticSelection();
      setMobileMenuOpen(true);
    }
    
    // Swipe left to close when menu is open
    if (mobileMenuOpen && deltaX < -SWIPE_THRESHOLD) {
      hapticSelection();
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <div className="flex min-h-screen bg-background mp-app-shell">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-72 flex flex-col"
          style={{ paddingTop: 'var(--safe-area-inset-top)' }}
        >
          {/* Header fixo */}
          <div className="flex items-center gap-2 h-16 px-4 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">MilesPro</span>
          </div>
          
          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <Sidebar className="w-full border-0" isMobile />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main
          className="flex-1 p-4 lg:p-6 xl:p-8 touch-pan-y"
          style={{
            paddingBottom: 'calc(1rem + 72px + var(--safe-area-inset-bottom))'
          }}
        >
          <div className="max-w-[1600px] mx-auto">
            <NavigationBreadcrumb />
            <div
              key={location.pathname}
              className="animate-fade-in"
            >
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile-only: Material 3 bottom nav + FAB (Android-native pattern) */}
      <MobileBottomNav />
      <MobileFAB />
    </div>
  );
}
