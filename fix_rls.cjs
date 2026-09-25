const { Client } = require('pg'); 
require('dotenv').config();

async function run() { 
    const c = new Client({ connectionString: process.env.DIRECT_URL }); 
    await c.connect(); 

    const sql = `
        -- Functions
        CREATE OR REPLACE FUNCTION public.has_role(target_role text)
        RETURNS boolean
        LANGUAGE plpgsql
        STABLE
        AS $$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = requesting_user_id() 
                AND role ILIKE '%' || target_role || '%'
            );
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.is_treasurer()
        RETURNS boolean
        LANGUAGE plpgsql
        STABLE
        AS $$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = requesting_user_id() 
                AND (role ILIKE '%admin%' OR role ILIKE '%assistant%')
            );
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        DECLARE
        is_admin BOOLEAN;
        BEGIN
        -- CHECK FOR ADMIN OR SERVICE ROLE IDENTITY
        SELECT EXISTS (
            SELECT 1 FROM public.admins WHERE user_id = requesting_user_id()
        ) INTO is_admin;

        IF NOT is_admin AND (current_setting('role', true) <> 'service_role') THEN
            RAISE EXCEPTION 'Unauthorized! This function is restricted to system administrators.';
        END IF;

        EXECUTE sql;
        END;
        $$;

        -- Policies
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        CREATE POLICY "Users can view their own profile" 
            ON profiles FOR SELECT 
            USING (id = requesting_user_id() OR church_id = get_my_church_id() OR get_my_church_id() IS NULL);

        DROP POLICY IF EXISTS "Admins can view system invites" ON system_invites;
        CREATE POLICY "Admins can view system invites" 
            ON system_invites FOR SELECT 
            USING (EXISTS (SELECT 1 FROM admins WHERE user_id = requesting_user_id() AND role = 'super_admin'));

        DROP POLICY IF EXISTS "Admins can insert system invites" ON system_invites;
        CREATE POLICY "Admins can insert system invites" 
            ON system_invites FOR INSERT 
            WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = requesting_user_id() AND role = 'super_admin'));

        DROP POLICY IF EXISTS "Admins can update system invites" ON system_invites;
        CREATE POLICY "Admins can update system invites" 
            ON system_invites FOR UPDATE 
            USING (EXISTS (SELECT 1 FROM admins WHERE user_id = requesting_user_id() AND role = 'super_admin'));

        DROP POLICY IF EXISTS "Admins can delete system invites" ON system_invites;
        CREATE POLICY "Admins can delete system invites" 
            ON system_invites FOR DELETE 
            USING (EXISTS (SELECT 1 FROM admins WHERE user_id = requesting_user_id() AND role = 'super_admin'));

    `;

    try {
        await c.query(sql);
        console.log("Successfully updated functions and policies.");
    } catch (e) {
        console.error("Error:", e.message);
    }
    
    await c.end(); 
} 
run();
