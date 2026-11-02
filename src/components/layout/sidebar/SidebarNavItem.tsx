import { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Lock } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NavItem } from '@/config/sidebarNavigation';
import { MaterialNavIcon } from '@/components/icons/MaterialNavIcon';

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  isMobile: boolean;
  active: boolean;
  showBadge: boolean;
  badgeCount: number;
  showBonusBadge: boolean;
  isAlertas: boolean;
  hasCritical: boolean;
  itemLabel: string;
  canDrag: boolean;
  handleRipple: (e: MouseEvent<HTMLDivElement>) => void;
  isLocked?: boolean;
}

export function SidebarNavItem({
  item,
  collapsed,
  isMobile,
  active,
  showBadge,
  badgeCount,
  showBonusBadge,
  isAlertas,
  hasCritical,
  itemLabel,
  canDrag,
  handleRipple,
  isLocked = false,
}: SidebarNavItemProps) {
  const dragControls = useDragControls();
  const navigate = useNavigate();

  const handleLockedClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/assinatura');
  };

  const navLinkContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg flex items-center",
        isLocked && "opacity-60"
      )}
      onClick={(e) => {
        if (isLocked) {
          handleLockedClick(e);
        } else {
          handleRipple(e);
        }
      }}
    >
      {canDrag && !collapsed && !isLocked && (
        <div
          className="cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 pl-1"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      {isLocked ? (
        <div
          className={cn(
            'group flex items-center gap-3 rounded-lg font-medium relative flex-1 cursor-pointer',
            'transition-all duration-200 ease-out',
            'text-muted-foreground hover:text-foreground',
            isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
            collapsed && 'justify-center px-2',
            'hover:bg-accent/30'
          )}
        >
          <MaterialNavIcon route={item.to} className="grayscale-[0.35]" />
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1">
              <span className="flex-1 transition-colors duration-200">{itemLabel}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      ) : (
        <NavLink
          to={item.to}
          end={item.end}
          className={cn(
            'group flex items-center gap-3 rounded-lg font-medium relative flex-1',
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
            active ? (isMobile ? "h-6 opacity-100 shadow-[0_0_12px_2px_hsl(var(--primary)/0.45)]" : "h-5 opacity-100 shadow-[0_0_10px_1px_hsl(var(--primary)/0.45)]") : "h-0 opacity-0"
          )} />
          
          <div className="relative">
            <MaterialNavIcon route={item.to} active={active} />
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
      )}
    </div>
  );

  const tooltipLabel = isLocked ? `${itemLabel} (Premium)` : itemLabel;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      className="group/item"
      whileDrag={{ 
        scale: 1.02, 
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        zIndex: 50,
        backgroundColor: "hsl(var(--card))",
        borderRadius: "0.5rem"
      }}
      transition={{ duration: 0.15 }}
    >
      {collapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {navLinkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium animate-scale-in">
            <div className="flex items-center gap-2">
              {tooltipLabel}
              {isLocked && <Lock className="h-3 w-3" />}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        navLinkContent
      )}
    </Reorder.Item>
  );
}
