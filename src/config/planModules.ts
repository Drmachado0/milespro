/**
 * Product-tier feature-flag registry — the single source of truth for WHICH
 * modules each product version unlocks (Starter → Pro → Agency).
 *
 * This is the "plan_features" layer from the product spec. It is decoupled from
 * the billing tier (subscription_plan free/pro/vip): product_tier decides which
 * MODULES exist for a user; subscription_plan decides billing + usage limits.
 *
 * Adding a module = adding one line to MODULE_MIN_TIER. The sidebar, the
 * TierRoute guard, and any in-page gating all read from here.
 */

export type ProductTier = 'free' | 'starter' | 'pro' | 'agency';

// Ordered ladder — each tier is a superset of the previous. Free and Starter
// share the same MODULE set (the personal core); they differ only in usage
// LIMITS (enforced by plan_entitlements / subscription), not in visible modules.
const TIER_RANK: Record<ProductTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  agency: 3,
};

export function tierAtLeast(tier: ProductTier, min: ProductTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

export type ModuleKey =
  // ── Starter (individual) — the personal miles core ─────────────────────────
  | 'accounts' // program accounts / balances
  | 'ownCpf' // register the owner's own CPF (holder = self)
  | 'clubs' // subscription clubs (Smiles, Livelo, etc.)
  | 'creditCards' // credit-card points
  | 'transactions' // personal statement / operations
  | 'priceHistory' // CPM history per program
  | 'milesCalculator' // simulators & strategies
  | 'basicReports' // personal reports
  | 'subscription' // billing / plan management
  // ── Pro (consultor) — managing third parties ───────────────────────────────
  | 'clients' // "Meus Clientes" CRM
  | 'partnerCpfs' // multi-CPF of partners/family (managed accounts)
  | 'clientReports' // per-client profit / CPM reports
  | 'informeRendimentos' // income-tax / earnings statement for a client
  | 'affiliates' // affiliate / operator management
  | 'specializedSupport' // Pro SLA support channel
  | 'travelBooking' // legacy travel-agency ops suite (tickets/hotels/cars/…)*
  // ── Agency (elite) — intelligence + community ──────────────────────────────
  | 'promoEngine' // promotion alerts + detail/summary
  | 'productsByMiles' // catalog of miles redemption examples
  | 'goals' // goals per client/operation
  | 'community' // members community
  | 'course'; // Miles Pro course access

/**
 * Minimum product_tier that unlocks each module.
 *
 * (*) 'travelBooking' is the EXISTING /agencia/* travel-agency operations suite
 * (tickets, hotels, cars, cruises, insurance…). It is a different product from
 * the miles-consulting Pro/Agency spec, parked at 'pro' for now so it stays
 * hidden from Starter — its final Pro-vs-Agency placement is an open decision.
 */
export const MODULE_MIN_TIER: Record<ModuleKey, ProductTier> = {
  // Personal core — available from Free up (Free is capped by limits, not by
  // hidden modules; Starter is the same module set uncapped).
  accounts: 'free',
  ownCpf: 'free',
  clubs: 'free',
  creditCards: 'free',
  transactions: 'free',
  priceHistory: 'free',
  milesCalculator: 'free',
  basicReports: 'free',
  subscription: 'free',
  // Pro
  clients: 'pro',
  partnerCpfs: 'pro',
  clientReports: 'pro',
  informeRendimentos: 'pro',
  affiliates: 'pro',
  specializedSupport: 'pro',
  travelBooking: 'pro',
  // Agency
  promoEngine: 'agency',
  productsByMiles: 'agency',
  goals: 'agency',
  community: 'agency',
  course: 'agency',
};

export function canAccessModule(tier: ProductTier, moduleKey: ModuleKey): boolean {
  return tierAtLeast(tier, MODULE_MIN_TIER[moduleKey]);
}
