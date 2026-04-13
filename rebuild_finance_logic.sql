-- ============================================================
-- STOREHOUSE FINANCE — Financial Math Synchronization Fix
-- Standardizes ledger signs and automates fund balances
-- ============================================================

-- 1. Standardization: Ensure all expenses are negative and all income is positive in ledger
UPDATE public.ledger 
SET amount = -ABS(amount) 
WHERE type IN ('out', 'expense');

UPDATE public.ledger 
SET amount = ABS(amount) 
WHERE type IN ('in', 'revenue');

-- 2. Fixed Sync Function: Simply add the signed amount to the fund balance
CREATE OR REPLACE FUNCTION public.update_fund_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Insert
  IF (TG_OP = 'INSERT') THEN
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE public.funds 
      SET balance = balance + NEW.amount
      WHERE id = NEW.fund_id;
    END IF;
    
  -- Handle Delete
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE public.funds 
      SET balance = balance - OLD.amount
      WHERE id = OLD.fund_id;
    END IF;
    
  -- Handle Update
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If fund changed or amount changed
    IF OLD.fund_id IS NOT NULL THEN
      UPDATE public.funds 
      SET balance = balance - OLD.amount
      WHERE id = OLD.fund_id;
    END IF;
    
    IF NEW.fund_id IS NOT NULL THEN
      UPDATE public.funds 
      SET balance = balance + NEW.amount
      WHERE id = NEW.fund_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger is applied
DROP TRIGGER IF EXISTS tr_ledger_sync ON public.ledger;
CREATE TRIGGER tr_ledger_sync
AFTER INSERT OR UPDATE OR DELETE ON public.ledger
FOR EACH ROW EXECUTE FUNCTION public.update_fund_balance();

-- 4. Final Reconciliation: Recalculate all fund balances from the ledger source of truth
-- This fixes any existing desynchronization immediately
UPDATE public.funds f
SET balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.ledger l
    WHERE l.fund_id = f.id
      AND l.voided IS NOT TRUE
);

-- 5. Add voiding support to the trigger (Optional but good)
-- If we mark something as voided, it should be treated like a deletion for balance purposes
CREATE OR REPLACE FUNCTION public.handle_voided_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.voided IS NOT TRUE AND NEW.voided IS TRUE) THEN
     -- Transitioning to voided: subtract the amount
     IF NEW.fund_id IS NOT NULL THEN
        UPDATE public.funds SET balance = balance - NEW.amount WHERE id = NEW.fund_id;
     END IF;
  ELSIF (OLD.voided IS TRUE AND NEW.voided IS NOT TRUE) THEN
     -- Transitioning back to active: add the amount
     IF NEW.fund_id IS NOT NULL THEN
        UPDATE public.funds SET balance = balance + NEW.amount WHERE id = NEW.fund_id;
     END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ledger_void ON public.ledger;
CREATE TRIGGER tr_ledger_void
BEFORE UPDATE OF voided ON public.ledger
FOR EACH ROW EXECUTE FUNCTION public.handle_voided_ledger();
