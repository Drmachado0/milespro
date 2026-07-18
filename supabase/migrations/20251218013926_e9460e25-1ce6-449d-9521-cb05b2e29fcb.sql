-- Add source_urls column to store custom URLs for each alert source
ALTER TABLE public.user_alert_settings 
ADD COLUMN IF NOT EXISTS source_urls JSONB DEFAULT '{
  "MelhoresCartões": "https://melhorescartoes.com.br",
  "Passageiro de Primeira": "https://passageirodeprimeira.com",
  "Livelo": "https://www.livelo.com.br/promocoes",
  "Melhores Destinos": "https://www.melhoresdestinos.com.br"
}'::jsonb;