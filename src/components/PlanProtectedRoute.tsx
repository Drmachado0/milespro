import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface PlanProtectedRouteProps {
  children: ReactNode;
  requiredPlans?: SubscriptionPlan[];
  redirectTo?: string;
}

export function PlanProtectedRoute({
  children,
  requiredPlans = ['pro'],
  redirectTo = '/assinatura'
}: PlanProtectedRouteProps) {
  const { isLoading, canAccessPro, canAccessVip } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has access based on required plans.
  // Hierarchical: 'free' is open to all; 'pro' grants access to Pro and VIP users;
  // 'vip' is VIP-only. The deleted legacy-mid-tier branch (Plan 02) is replaced by
  // 'pro' per CONTEXT D-01 — old mid-tier semantics == new 'pro'.
  const hasAccess = requiredPlans.some(requiredPlan => {
    if (requiredPlan === 'free') return true;
    if (requiredPlan === 'pro') return canAccessPro;
    if (requiredPlan === 'vip') return canAccessVip;
    return false;
  });

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
