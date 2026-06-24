-- =======================================================
-- Migration: Phase B.2 Auth Onboarding Triggers
-- Path: supabase/migrations/20260622000002_phase_b2_auth_triggers.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Refactor core.member Table Schema (Subtyping)
-- -------------------------------------------------------

-- Drop foreign keys and indexes pointing to core.member first
ALTER TABLE core.member_season_assignment DROP CONSTRAINT IF EXISTS member_season_assignment_member_id_fkey;
DROP INDEX IF EXISTS core.idx_unique_resident_member;

-- Alter core.member to drop name, phone, and resident_id columns
ALTER TABLE core.member DROP COLUMN IF EXISTS name;
ALTER TABLE core.member DROP COLUMN IF EXISTS phone;
ALTER TABLE core.member DROP COLUMN IF EXISTS resident_id;

-- Make core.member.id a foreign key to core.resident(id)
ALTER TABLE core.member ADD CONSTRAINT member_id_fkey FOREIGN KEY (id) REFERENCES core.resident(id) ON DELETE CASCADE;

-- Re-add the foreign key constraint from core.member_season_assignment to core.member
ALTER TABLE core.member_season_assignment 
    ADD CONSTRAINT member_season_assignment_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES core.member(id) ON DELETE CASCADE;

-- -------------------------------------------------------
-- 2. Redesign core.user_account Table Schema
-- -------------------------------------------------------

-- Drop old RLS policies for user_account
DROP POLICY IF EXISTS select_own_user_account ON core.user_account;
DROP POLICY IF EXISTS admin_modify_user_accounts ON core.user_account;

-- Alter core.user_account to support phone and auth_user_id
ALTER TABLE core.user_account DROP COLUMN IF EXISTS email;
ALTER TABLE core.user_account ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE NOT NULL;
ALTER TABLE core.user_account ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate RLS Policies using auth_user_id and role from JWT
CREATE POLICY select_own_user_account ON core.user_account
    FOR SELECT USING (
        auth_user_id = auth.uid()
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

CREATE POLICY admin_modify_user_accounts ON core.user_account
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- -------------------------------------------------------
-- 3. Drop and Recreate Onboarding Trigger Function
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
DROP FUNCTION IF EXISTS core.handle_auth_user_signup();
-- Note: We split declarations and implementation logic cleanly

CREATE OR REPLACE FUNCTION core.handle_auth_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_role text;
    user_name text;
    target_wing_id uuid;
    target_flat_id uuid;
    target_season_id uuid;
    user_occ_type text;
    new_member_id uuid;
    new_resident_id uuid;
BEGIN
    -- Extract parameters from signup json payload
    user_name := NEW.raw_user_meta_data ->> 'name';
    user_role := NEW.raw_user_meta_data ->> 'role';
    target_wing_id := (NEW.raw_user_meta_data ->> 'wing_id')::uuid;
    target_flat_id := (NEW.raw_user_meta_data ->> 'flat_id')::uuid;
    user_occ_type := COALESCE(NEW.raw_user_meta_data ->> 'occupancy_type', 'OWNER');

    -- Validate required fields
    IF NEW.phone IS NULL OR NEW.phone = '' THEN
        RAISE EXCEPTION 'Phone number is required for user registration';
    END IF;

    IF user_name IS NULL OR user_name = '' THEN
        RAISE EXCEPTION 'Name is required in user metadata';
    END IF;

    IF user_role IS NULL OR user_role = '' THEN
        RAISE EXCEPTION 'Role is required in user metadata';
    END IF;

    -- Validate that role is valid
    IF user_role NOT IN (
        'SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION', 'WING_COMMANDER', 'WING_CAPTAIN',
        'HOME_CHIEF', 'HOME_MEMBER'
    ) THEN
        RAISE EXCEPTION 'Invalid role specified: %', user_role;
    END IF;

    -- Validate role-specific requirements
    IF user_role IN ('HOME_CHIEF', 'HOME_MEMBER') AND target_flat_id IS NULL THEN
        RAISE EXCEPTION 'flat_id is required for Resident role %', user_role;
    END IF;

    IF user_role IN ('WING_COMMANDER', 'WING_CAPTAIN') AND target_wing_id IS NULL THEN
        RAISE EXCEPTION 'wing_id is required for Member role %', user_role;
    END IF;

    -- Check if phone already registered in core.resident
    IF EXISTS (SELECT 1 FROM core.resident WHERE phone = NEW.phone) THEN
        RAISE EXCEPTION 'ConstraintViolation: Phone number % is already registered in core.resident', NEW.phone;
    END IF;

    -- Get current active season
    SELECT id INTO target_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF target_season_id IS NULL THEN
        RAISE EXCEPTION 'No active season found for onboarding';
    END IF;

    -- Step 1: Create resident record
    new_resident_id := gen_random_uuid();
    INSERT INTO core.resident (id, name, phone, status)
    VALUES (new_resident_id, user_name, NEW.phone, 'ACTIVE');

    -- Step 2: Create user account record
    INSERT INTO core.user_account (auth_user_id, resident_id, phone)
    VALUES (NEW.id, new_resident_id, NEW.phone);

    -- Step 3: Handle role-specific assignments
    IF user_role IN ('HOME_CHIEF', 'HOME_MEMBER') THEN
        -- Verify flat exists
        IF NOT EXISTS (SELECT 1 FROM core.flat WHERE id = target_flat_id) THEN
            RAISE EXCEPTION 'Invalid flat_id: flat does not exist';
        END IF;

        INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
        VALUES (new_resident_id, target_flat_id, target_season_id, user_role::core.resident_role, user_occ_type::core.occupancy_type);

    ELSE
        -- SCOT Member role
        IF target_wing_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM core.wing WHERE id = target_wing_id) THEN
            RAISE EXCEPTION 'Invalid wing_id: wing does not exist';
        END IF;

        -- Create member record using same resident_id as primary key
        new_member_id := new_resident_id;
        INSERT INTO core.member (id, status)
        VALUES (new_member_id, 'ACTIVE');

        -- Create season assignment
        INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
        VALUES (new_member_id, target_season_id, user_role::core.member_role, target_wing_id);
    END IF;

    -- Step 4: Update auth.users metadata with resident_id
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('resident_id', new_resident_id)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to auth.users table
CREATE TRIGGER on_auth_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION core.handle_auth_user_signup();
