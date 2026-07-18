import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProductTier } from '@/hooks/useProductTier';
import { ProductTier, ModuleKey } from '@/config/planModules';

interface TierRouteProps {
  children: ReactNode;
  /** Gate by a specific product module (preferred — reads MODULE_MIN_TIER). */
  module?: ModuleKey;
  /** Or gate by a minimum tier directly. Ignored when `module` is provided. */
  minTier?: ProductTier;
  redirectTo?: string;
}

/**
 * Route guard for the Starter/Pro/Agency product ladder. Blocks modules above
 * the user's tier and sends them back to the personal dashboard. Orthogonal to
 * PlanProtectedRoute (which gates by billing tier free/pro/vip) — an upper-tier
 * route is typically wrapped by TierRoute alone; add PlanProtectedRoute only
 * when a paid billing tier is ALSO required.
 */
export function TierRoute({
  children,
  module,
  minTier = 'pro',
  redirectTo = '/dashboard',
}: TierRouteProps) {
  const { canAccessModule, hasTier, isLoading } = useProductTier();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allowed = module ? canAccessModule(module) : hasTier(minTier);

  if (!allowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
