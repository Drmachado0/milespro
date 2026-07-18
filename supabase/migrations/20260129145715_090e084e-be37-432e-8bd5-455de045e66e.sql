-- Create user_programs table for managing program preferences
CREATE TABLE public.user_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  custom_icon_url TEXT,
  category TEXT DEFAULT 'outros',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, program_name)
);

-- Enable RLS
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own programs"
  ON public.user_programs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own programs"
  ON public.user_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own programs"
  ON public.user_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own programs"
  ON public.user_programs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_programs_updated_at
  BEFORE UPDATE ON public.user_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for program icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('program-icons', 'program-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for program icons
CREATE POLICY "Program icons are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'program-icons');

CREATE POLICY "Users can upload their own program icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'program-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own program icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'program-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own program icons"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'program-icons' AND auth.uid()::text = (storage.foldername(name))[1]);