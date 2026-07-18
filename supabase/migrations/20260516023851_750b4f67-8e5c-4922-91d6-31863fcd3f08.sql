SELECT vault.create_secret('6f9dd7a4be583f5fd300f47f724ef8cd535c76c370ef27096ed4e96a4d84f9f8', 'push_cleanup_auth_token');
SELECT vault.create_secret('25e5d517372484302e57387783e3993d4e7dd75bbe949588f1a516c0207b7a54', 'push_vencimento_auth_token');
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM vault.secrets
   WHERE name IN ('push_cleanup_auth_token', 'push_vencimento_auth_token');
  RAISE NOTICE 'vault.secrets push_* count = %', n;
END $$;