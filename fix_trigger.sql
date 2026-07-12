CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_church_id UUID;
    target_role TEXT;
    sys_invite public.system_invites%ROWTYPE;
    r TEXT;
BEGIN
    -- Check if this email was invited to a specific church
    SELECT church_id, role INTO target_church_id, target_role 
    FROM public.invites 
    WHERE email = new.email 
    LIMIT 1;

    -- Check system invites
    SELECT * INTO sys_invite FROM public.system_invites WHERE email = new.email LIMIT 1;

    INSERT INTO public.profiles (id, email, full_name, phone, church_id, role)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', sys_invite.first_name, sys_invite.last_name)), ''),
            new.raw_user_meta_data->>'full_name'
        ),
        sys_invite.phone,
        target_church_id, 
        COALESCE(target_role, 'admin')
    );
    
    -- Cleanup used church invites
    IF target_church_id IS NOT NULL THEN
        DELETE FROM public.invites WHERE email = new.email AND church_id = target_church_id;
    END IF;

    -- Insert multiple roles if sys_invite exists
    IF sys_invite.email IS NOT NULL THEN
        -- Insert each role
        FOREACH r IN ARRAY sys_invite.roles
        LOOP
            -- Avoid duplicates if the schema allows it, but basic insert:
            BEGIN
                INSERT INTO public.admins (user_id, email, role) VALUES (new.id, new.email, r);
            EXCEPTION WHEN unique_violation THEN
                -- Do nothing if duplicate
            END;
        END LOOP;
        
        DELETE FROM public.system_invites WHERE email = new.email;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
