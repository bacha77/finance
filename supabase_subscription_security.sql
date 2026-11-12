-- ─── Subscription & Billing Security Migration ─────────────────────────────
-- Ensures churches can view their own billing invoices and atomically record
-- verified PayPal subscription upgrades while protecting against unauthorized edits.

-- 1. Ensure admin_payments table exists with all required fields
CREATE TABLE IF NOT EXISTS public.admin_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'PayPal',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_payments_church_id ON public.admin_payments(church_id);

ALTER TABLE public.admin_payments ENABLE ROW LEVEL SECURITY;

-- 2. Allow church members/admins to view their own church's invoices in Settings -> Billing
DROP POLICY IF EXISTS "Churches can view their own billing history" ON public.admin_payments;
CREATE POLICY "Churches can view their own billing history"
ON public.admin_payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.church_id = admin_payments.church_id
    )
    OR EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.user_id = auth.uid()
    )
);

-- 3. Secure atomic RPC for recording a subscription payment & updating the church plan
CREATE OR REPLACE FUNCTION public.record_subscription_payment(
    p_church_id UUID,
    p_plan TEXT,
    p_end_date TIMESTAMPTZ,
    p_order_id TEXT,
    p_amount NUMERIC,
    p_method TEXT,
    p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the caller belongs to this church or is a platform admin
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND church_id = p_church_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.admins
        WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized to update subscription for this church';
    END IF;

    -- Validate plan identifier
    IF p_plan NOT IN ('trial', 'starter', 'growth', 'enterprise') THEN
        RAISE EXCEPTION 'Invalid subscription plan: %', p_plan;
    END IF;

    -- 1. Update church subscription status
    UPDATE public.churches
    SET
        plan = p_plan,
        subscription_end_date = p_end_date,
        paypal_order_id = p_order_id,
        cancel_at_period_end = false
    WHERE id = p_church_id;

    -- 2. Insert invoice record if not already logged for this order ID
    IF p_amount > 0 AND (
        p_order_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.admin_payments
            WHERE church_id = p_church_id
              AND notes ILIKE '%' || p_order_id || '%'
        )
    ) THEN
        INSERT INTO public.admin_payments (church_id, amount, payment_method, notes, created_by)
        VALUES (p_church_id, p_amount, COALESCE(p_method, 'PayPal'), p_notes, auth.uid());
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_subscription_payment(UUID, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

