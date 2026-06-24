-- =======================================================
-- Migration: Phase A Foundations (Schema, Enums, Tables, RLS, Triggers)
-- Path: supabase/migrations/20260622000000_phase_a_foundations.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Schema Initialization
-- -------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS finance;

-- -------------------------------------------------------
-- 2. Custom Type (ENUM) Definitions
-- -------------------------------------------------------
CREATE TYPE core.season_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE core.member_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE core.member_role AS ENUM ('SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION', 'WING_COMMANDER', 'WING_CAPTAIN');
CREATE TYPE core.resident_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE core.resident_role AS ENUM ('HOME_CHIEF', 'HOME_MEMBER');
CREATE TYPE core.occupancy_type AS ENUM ('OWNER', 'TENANT');

-- -------------------------------------------------------
-- 3. Table Definitions
-- -------------------------------------------------------

-- 3.1 Season Table
CREATE TABLE core.season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status core.season_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Wing Table
CREATE TABLE core.wing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CHAR(1) UNIQUE NOT NULL CHECK (name IN ('N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'))
);

-- 3.3 Flat Table
CREATE TABLE core.flat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(10) NOT NULL,
    wing_id UUID NOT NULL REFERENCES core.wing(id),
    CONSTRAINT unique_flat_per_wing UNIQUE (wing_id, number)
);

-- 3.4 Member Table (SCOT Organizers)
CREATE TABLE core.member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status core.member_status NOT NULL DEFAULT 'ACTIVE'
);

-- 3.5 Member Season Assignment Table
CREATE TABLE core.member_season_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES core.member(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role core.member_role NOT NULL,
    wing_id UUID REFERENCES core.wing(id),
    CONSTRAINT unique_member_season UNIQUE (member_id, season_id)
);

-- 3.6 Resident Table
CREATE TABLE core.resident (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status core.resident_status NOT NULL DEFAULT 'ACTIVE'
);

-- 3.7 Resident Flat Assignment Table
CREATE TABLE core.resident_flat_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES core.resident(id),
    flat_id UUID NOT NULL REFERENCES core.flat(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role core.resident_role NOT NULL,
    occupancy_type core.occupancy_type NOT NULL,
    CONSTRAINT unique_resident_flat_season UNIQUE (resident_id, flat_id, season_id)
);

-- -------------------------------------------------------
-- 4. Indexes
-- -------------------------------------------------------
CREATE INDEX idx_flat_wing ON core.flat(wing_id);
CREATE INDEX idx_resident_assignment_season ON core.resident_flat_assignment(season_id);
CREATE INDEX idx_resident_assignment_flat ON core.resident_flat_assignment(flat_id);

-- -------------------------------------------------------
-- 5. Helper & Modification Triggers
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION core.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_season_modtime
    BEFORE UPDATE ON core.season
    FOR EACH ROW EXECUTE FUNCTION core.update_modified_column();

-- -------------------------------------------------------
-- 6. Authentication User Sync Trigger
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION core.handle_auth_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_role text;
    user_name text;
    user_phone text;
    target_wing_id uuid;
    target_flat_id uuid;
    target_season_id uuid;
    user_occ_type text;
    new_member_id uuid;
    new_resident_id uuid;
