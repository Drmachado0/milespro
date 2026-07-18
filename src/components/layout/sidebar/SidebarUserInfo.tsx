import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Crown, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
}

interface SidebarUserInfoProps {
  userProfile: UserProfile | null;
  userEmail?: string;
  plan: 'free' | 'pro' | 'vip';
  /**
   * True while useSubscription() is still resolving. While loading we
   * show a neutral placeholder for the plan badge instead of defaulting
   * to "Gratuito" — see QA audit (sas.txt Bug 2): a VIP/Pro user briefly
   * saw "Gratuito Nv.1" before the subscription query resolved, which
   * looked like a session/state bug.
   */
  planLoading?: boolean;
  collapsed: boolean;
  isMobile: boolean;
}

export function SidebarUserInfo({
  userProfile,
  userEmail,
  plan,
  planLoading = false,
  collapsed,
  isMobile,
}: SidebarUserInfoProps) {
  const getInitials = (name: string | null | undefined) => {
    if (!name) return userEmail?.substring(0, 2).toUpperCase() || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getPlanDisplay = () => {
    switch (plan) {
      case 'vip':
        // VIP = top tier (formerly top-tier label in legacy TS; D-01 mapping).
        return { label: 'VIP', icon: Crown, className: 'bg-warning/20 text-warning' };
      case 'pro':
        // Pro = mid tier (formerly mid-tier label in legacy TS; D-01 mapping).
        return { label: 'Pro', icon: Zap, className: 'bg-primary/20 text-primary' };
      default:
        return { label: 'Gratuito', icon: Star, className: 'bg-muted text-muted-foreground' };
    }
  };

  const planDisplay = getPlanDisplay();

  if (collapsed) {
    return (
      <div className="p-2 border-t border-border flex flex-col items-center gap-2">
        {userProfile?.avatar_url ? (
          <img 
            src={userProfile.avatar_url} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {getInitials(userProfile?.full_name)}
            </span>
          </div>
        )}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors duration-200"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Sair
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div 
      className="p-4 border-t border-border"
      style={{ paddingBottom: isMobile ? 'calc(1rem + var(--safe-area-inset-bottom))' : undefined }}
    >
      <div className="flex items-center gap-3">
        {userProfile?.avatar_url ? (
          <img 
            src={userProfile.avatar_url} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {getInitials(userProfile?.full_name)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {userProfile?.full_name || userEmail || 'Usuário'}
          </p>
          <div className="flex items-center gap-1">
            {planLoading ? (
              // Neutral placeholder while useSubscription() resolves — avoids
              // the "Gratuito" flash for paying users (QA audit sas.txt Bug 2).
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground/60 animate-pulse">
                &nbsp;&nbsp;&nbsp;&nbsp;
              </span>
            ) : (
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", planDisplay.className)}>
                {planDisplay.label}
              </span>
            )}
          </div>
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors duration-200"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Sair
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
