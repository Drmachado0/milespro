import { Bell, Menu, Search, LogOut, ExternalLink, Gift, AlertTriangle, Star, CheckCircle, Check, User, Settings, CreditCard, Sun, Moon, Monitor, Trophy, Command, ChevronDown } from 'lucide-react';
import { useThemeSync } from '@/hooks/useThemeSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usePromotions } from '@/hooks/usePromotions';
import { PromotionType } from '@/types/promotion';
import { supabase } from '@/integrations/supabase/client';
import { useBadges } from '@/hooks/useBadges';
import { getUserLevel } from '@/data/levels';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { StartTourButton } from '@/components/tour/StartTourButton';
import { useTourContext } from '@/hooks/useTourContext';
import { useQuery } from '@tanstack/react-query';
import { useCommandPalette } from '@/hooks/useCommandPalette';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

const typeIcons: Record<PromotionType, React.ElementType> = {
  warning: AlertTriangle,
  promo: Gift,
  bonus: Star,
  income: CheckCircle,
};

const typeColors: Record<PromotionType, string> = {
  warning: 'text-warning',
  promo: 'text-success',
  bonus: 'text-primary',
  income: 'text-info',
};

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { promotions, loading, readPromotionIds, markAsRead } = usePromotions();
  const { theme, setTheme } = useThemeSync();
  const { totalPoints } = useBadges();
  const { startTour, hasCompletedTour, isActive: isTourActive } = useTourContext();
  const { openCommandPalette } = useCommandPalette();
  const currentLevel = getUserLevel(totalPoints);
  const LevelIcon = currentLevel.icon;

  // Load profile data using React Query for caching
  const { data: profileData } = useQuery({
    queryKey: ['profile', 'current', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const avatarUrl = profileData?.avatar_url || null;
  const profileName = profileData?.full_name || null;

  // Filter unread promotions
  const unreadPromotions = promotions.filter(p => !readPromotionIds.has(p.id));
  const notificationCount = Math.min(unreadPromotions.length, 99);
  const recentPromotions = unreadPromotions.slice(0, 5);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNotificationClick = (promotionId: string, link?: string | null) => {
    // Open link FIRST (synchronously) to avoid popup blocker
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
    // Mark as read AFTER (async, no need to await)
    markAsRead(promotionId);
  };

  const handleViewAll = () => {
    navigate('/alertas');
  };

  const userInitials = profileName
    ? profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const userName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <header
      className="sticky top-0 z-30 h-14 md:h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl px-4 md:px-6 flex items-center gap-3"
      style={{ paddingTop: 'var(--safe-area-inset-top)' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden touch-manipulation"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile-only condensed title so users still know where they are */}
      <h1 className="truncate text-base font-semibold text-foreground md:hidden">{title}</h1>

      {/* Search - opens Command Palette */}
      <div className="hidden md:block relative flex-1 max-w-[380px]">
        <button
          onClick={openCommandPalette}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:border-border-strong focus-visible:outline-none"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar operação, programa, titular…</span>
          <kbd className="pointer-events-none hidden items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">

        {/* User Level — condensed to icon + small level pill */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate('/conquistas')}
                className="hidden h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 sm:inline-flex"
                aria-label={`${currentLevel.name} · ${totalPoints} pontos`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${currentLevel.gradient}`}>
                  <LevelIcon className="h-3 w-3 text-white" />
                </div>
                <span className="tabular-nums">Nv.{currentLevel.level}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span>{currentLevel.name} · {totalPoints} pts · ver conquistas</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Tour Button */}
        {!isTourActive && (
          <TooltipProvider>
            <StartTourButton
              onClick={startTour}
              hasCompletedTour={hasCompletedTour}
              variant="icon"
            />
          </TooltipProvider>
        )}

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Moon className="h-[17px] w-[17px]" />
              ) : theme === 'light' ? (
                <Sun className="h-[17px] w-[17px]" />
              ) : (
                <Monitor className="h-[17px] w-[17px]" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
              <Sun className="h-4 w-4" />
              Claro
              {theme === 'light' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
              <Moon className="h-4 w-4" />
              Escuro
              {theme === 'dark' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
              <Monitor className="h-4 w-4" />
              Sistema
              {theme === 'system' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Notificações"
            >
              <Bell className="h-[17px] w-[17px]" />
              {notificationCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                  aria-hidden="true"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {notificationCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {notificationCount} {notificationCount === 1 ? 'alerta' : 'alertas'}
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {loading && recentPromotions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : recentPromotions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <>
                {recentPromotions.map((promotion) => {
                  const Icon = typeIcons[promotion.type] || Gift;
                  const iconColor = typeColors[promotion.type] || 'text-primary';
                  
                    return (
                      <DropdownMenuItem 
                        key={promotion.id}
                        className="flex items-start gap-3 py-3 cursor-pointer"
                        onClick={() => handleNotificationClick(promotion.id, promotion.link)}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 ${iconColor} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm line-clamp-1">{promotion.title}</span>
                        {promotion.description && (
                          <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5 block">
                            {promotion.description}
                          </span>
                        )}
                        {promotion.source && (
                          <span className="text-xs text-muted-foreground/70 mt-1 block">
                            {promotion.source}
                          </span>
                        )}
                      </div>
                      {promotion.link && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-center justify-center text-primary font-medium"
                  onClick={handleViewAll}
                >
                  Ver todos os alertas
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-muted/40"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-7 w-7 flex-shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-success to-info text-[11px] font-semibold text-white">
                  {userInitials}
                </div>
              )}
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground sm:block">
                {userName}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/assinatura')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