BEGIN
    -- Extract metadata parameters from signup json payload
    user_role := NEW.raw_user_meta_data ->> 'role';
    user_name := NEW.raw_user_meta_data ->> 'name';
    user_phone := NEW.raw_user_meta_data ->> 'phone';
    target_wing_id := (NEW.raw_user_meta_data ->> 'wing_id')::uuid;
    target_flat_id := (NEW.raw_user_meta_data ->> 'flat_id')::uuid;
    user_occ_type := COALESCE(NEW.raw_user_meta_data ->> 'occupancy_type', 'OWNER');

    -- Get current active season
    SELECT id INTO target_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;

    -- Fail silently/skip if name or phone is not provided in metadata
    IF user_name IS NULL OR user_phone IS NULL THEN
        RETURN NEW;
    END IF;

    -- Case 1: The user is registering as a SCOT Committee Member
    IF user_role IN ('SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION', 'WING_COMMANDER', 'WING_CAPTAIN') THEN
        INSERT INTO core.member (id, name, phone, status)
        VALUES (NEW.id, user_name, user_phone, 'ACTIVE')
        ON CONFLICT (phone) DO UPDATE 
        SET name = EXCLUDED.name, status = 'ACTIVE'
        RETURNING id INTO new_member_id;

        IF target_season_id IS NOT NULL THEN
            INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
            VALUES (new_member_id, target_season_id, user_role::core.member_role, target_wing_id)
            ON CONFLICT (member_id, season_id) DO UPDATE
            SET role = EXCLUDED.role, wing_id = EXCLUDED.wing_id;
        END IF;

    -- Case 2: The user is registering as a Flat Resident
    ELSIF user_role IN ('HOME_CHIEF', 'HOME_MEMBER') THEN
        INSERT INTO core.resident (id, name, phone, status)
        VALUES (NEW.id, user_name, user_phone, 'ACTIVE')
        ON CONFLICT (phone) DO UPDATE 
        SET name = EXCLUDED.name, status = 'ACTIVE'
        RETURNING id INTO new_resident_id;

        IF target_season_id IS NOT NULL AND target_flat_id IS NOT NULL THEN
            INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
            VALUES (new_resident_id, target_flat_id, target_season_id, user_role::core.resident_role, user_occ_type::core.occupancy_type)
            ON CONFLICT (resident_id, flat_id, season_id) DO UPDATE
            SET role = EXCLUDED.role, occupancy_type = EXCLUDED.occupancy_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
CREATE TRIGGER on_auth_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION core.handle_auth_user_signup();

-- -------------------------------------------------------
-- 7. Row-Level Security (RLS) & Policies
-- -------------------------------------------------------

-- Enable Row-Level Security
ALTER TABLE core.season ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.wing ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.flat ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.member ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.member_season_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.resident ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.resident_flat_assignment ENABLE ROW LEVEL SECURITY;

-- 7.1 Season Table Policies
CREATE POLICY public_select_seasons ON core.season
    FOR SELECT USING (true);

CREATE POLICY admin_modify_seasons ON core.season
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.2 Wing Table Policies
CREATE POLICY public_select_wings ON core.wing
    FOR SELECT USING (true);

CREATE POLICY admin_modify_wings ON core.wing
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.3 Flat Table Policies
CREATE POLICY select_flats ON core.flat
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
        OR
        wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
    );

CREATE POLICY admin_modify_flats ON core.flat
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.4 Member Table Policies
CREATE POLICY select_members ON core.member
    FOR SELECT USING (true);

CREATE POLICY admin_modify_members ON core.member
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.5 Member Season Assignment Policies
CREATE POLICY select_member_assignments ON core.member_season_assignment
    FOR SELECT USING (true);

CREATE POLICY admin_modify_member_assignments ON core.member_season_assignment
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.6 Resident Table Policies
CREATE POLICY select_residents ON core.resident
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM', 'WING_COMMANDER', 'WING_CAPTAIN')
        OR
        id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        OR
        id IN (
            SELECT resident_id FROM core.resident_flat_assignment rfa
            JOIN core.flat f ON rfa.flat_id = f.id
            WHERE f.wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );

CREATE POLICY admin_modify_residents ON core.resident
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 7.7 Resident Flat Assignment Policies
CREATE POLICY select_resident_assignments ON core.resident_flat_assignment
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM', 'WING_COMMANDER', 'WING_CAPTAIN')
        OR
        flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
        OR
        flat_id IN (
            SELECT id FROM core.flat 
            WHERE wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );

CREATE POLICY admin_modify_resident_assignments ON core.resident_flat_assignment
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );
