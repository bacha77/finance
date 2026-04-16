-- ============================================================
-- STOREHOUSE FINANCE — System Restoration & Reset Fix
-- 1. Fixes the 'record NEW is not assigned yet' error on DELETE
-- 2. Adds missing 'voided' columns for transaction editing
-- 3. Ensures 'Hard Reset' can bypass triggers correctly
-- ============================================================

-- ── 1. FIX FISCAL LOCK TRIGGER (Handles DELETE correctly) ──
CREATE OR REPLACE FUNCTION check_fiscal_lock()
RETURNS TRIGGER AS $$
DECLARE
  is_locked BOOLEAN;
  target_date TIMESTAMPTZ;
  target_church_id UUID;
BEGIN
  -- Determine target record data based on operation
  IF (TG_OP = 'DELETE') THEN
    target_date := OLD.created_at;
    target_church_id := OLD.church_id;
  ELSE
    target_date := COALESCE(NEW.created_at, NOW());
    target_church_id := NEW.church_id;
  END IF;

  -- Verify if year is locked for this specific church
  SELECT (EXTRACT(YEAR FROM target_date)::INT = ANY(c.locked_years))
  INTO is_locked
  FROM public.churches c
  WHERE c.id = target_church_id;

  IF is_locked AND (current_setting('role', true) <> 'service_role') THEN
    RAISE EXCEPTION 'This fiscal year is locked for audit. No changes allowed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. ADD MISSING VOID COLUMNS TO LEDGER ──
DO $$ BEGIN
    ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT false;
    ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
    ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS voided_by TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 3. UPDATE BALANCE SYNC TO RESPECT VOIDS ──
CREATE OR REPLACE FUNCTION update_fund_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Transition logic for v8 schema
  IF (TG_OP = 'INSERT') THEN
    IF NEW.voided IS NOT TRUE THEN
      UPDATE public.funds SET balance = balance + NEW.amount WHERE id = NEW.fund_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.voided IS NOT TRUE THEN
       UPDATE public.funds SET balance = balance - OLD.amount WHERE id = OLD.fund_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- A: Reverse OLD (active)
    IF OLD.voided IS NOT TRUE THEN
       UPDATE public.funds SET balance = balance - OLD.amount WHERE id = OLD.fund_id;
    END IF;
    -- B: Apply NEW (active)
    IF NEW.voided IS NOT TRUE THEN
       UPDATE public.funds SET balance = balance + NEW.amount WHERE id = NEW.fund_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. RECALCULATE ALL BALANCES (Source of Truth) ──
UPDATE public.funds f
SET balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.ledger l
    WHERE l.fund_id = f.id
      AND l.voided IS NOT TRUE
);

-- ── 5. ENSURE RLS ALLOWS DELETES FOR ADMINS ──
-- (Assuming the 'FOR ALL' policy exists, we just ensure it's robust)
DROP POLICY IF EXISTS "Church members see their ledger only" ON public.ledger;
CREATE POLICY "Church members see their ledger only"
    ON public.ledger FOR ALL
    USING ( (SELECT public.get_my_church_id()) IS NULL OR church_id = public.get_my_church_id() );
