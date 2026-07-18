import { MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { NavItem, NavGroup } from '@/config/sidebarNavigation';

interface SidebarFixedGroupProps {
  group: NavGroup;
  groupIndex: number;
  isGroupActive: boolean;
  collapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  alertCount: number;
  overdueCount: number;
  hasCritical: boolean;
  handleRipple: (e: MouseEvent<HTMLDivElement>) => void;
  location: ReturnType<typeof useLocation>;
}

export function SidebarFixedGroup({ 
  group, 
  groupIndex, 
  isGroupActive, 
  collapsed, 
  isMobile, 
  t, 
  alertCount,
  overdueCount,
  hasCritical,
  handleRipple,
  location,
}: SidebarFixedGroupProps) {
  const isItemActive = (item: NavItem) => location.pathname === item.to;

  return (
    <div 
      data-group-key={group.titleKey}
      className={cn(
        isMobile ? "mb-1" : "mb-2",
        groupIndex > 0 && (isMobile ? "mt-3 pt-3 border-t border-border/50" : "mt-4 pt-3 border-t border-border")
      )}
    >
      {!collapsed && !group.hideTitle && group.titleIcon && (
        <div className={cn(
          "flex items-center gap-2 rounded-md mx-3 transition-colors duration-200 ease-out",
          isMobile ? "mb-1.5 px-3 py-2" : "mb-2 px-3 py-1.5",
          isGroupActive && "bg-primary/10"
        )}>
          <group.titleIcon className={cn(
            "transition-colors duration-200 w-5 h-5",
            isGroupActive ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "font-semibold tracking-wide transition-colors duration-200 text-sm",
            isGroupActive ? "text-primary" : "text-foreground"
          )}>
            {t(group.titleKey)}
          </span>
        </div>
      )}
      {collapsed && groupIndex > 0 && <div className="mx-2 mb-2 border-t border-border" />}
      <div className={cn(isMobile ? "space-y-0.5 px-3" : "space-y-0.5 px-2")}>
        {group.items.map((item) => {
          const isAlertas = item.to === '/alertas';
          const isBonusPendentes = item.to === '/gestao/bonus-pendentes';
          const showAlertBadge = isAlertas && alertCount > 0;
          const showBonusBadge = isBonusPendentes && overdueCount > 0;
          const showBadge = showAlertBadge || showBonusBadge;
          const badgeCount = isAlertas ? alertCount : overdueCount;
          const ItemIcon = item.icon;
          const active = isItemActive(item);
          const itemLabel = t(item.labelKey);
          
          const navLinkContent = (
            <div
              className="relative overflow-hidden rounded-lg"
              onClick={handleRipple}
            >
              <NavLink
                to={item.to}
                end={item.end}
                className={cn(
                  'group flex items-center gap-3 rounded-lg font-medium relative',
                  'transition-all duration-200 ease-out',
                  'text-muted-foreground hover:text-foreground',
                  isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
                  collapsed && 'justify-center px-2',
                  active 
                    ? 'bg-primary/10 text-primary shadow-sm' 
                    : 'hover:bg-accent/50'
                )}
                activeClassName="bg-primary/10 text-primary"
              >
                <div className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-200 ease-out",
                  isMobile ? "w-[4px]" : "w-[3px]",
                  active ? (isMobile ? "h-6 opacity-100" : "h-5 opacity-100") : "h-0 opacity-0"
                )} />
                
                <div className="relative">
                  <ItemIcon className={cn(
                    "flex-shrink-0 transition-colors duration-200 w-5 h-5",
                    active && "text-primary"
                  )} />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </div>
                {!collapsed && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className={cn(
                      "flex-1 transition-colors duration-200",
                      active && "font-semibold"
                    )}>{itemLabel}</span>
                    {showBadge && (
                      <Badge 
                        variant="destructive" 
                        className={cn(
                          "px-1.5 text-xs",
                          isMobile ? "h-6 min-w-6" : "h-5 min-w-5",
                          showBonusBadge && "bg-warning hover:bg-warning",
                          isAlertas && hasCritical && "animate-pulse"
                        )}
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </Badge>
                    )}
                  </div>
                )}
              </NavLink>
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>
                  {navLinkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium animate-scale-in">
                  {itemLabel}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.to}>{navLinkContent}</div>;
        })}
      </div>
    </div>
  );
}
