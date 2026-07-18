-- Create table to track read promotions per user
CREATE TABLE public.user_promotion_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, promotion_id)
);

-- Enable RLS
ALTER TABLE public.user_promotion_reads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reads"
ON public.user_promotion_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark promotions as read"
ON public.user_promotion_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reads"
ON public.user_promotion_reads
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_promotion_reads_user_id ON public.user_promotion_reads(user_id);
CREATE INDEX idx_user_promotion_reads_promotion_id ON public.user_promotion_reads(promotion_id);