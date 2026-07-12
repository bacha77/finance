ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS working_hours TEXT;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
