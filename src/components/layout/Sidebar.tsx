import { useState, useMemo, useEffect, useCallback, MouseEvent, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plane, ChevronLeft, ChevronRight, Search, X, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { useUnifiedAlertCount } from '@/hooks/useUnifiedAlertCount';
import { useOverdueBonusesCount } from '@/hooks/useOverdueBonusesCount';
import { useLocalization } from '@/hooks/useLocalization';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useProductTier } from '@/hooks/useProductTier';

import { NavItem, NavGroup, getNavGroups, filterNavGroupsByPlan } from '@/config/sidebarNavigation';
import { SidebarNavGroup, SidebarFixedGroup, SidebarUserInfo } from './sidebar/index';

type ItemsOrderMap = Record<string, string[]>;

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'milespro:sidebar-collapsed';

export function Sidebar({ className, isMobile = false }: SidebarProps) {
  // Hidrata o estado do colapso a partir do localStorage (SSR-safe)
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setCollapsed = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const value = typeof next === 'function' ? (next as (p: boolean) => boolean)(prev) : next;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0');
      } catch {
        // localStorage indisponível (modo privado) — apenas mantém em memória
      }
      return value;
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<{ 
    full_name: string | null; 
    avatar_url: string | null; 
    sidebar_order: string[] | null;
    sidebar_items_order: ItemsOrderMap | null;
  } | null>(null);
  const [orderedGroups, setOrderedGroups] = useState<NavGroup[]>([]);
  const [itemsOrder, setItemsOrder] = useState<ItemsOrderMap>({});
  const [isOrderLoaded, setIsOrderLoaded] = useState(false);
  const [visibleSection, setVisibleSection] = useState<string>('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveItemsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  
  const { total: alertCount, hasCritical } = useUnifiedAlertCount();
  const { overdueCount } = useOverdueBonusesCount();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { plan, canAccessPro, canAccessVip, isLoading: subscriptionLoading } = useSubscription();
  const { productTier } = useProductTier();
  const location = useLocation();

  // Build the nav for this product tier (starter/pro/agency), then apply
  // subscription-tier locking on top. The two axes are orthogonal: product_tier
  // decides WHICH groups exist; plan decides which items inside them are locked.
  const baseNavGroups = useMemo(() => {
    const groups = getNavGroups(productTier);
    return filterNavGroupsByPlan(groups, canAccessPro, canAccessVip);
  }, [productTier, canAccessPro, canAccessVip]);

  // Separate fixed groups from reorderable ones
  const { dashboardGroup, systemGroup, reorderableBaseGroups } = useMemo(() => {
    const dashboard = baseNavGroups.find(g => g.hideTitle);
    const system = baseNavGroups.find(g => g.titleKey === 'nav.system');
    const reorderable = baseNavGroups.filter(
      g => !g.hideTitle && g.titleKey !== 'nav.system'
    );
    return { dashboardGroup: dashboard, systemGroup: system, reorderableBaseGroups: reorderable };
  }, [baseNavGroups]);

  // Load saved order from profile
  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.id) {
        setOrderedGroups(reorderableBaseGroups);
        setIsOrderLoaded(true);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, sidebar_order, sidebar_items_order')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserProfile({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          sidebar_order: data.sidebar_order,
          sidebar_items_order: data.sidebar_items_order as ItemsOrderMap | null
        });
        
        // Load group order
        if (data.sidebar_order && data.sidebar_order.length > 0) {
          const orderedKeys = data.sidebar_order;
          const reordered: NavGroup[] = [];
          
          orderedKeys.forEach(key => {
            const group = reorderableBaseGroups.find(g => g.titleKey === key);
            if (group) reordered.push(group);
          });
          
          reorderableBaseGroups.forEach(group => {
            if (!orderedKeys.includes(group.titleKey)) {
              reordered.push(group);
            }
          });
          
          setOrderedGroups(reordered);
        } else {
          setOrderedGroups(reorderableBaseGroups);
        }

        // Load items order
        if (data.sidebar_items_order) {
          setItemsOrder(data.sidebar_items_order as ItemsOrderMap);
        }
      } else {
        setOrderedGroups(reorderableBaseGroups);
      }
      setIsOrderLoaded(true);
    };
    
    loadOrder();
  }, [user?.id, reorderableBaseGroups]);

  // Get ordered items for a group
  const getOrderedItems = useCallback((group: NavGroup): NavItem[] => {
    const savedOrder = itemsOrder[group.titleKey];
    if (!savedOrder || savedOrder.length === 0) {
      return group.items;
    }

    const ordered: NavItem[] = [];
    savedOrder.forEach(labelKey => {
      const item = group.items.find(i => i.labelKey === labelKey);
      if (item) ordered.push(item);
    });

    group.items.forEach(item => {
      if (!savedOrder.includes(item.labelKey)) {
        ordered.push(item);
      }
    });

    return ordered;
  }, [itemsOrder]);

  // Save group order to database with debounce
  const saveGroupOrder = useCallback(async (groups: NavGroup[]) => {
    if (!user?.id) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const orderKeys = groups.map(g => g.titleKey);
      await supabase
        .from('profiles')
        .update({ sidebar_order: orderKeys })
        .eq('id', user.id);
    }, 500);
  }, [user?.id]);

  // Save items order to database with debounce
  const saveItemsOrder = useCallback(async (newItemsOrder: ItemsOrderMap) => {
    if (!user?.id) return;
    
    if (saveItemsTimeoutRef.current) {
      clearTimeout(saveItemsTimeoutRef.current);
    }
    
    saveItemsTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('profiles')
        .update({ sidebar_items_order: newItemsOrder })
        .eq('id', user.id);
    }, 500);
  }, [user?.id]);

  // Handle group reorder
  const handleGroupReorder = useCallback((newOrder: NavGroup[]) => {
    setOrderedGroups(newOrder);
    saveGroupOrder(newOrder);
  }, [saveGroupOrder]);

  // Handle items reorder within a group
  const handleItemsReorder = useCallback((groupKey: string, newOrder: NavItem[]) => {
    const newItemsOrder = {
      ...itemsOrder,
      [groupKey]: newOrder.map(item => item.labelKey)
    };
    setItemsOrder(newItemsOrder);
    saveItemsOrder(newItemsOrder);
  }, [itemsOrder, saveItemsOrder]);

  // Reset to default order
  const resetOrder = useCallback(async () => {
    setOrderedGroups(reorderableBaseGroups);
    setItemsOrder({});
    
    if (user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({ sidebar_order: null, sidebar_items_order: null })
        .eq('id', user.id);
      
      if (!error) {
        toast.success('Menu restaurado para ordem padrão');
      }
    }
  }, [user?.id, reorderableBaseGroups]);

  // Check if order is different from default
  const isCustomOrder = useMemo(() => {
    if (!isOrderLoaded || orderedGroups.length === 0) return false;
    
    const hasCustomGroupOrder = orderedGroups.some((group, index) => 
      group.titleKey !== reorderableBaseGroups[index]?.titleKey
    );
    
    const hasCustomItemsOrder = Object.keys(itemsOrder).length > 0;
    
    return hasCustomGroupOrder || hasCustomItemsOrder;
  }, [orderedGroups, reorderableBaseGroups, isOrderLoaded, itemsOrder]);

  // Filter nav groups based on search query (mobile only)
  const filteredOrderedGroups = useMemo(() => {
    if (!searchQuery.trim() || !isMobile) return orderedGroups;
    
    const query = searchQuery.toLowerCase().trim();
    
    return orderedGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const label = t(item.labelKey).toLowerCase();
          return label.includes(query);
        })
      }))
      .filter(group => group.items.length > 0);
  }, [orderedGroups, searchQuery, isMobile, t]);

  // Check if any item in the group matches the current path exactly
  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => location.pathname === item.to);
  };

  // Find the section that contains the active route
  const getActiveSectionKey = useCallback((): string | null => {
    // Check fixed groups first
    if (dashboardGroup?.items.some(item => location.pathname === item.to)) {
      return dashboardGroup.titleKey;
    }
    if (systemGroup?.items.some(item => location.pathname === item.to)) {
      return systemGroup.titleKey;
    }
    
    // Check reorderable groups
    for (const group of orderedGroups) {
      if (group.items.some(item => location.pathname === item.to)) {
        return group.titleKey;
      }
    }
    
    return null;
  }, [location.pathname, dashboardGroup, systemGroup, orderedGroups]);

  // Use active route as priority, fallback to Intersection Observer
  const displayedSection = useMemo(() => {
    const activeSection = getActiveSectionKey();
    return activeSection || visibleSection;
  }, [getActiveSectionKey, visibleSection]);

  // Ripple effect handler
  const handleRipple = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      requestAnimationFrame(() => {
        const ripple = document.createElement('span');
        ripple.className = 'absolute rounded-full bg-primary/20 animate-ripple pointer-events-none';
        ripple.style.cssText = `left:${x}px;top:${y}px;width:10px;height:10px;transform:translate(-50%,-50%)`;
        
        target.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }, []);

  // Scroll position preservation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    
    const handleScroll = () => {
      scrollPositionRef.current = nav.scrollTop;
    };
    
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position after navigation
  useEffect(() => {
    const nav = navRef.current;
    if (nav && scrollPositionRef.current > 0) {
      requestAnimationFrame(() => {
        nav.scrollTop = scrollPositionRef.current;
      });
    }
  }, [location.pathname]);

  // Intersection Observer for visible section tracking
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || collapsed || isMobile) {
      setVisibleSection('');
      return;
    }
    
    const groupElements = nav.querySelectorAll('[data-group-key]');
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible group
        let mostVisible: { key: string; ratio: number } | null = null;
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const groupKey = entry.target.getAttribute('data-group-key');
            const current = mostVisible;
            if (groupKey && (!current || entry.intersectionRatio > current.ratio)) {
              mostVisible = { key: groupKey, ratio: entry.intersectionRatio };
            }
          }
        });
        
        if (mostVisible) {
          setVisibleSection((mostVisible as { key: string; ratio: number }).key);
        }
      },
      { root: nav, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    
    groupElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [collapsed, isMobile, isOrderLoaded]);

  // Can drag only when not collapsed and not on mobile
  const canDrag = !collapsed && !isMobile;

  return (
    <aside className={cn(
      'flex flex-col border-r border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out',
      !isMobile && 'hidden md:flex',
      isMobile ? 'w-full h-full' : (collapsed ? 'w-16' : 'w-64'),
      className
    )}>
      {/* Logo - hidden on mobile */}
      {!isMobile && (
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-border/60 transition-all duration-200 ease-out',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Plane className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="bg-gradient-hero bg-clip-text text-transparent font-extrabold text-lg tracking-tight">MilesPro</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 transition-colors duration-200',
              collapsed && 'absolute right-0 translate-x-1/2 bg-card border border-border rounded-full z-10 shadow-sm'
            )}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Mobile Search */}
      {isMobile && (
        <div className="px-4 py-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar página..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-base bg-accent/30 border-border/50 focus:bg-background"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {filteredOrderedGroups.reduce((acc, g) => acc + g.items.length, 0)} resultado(s) encontrado(s)
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav ref={navRef} className={cn("flex-1 overflow-y-auto scrollbar-none", isMobile ? "py-2" : "py-4")}>
        {/* Dashboard - Fixed at top */}
        {dashboardGroup && (
          <SidebarFixedGroup
            group={dashboardGroup}
            groupIndex={0}
            isGroupActive={isGroupActive(dashboardGroup.items)}
            collapsed={collapsed}
            isMobile={isMobile}
            t={t}
            alertCount={alertCount}
            overdueCount={overdueCount}
            hasCritical={hasCritical}
            handleRipple={handleRipple}
            location={location}
          />
        )}

        {/* Reorderable groups */}
        {isOrderLoaded && (
          <Reorder.Group 
            axis="y" 
            values={filteredOrderedGroups} 
            onReorder={handleGroupReorder}
            className="list-none"
          >
            {filteredOrderedGroups.map((group, idx) => (
              <SidebarNavGroup
                key={group.titleKey}
                group={group}
                groupIndex={idx + 1}
                isGroupActive={isGroupActive(group.items)}
                collapsed={collapsed}
                isMobile={isMobile}
                t={t}
                canDrag={canDrag}
                alertCount={alertCount}
                overdueCount={overdueCount}
                hasCritical={hasCritical}
                handleRipple={handleRipple}
                location={location}
                orderedItems={getOrderedItems(group)}
                onItemsReorder={handleItemsReorder}
                canAccessPro={canAccessPro}
                canAccessVip={canAccessVip}
              />
            ))}
          </Reorder.Group>
        )}

        {/* System - Fixed at bottom */}
        {systemGroup && (
          <SidebarFixedGroup
            group={systemGroup}
            groupIndex={filteredOrderedGroups.length + 1}
            isGroupActive={isGroupActive(systemGroup.items)}
            collapsed={collapsed}
            isMobile={isMobile}
            t={t}
            alertCount={alertCount}
            overdueCount={overdueCount}
            hasCritical={hasCritical}
            handleRipple={handleRipple}
            location={location}
          />
        )}
      </nav>

      {/* Reset order — sits between nav and user info so it reads as a menu
          personalization control instead of a stray entry floating above the
          first group (sas.txt P3). Only renders when the user has actually
          customized the menu order; hidden when collapsed or on mobile. */}
      {!collapsed && isCustomOrder && !isMobile && (
        <div className="px-4 py-2 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
            onClick={resetOrder}
          >
            <RotateCw className="w-3 h-3 mr-2" />
            Restaurar ordem padrão
          </Button>
        </div>
      )}

      {/* User info */}
      <SidebarUserInfo
        userProfile={userProfile}
        userEmail={user?.email}
        plan={plan}
        planLoading={subscriptionLoading}
        collapsed={collapsed}
        isMobile={isMobile}
      />
    </aside>
  );
}
