-- Step 1: Remove old check constraint
ALTER TABLE vip_entries DROP CONSTRAINT IF EXISTS vip_entries_relationship_check;

-- Step 2: Update existing data from 'dependente' to 'convidado'
UPDATE vip_entries SET relationship = 'convidado' WHERE relationship = 'dependente';

-- Step 3: Add new check constraint with updated values
ALTER TABLE vip_entries ADD CONSTRAINT vip_entries_relationship_check CHECK (relationship IN ('titular', 'convidado'));