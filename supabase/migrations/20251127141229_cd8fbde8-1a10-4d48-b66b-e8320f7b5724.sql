-- Tabela de Contas de Programas de Fidelidade
CREATE TABLE public.program_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID REFERENCES public.holders(id) ON DELETE SET NULL,
  program TEXT NOT NULL,
  login TEXT NOT NULL,
  password_encrypted TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Cartões de Crédito
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID REFERENCES public.holders(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  cardholder_name TEXT,
  last_four_digits TEXT,
  expiry_date TEXT,
  billing_day INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Assinaturas de Clube
CREATE TABLE public.club_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID REFERENCES public.holders(id) ON DELETE CASCADE NOT NULL,
  program TEXT NOT NULL,
  points_per_month INTEGER DEFAULT 0,
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  billing_day INTEGER,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_accounts
CREATE POLICY "Users can view their own accounts" ON public.program_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" ON public.program_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON public.program_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" ON public.program_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for credit_cards
CREATE POLICY "Users can view their own cards" ON public.credit_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards" ON public.credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON public.credit_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON public.credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for club_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.club_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" ON public.club_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.club_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON public.club_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_program_accounts_updated_at
  BEFORE UPDATE ON public.program_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_club_subscriptions_updated_at
  BEFORE UPDATE ON public.club_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();