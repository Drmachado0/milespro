-- Renomear vip_quota_annual para vip_quota_titular
ALTER TABLE credit_cards 
  RENAME COLUMN vip_quota_annual TO vip_quota_titular;

-- Adicionar coluna para cota de convidados
ALTER TABLE credit_cards 
  ADD COLUMN vip_quota_convidado integer;

-- Remover coluna de cota mensal (não mais necessária)
ALTER TABLE credit_cards 
  DROP COLUMN IF EXISTS vip_quota_monthly;