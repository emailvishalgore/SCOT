-- =======================================================
-- Migration: Phase B.1 Identity Model Updates
-- Path: supabase/migrations/20260622000001_phase_b_identity.sql
-- =======================================================

-- 1. Create User Account Table (Logical User Account representation)
CREATE TABLE IF NOT EXISTS core.user_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    resident_id UUID NOT NULL REFERENCES core.resident(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Link SCOT Member to Resident Master Profiles
-- Add resident_id column to core.member
ALTER TABLE core.member ADD COLUMN resident_id UUID REFERENCES core.resident(id) ON DELETE CASCADE;

-- Create unique index to guarantee one member profile per resident
CREATE UNIQUE INDEX idx_unique_resident_member ON core.member(resident_id);

-- 3. Modify Role Assignment Constraint to Allow Multiple Roles per Season
-- Drop the old constraint that restricted members to one role per season
ALTER TABLE core.member_season_assignment DROP CONSTRAINT IF EXISTS unique_member_season;

-- Add new constraint allowing a member to hold multiple unique roles in a single season
ALTER TABLE core.member_season_assignment ADD CONSTRAINT unique_member_season_role UNIQUE (member_id, season_id, role);

-- 4. Create Portfolio Tables if not exists (defensive check)
CREATE TABLE IF NOT EXISTS core.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS core.member_portfolio_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_assignment_id UUID NOT NULL REFERENCES core.member_season_assignment(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES core.portfolio(id),
    CONSTRAINT unique_portfolio_assignment UNIQUE (member_assignment_id, portfolio_id)
);

-- 5. Implement Flat occupancy rule enforcer trigger (maximum one HOME_CHIEF per flat per season)
CREATE OR REPLACE FUNCTION core.validate_flat_head_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'HOME_CHIEF' THEN
        IF EXISTS (
            SELECT 1 FROM core.resident_flat_assignment
            WHERE flat_id = NEW.flat_id 
              AND season_id = NEW.season_id 
              AND role = 'HOME_CHIEF'
              AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'ConstraintViolation: Flat % already has a Head User (HOME_CHIEF) for season %', NEW.flat_id, NEW.season_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_head_user
    BEFORE INSERT OR UPDATE ON core.resident_flat_assignment
    FOR EACH ROW EXECUTE FUNCTION core.validate_flat_head_user();

-- -------------------------------------------------------
-- 6. Row-Level Security (RLS) Policies
-- -------------------------------------------------------

-- Enable RLS on user_account
ALTER TABLE core.user_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.member_portfolio_assignment ENABLE ROW LEVEL SECURITY;

-- 6.1 User Account Policies
CREATE POLICY select_own_user_account ON core.user_account
    FOR SELECT USING (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

CREATE POLICY admin_modify_user_accounts ON core.user_account
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 6.2 Portfolio Table Policies
CREATE POLICY public_select_portfolios ON core.portfolio
    FOR SELECT USING (true);

CREATE POLICY admin_modify_portfolios ON core.portfolio
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );

-- 6.3 Member Portfolio Assignment Policies
CREATE POLICY select_portfolio_assignments ON core.member_portfolio_assignment
    FOR SELECT USING (true);

CREATE POLICY admin_modify_portfolio_assignments ON core.member_portfolio_assignment
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'SCOT_ADMIN'
    );
