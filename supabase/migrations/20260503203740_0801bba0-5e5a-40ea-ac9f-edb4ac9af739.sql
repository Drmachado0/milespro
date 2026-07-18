-- Enforce that program_accounts.password_encrypted is always either NULL or
-- AES-GCM ciphertext (prefix 'v1:'). This stops the client from bypassing the
-- program-accounts edge function and writing a plaintext password directly.
CREATE OR REPLACE FUNCTION public.enforce_program_account_password_encrypted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.password_encrypted IS NOT NULL
     AND NEW.password_encrypted NOT LIKE 'v1:%' THEN
    RAISE EXCEPTION 'password_encrypted must be encrypted (use the program-accounts edge function)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_program_account_password_encrypted_trg
  ON public.program_accounts;

CREATE TRIGGER enforce_program_account_password_encrypted_trg
BEFORE INSERT OR UPDATE ON public.program_accounts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_program_account_password_encrypted();
