import { MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NavItem, NavGroup, isItemLocked } from '@/config/sidebarNavigation';
import { SidebarNavItem } from './SidebarNavItem';
import { MaterialNavIcon } from '@/components/icons/MaterialNavIcon';

interface SidebarNavGroupProps {
  group: NavGroup;
  groupIndex: number;
  isGroupActive: boolean;
  collapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  canDrag: boolean;
  alertCount: number;
  overdueCount: number;
  hasCritical: boolean;
  handleRipple: (e: MouseEvent<HTMLDivElement>) => void;
  location: ReturnType<typeof useLocation>;
  orderedItems: NavItem[];
  onItemsReorder: (groupKey: string, newOrder: NavItem[]) => void;
  canAccessPro: boolean;
  canAccessVip: boolean;
}

export function SidebarNavGroup({ 
  group, 
  groupIndex, 
  isGroupActive, 
  collapsed, 
  isMobile, 
  t, 
  canDrag,
  alertCount,
  overdueCount,
  hasCritical,
  handleRipple,
  location,
  orderedItems,
  onItemsReorder,
  canAccessPro,
  canAccessVip,
}: SidebarNavGroupProps) {
  const dragControls = useDragControls();

  const isItemActive = (item: NavItem) => location.pathname === item.to;

  return (
    <Reorder.Item
      value={group}
      data-group-key={group.titleKey}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      className={cn(
        isMobile ? "mb-1" : "mb-2",
        groupIndex > 0 && (isMobile ? "mt-3 pt-3 border-t border-border/50" : "mt-4 pt-3 border-t border-border")
      )}
      whileDrag={{ 
        scale: 1.02, 
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        zIndex: 50,
        backgroundColor: "hsl(var(--card))"
      }}
      transition={{ duration: 0.2 }}
    >
      {!collapsed && !group.hideTitle && group.titleIcon && (
        <div className={cn(
          "flex items-center gap-2 rounded-md mx-3 transition-colors duration-200 ease-out group/header",
          isMobile ? "mb-1.5 px-3 py-2" : "mb-2 px-3 py-1.5",
          isGroupActive && "bg-primary/10"
        )}>
          {canDrag && (
            <div
              className="cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/header:opacity-100 transition-opacity duration-200"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <MaterialNavIcon groupKey={group.titleKey} active={isGroupActive} compact />
          <span className={cn(
            "font-semibold tracking-wide transition-colors duration-200 flex-1 text-sm",
            isGroupActive ? "text-primary" : "text-foreground"
          )}>
            {t(group.titleKey)}
          </span>
        </div>
      )}
      {collapsed && groupIndex > 0 && <div className="mx-2 mb-2 border-t border-border" />}
      <div className={cn(isMobile ? "px-3" : "px-2")}>
        <Reorder.Group
          axis="y"
          values={orderedItems}
          onReorder={(newOrder) => onItemsReorder(group.titleKey, newOrder)}
          layoutScroll
          className="space-y-0.5 list-none"
        >
          {orderedItems.map((item) => {
            const isAlertas = item.to === '/alertas';
            const isBonusPendentes = item.to === '/gestao/bonus-pendentes';
            const showAlertBadge = isAlertas && alertCount > 0;
            const showBonusBadge = isBonusPendentes && overdueCount > 0;
            const showBadge = showAlertBadge || showBonusBadge;
            const badgeCount = isAlertas ? alertCount : overdueCount;
            const active = isItemActive(item);
            const itemLabel = t(item.labelKey);
            const locked = isItemLocked(item, canAccessPro, canAccessVip);

            return (
              <SidebarNavItem
                key={item.to}
                item={item}
                collapsed={collapsed}
                isMobile={isMobile}
                active={active}
                showBadge={showBadge}
                badgeCount={badgeCount}
                showBonusBadge={showBonusBadge}
                isAlertas={isAlertas}
                hasCritical={hasCritical}
                itemLabel={itemLabel}
                canDrag={canDrag && !locked}
                handleRipple={handleRipple}
                isLocked={locked}
              />
            );
          })}
        </Reorder.Group>
      </div>
    </Reorder.Item>
  );
}
