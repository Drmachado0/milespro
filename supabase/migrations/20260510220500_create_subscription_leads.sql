-- Capture subscription interest before manual WhatsApp/payment flow.
-- This keeps the initial sales funnel measurable while payments are still activated manually.
CREATE TABLE IF NOT EXISTS public.subscription_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  email text,
  plan_interest text NOT NULL CHECK (plan_interest IN ('free', 'plus', 'pro')),
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'semiannual', 'annual')),
  source text NOT NULL DEFAULT 'unknown',
  price_label text,
  total_label text,
  whatsapp_sent_at timestamptz,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_leads_created_at ON public.subscription_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_leads_user_id ON public.subscription_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_leads_converted ON public.subscription_leads(converted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_leads_plan_interest ON public.subscription_leads(plan_interest, billing_period);

ALTER TABLE public.subscription_leads ENABLE ROW LEVEL SECURITY;

-- Public insert is intentional: the landing page needs to capture interest before login.
-- Only low-sensitivity lead intent fields are accepted by frontend; admin reads require service/admin workflows later.
DROP POLICY IF EXISTS "Anyone can create subscription leads" ON public.subscription_leads;
CREATE POLICY "Anyone can create subscription leads"
ON public.subscription_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription leads" ON public.subscription_leads;
CREATE POLICY "Users can view their own subscription leads"
ON public.subscription_leads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lead notes" ON public.subscription_leads;
CREATE POLICY "Users can update their own lead notes"
ON public.subscription_leads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_subscription_leads_updated_at ON public.subscription_leads;
CREATE TRIGGER update_subscription_leads_updated_at
BEFORE UPDATE ON public.subscription_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
