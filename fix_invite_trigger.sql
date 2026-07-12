CREATE OR REPLACE FUNCTION public.process_existing_user_invite()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    r TEXT;
BEGIN
    -- Check if the user already exists in profiles
    SELECT id INTO target_user_id FROM public.profiles WHERE email = new.email LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        -- The user already exists! Immediately give them the admin roles
        FOREACH r IN ARRAY new.roles
        LOOP
            BEGIN
                INSERT INTO public.admins (user_id, email, role) VALUES (target_user_id, new.email, r);
            EXCEPTION WHEN unique_violation THEN
                -- Do nothing
            END;
        END LOOP;
        
        -- Delete the invite since it was successfully processed
        DELETE FROM public.system_invites WHERE email = new.email;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_system_invite_insert ON public.system_invites;
CREATE TRIGGER on_system_invite_insert
AFTER INSERT OR UPDATE ON public.system_invites
FOR EACH ROW EXECUTE FUNCTION public.process_existing_user_invite();
