-- Table 1: program_cpf_limits - Stores default CPF limits per program (global configuration)
CREATE TABLE public.program_cpf_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_name TEXT NOT NULL UNIQUE,
  default_limit INTEGER NOT NULL DEFAULT 10,
  renewal_type TEXT NOT NULL DEFAULT 'ano_civil', -- 'ano_civil' | '12_meses'
  renewal_date TEXT, -- '1 de janeiro' para ano_civil, null para 12_meses
  holder_counts BOOLEAN DEFAULT false, -- Se o titular conta no limite
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on program_cpf_limits
ALTER TABLE public.program_cpf_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can read default limits
CREATE POLICY "Anyone can view program cpf limits"
  ON public.program_cpf_limits FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Only admins can insert program cpf limits"
  ON public.program_cpf_limits FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update program cpf limits"
  ON public.program_cpf_limits FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default limits for known programs
INSERT INTO public.program_cpf_limits (program_name, default_limit, renewal_type, renewal_date, holder_counts, notes) VALUES
  ('Smiles', 25, 'ano_civil', '1 de janeiro', false, 'CPF do titular não conta no limite'),
  ('LATAM Pass', 24, '12_meses', NULL, false, 'Renovação 12 meses após primeira emissão'),
  ('Azul Fidelidade', 20, 'ano_civil', '1 de janeiro', false, 'Limite anual'),
  ('TAP Miles&Go', 10, 'ano_civil', '1 de janeiro', false, 'Limite anual'),
  ('AAdvantage', 8, 'ano_civil', '1 de janeiro', true, 'CPF do titular conta no limite'),
  ('MileagePlus', 5, 'ano_civil', '1 de janeiro', false, 'Limite anual');

-- Table 2: user_cpf_limits - Allows users to customize limits per program and holder
CREATE TABLE public.user_cpf_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID NOT NULL REFERENCES public.holders(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  custom_limit INTEGER, -- NULL = use default limit
  period_start DATE, -- Start of counting period (for 12_meses)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, holder_id, program_name)
);

-- Enable RLS
ALTER TABLE public.user_cpf_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cpf limits"
  ON public.user_cpf_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cpf limits"
  ON public.user_cpf_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cpf limits"
  ON public.user_cpf_limits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cpf limits"
  ON public.user_cpf_limits FOR DELETE
  USING (auth.uid() = user_id);

-- Table 3: cpf_usage_records - Records each CPF usage in emissions
CREATE TABLE public.cpf_usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID NOT NULL REFERENCES public.holders(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES public.operations(id) ON DELETE SET NULL,
  program_name TEXT NOT NULL,
  cpf_count INTEGER NOT NULL DEFAULT 1, -- Number of CPFs used in the emission
  emission_date DATE NOT NULL,
  passenger_name TEXT,
  locator TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cpf_usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cpf usage"
  ON public.cpf_usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cpf usage"
  ON public.cpf_usage_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cpf usage"
  ON public.cpf_usage_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cpf usage"
  ON public.cpf_usage_records FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for user_cpf_limits
CREATE TRIGGER update_user_cpf_limits_updated_at
  BEFORE UPDATE ON public.user_cpf_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for program_cpf_limits
CREATE TRIGGER update_program_cpf_limits_updated_at
  BEFORE UPDATE ON public.program_cpf_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();