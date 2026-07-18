-- Create user_alert_settings table for centralized alert configuration
CREATE TABLE public.user_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  alerts_enabled BOOLEAN DEFAULT true,
  fetch_interval INTEGER DEFAULT 30,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  sound_enabled BOOLEAN DEFAULT true,
  enabled_sources TEXT[] DEFAULT ARRAY['MelhoresCartões', 'Passageiro de Primeira', 'Livelo', 'Melhores Destinos'],
  enabled_types TEXT[] DEFAULT ARRAY['promo', 'bonus', 'warning', 'income'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own alert settings"
ON public.user_alert_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert settings"
ON public.user_alert_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings"
ON public.user_alert_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert settings"
ON public.user_alert_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Add last_notified_at to price_alerts for notification cooldown
ALTER TABLE public.price_alerts 
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ DEFAULT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_user_alert_settings_updated_at
BEFORE UPDATE ON public.user_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();