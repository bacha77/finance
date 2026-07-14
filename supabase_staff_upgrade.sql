-- Add job_title to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
