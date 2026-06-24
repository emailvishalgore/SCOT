-- ==========================================
-- 13 - Supabase PostgreSQL Schema DDL Script
-- Platform: Supabase / PostgreSQL 16
-- ==========================================

-- ------------------------------------------
-- 1. Schema Initialization
-- ------------------------------------------
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS finance;

-- ------------------------------------------
-- 2. Custom Type (ENUM) Definitions
-- ------------------------------------------

-- Core Schema Enums
CREATE TYPE core.season_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE core.member_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE core.member_role AS ENUM ('SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION', 'WING_COMMANDER', 'WING_CAPTAIN');
CREATE TYPE core.resident_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE core.resident_role AS ENUM ('HOME_CHIEF', 'HOME_MEMBER');
CREATE TYPE core.occupancy_type AS ENUM ('OWNER', 'TENANT');
CREATE TYPE core.event_type AS ENUM ('STANDALONE', 'UMBRELLA');
CREATE TYPE core.event_status AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE core.sub_event_status AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE core.registration_method AS ENUM ('SELF', 'WING_CAPTAIN', 'ON_SPOT');
CREATE TYPE core.competition_type AS ENUM ('INDIVIDUAL', 'WING_BASED');
CREATE TYPE core.competition_status AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE core.fixture_status AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED');
CREATE TYPE core.attendance_status AS ENUM ('PENDING', 'PRESENT', 'ABSENT');
CREATE TYPE core.task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');
CREATE TYPE core.task_assignment_type AS ENUM ('MEMBER', 'PORTFOLIO', 'EVENT_TEAM');
CREATE TYPE core.media_type AS ENUM ('PHOTO', 'VIDEO');

-- Finance Schema Enums
CREATE TYPE finance.contribution_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE finance.sponsor_status AS ENUM ('COMMITTED', 'PARTIALLY_PAID', 'FULLY_PAID');
CREATE TYPE finance.quotation_status AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE finance.expense_category AS ENUM ('VENDOR', 'LOGISTICS', 'PRIZES', 'MISCELLANEOUS');
CREATE TYPE finance.expense_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED');

-- ------------------------------------------
-- 3. Core Schema Tables
-- ------------------------------------------

-- Season Table
CREATE TABLE core.season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status core.season_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wing Table (Permanent layout: N to W)
CREATE TABLE core.wing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CHAR(1) UNIQUE NOT NULL CHECK (name IN ('N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'))
);

-- Flat Table (Permanent layout)
CREATE TABLE core.flat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(10) NOT NULL,
    wing_id UUID NOT NULL REFERENCES core.wing(id),
    CONSTRAINT unique_flat_per_wing UNIQUE (wing_id, number)
);

-- Member Table (SCOT Organizers Master Profiles)
CREATE TABLE core.member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status core.member_status NOT NULL DEFAULT 'ACTIVE'
);

-- Member Season Assignment Table
CREATE TABLE core.member_season_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES core.member(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role core.member_role NOT NULL,
    wing_id UUID REFERENCES core.wing(id),
    CONSTRAINT unique_member_season UNIQUE (member_id, season_id)
);

-- Portfolio Table
CREATE TABLE core.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Member Portfolio Assignment Table
CREATE TABLE core.member_portfolio_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_assignment_id UUID NOT NULL REFERENCES core.member_season_assignment(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES core.portfolio(id),
    CONSTRAINT unique_portfolio_assignment UNIQUE (member_assignment_id, portfolio_id)
);

-- Resident Table (Residents Master Profiles)
CREATE TABLE core.resident (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status core.resident_status NOT NULL DEFAULT 'ACTIVE'
);

-- Resident Flat Assignment Table
CREATE TABLE core.resident_flat_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES core.resident(id),
    flat_id UUID NOT NULL REFERENCES core.flat(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role core.resident_role NOT NULL,
    occupancy_type core.occupancy_type NOT NULL,
    CONSTRAINT unique_resident_flat_season UNIQUE (resident_id, flat_id, season_id)
);

-- Event Table
CREATE TABLE core.event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type core.event_type NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    time_details VARCHAR(255),
    status core.event_status NOT NULL DEFAULT 'PLANNED'
);

-- Sub-Event Table
CREATE TABLE core.sub_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umbrella_event_id UUID NOT NULL REFERENCES core.event(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    time_details VARCHAR(255),
    status core.sub_event_status NOT NULL DEFAULT 'PLANNED'
);

-- Event Assignment Table
CREATE TABLE core.event_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_assignment_id UUID NOT NULL REFERENCES core.member_season_assignment(id) ON DELETE CASCADE,
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    CONSTRAINT check_assignment_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL)
    )
);

-- Registration Table (Gated by finance.is_flat_eligible check)
CREATE TABLE core.registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES core.resident(id),
    registration_method core.registration_method NOT NULL,
    registered_by_id UUID, 
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_registration_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL)
    ),
    CONSTRAINT unique_event_registration UNIQUE (event_id, resident_id),
    CONSTRAINT unique_sub_event_registration UNIQUE (sub_event_id, resident_id)
);

-- Competition Table
CREATE TABLE core.competition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type core.competition_type NOT NULL,
    scoring_rule_json JSONB NOT NULL,
    status core.competition_status NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT check_competition_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL)
    )
);

-- Fixture Table
CREATE TABLE core.fixture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES core.competition(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status core.fixture_status NOT NULL DEFAULT 'SCHEDULED'
);

-- Competition Participant Table
CREATE TABLE core.competition_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES core.competition(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES core.resident(id),
    wing_id UUID REFERENCES core.wing(id),
    fixture_id UUID REFERENCES core.fixture(id) ON DELETE SET NULL,
    attendance_status core.attendance_status NOT NULL DEFAULT 'PENDING',
    score NUMERIC(5,2),
    placement INT,
    CONSTRAINT check_participant_identity CHECK (
        (resident_id IS NOT NULL AND wing_id IS NULL) OR 
        (resident_id IS NULL AND wing_id IS NOT NULL)
    )
);

-- Wing Score Table (Leaderboard Standings)
CREATE TABLE core.wing_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wing_id UUID NOT NULL REFERENCES core.wing(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    competition_id UUID REFERENCES core.competition(id) ON DELETE CASCADE,
    points NUMERIC(5,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration Table (Seasonal Settings)
CREATE TABLE core.system_config (
    key VARCHAR(100) PRIMARY KEY,
    season_id UUID REFERENCES core.season(id),
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gallery Album Table
CREATE TABLE core.gallery_album (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id),
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by_id UUID NOT NULL REFERENCES core.member(id),
    CONSTRAINT check_album_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL) OR
        (event_id IS NULL AND sub_event_id IS NULL)
    )
);

-- Media Item Table (Links Google Drive media uploads)
CREATE TABLE core.media_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES core.gallery_album(id) ON DELETE CASCADE,
    type core.media_type NOT NULL,
    url VARCHAR(1000) NOT NULL, 
    uploaded_by_id UUID NOT NULL REFERENCES core.member(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------
-- 4. Finance Schema Tables (Plug-and-Play)
-- ------------------------------------------

-- Flat Contribution Table
CREATE TABLE finance.flat_contribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL, 
    season_id UUID NOT NULL, 
    amount NUMERIC(10,2) NOT NULL DEFAULT 3000.00,
    status finance.contribution_status NOT NULL DEFAULT 'PENDING',
    payment_date TIMESTAMP WITH TIME ZONE,
    recorded_by_id UUID, 
    receipt_url VARCHAR(1000), 
    CONSTRAINT unique_flat_contribution UNIQUE (flat_id, season_id)
);

-- Sponsor Table
CREATE TABLE finance.sponsor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, 
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    amount_committed NUMERIC(10,2) NOT NULL,
    amount_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status finance.sponsor_status NOT NULL DEFAULT 'COMMITTED'
);

-- Vendor Table (Persistent across seasons)
CREATE TABLE finance.vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0)
);

-- Vendor Quotation Table (Links Google Drive PDFs)
CREATE TABLE finance.vendor_quotation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, 
    vendor_id UUID NOT NULL REFERENCES finance.vendor(id) ON DELETE CASCADE,
    event_id UUID, 
    amount NUMERIC(10,2) NOT NULL,
    quotation_file_url VARCHAR(1000) NOT NULL, 
    status finance.quotation_status NOT NULL DEFAULT 'SUBMITTED'
);

-- Expense Table (Links Google Drive receipts)
CREATE TABLE finance.expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, 
    category finance.expense_category NOT NULL,
    vendor_id UUID REFERENCES finance.vendor(id) ON DELETE SET NULL,
    event_id UUID, 
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    receipt_url VARCHAR(1000), 
    status finance.expense_status NOT NULL DEFAULT 'DRAFT',
    approved_by_id UUID 
);

-- Financial Audit Log Table
CREATE TABLE finance.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id UUID NOT NULL, 
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL, 
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------
-- 5. Database Indexes
-- ------------------------------------------

-- Indexes for core schema
CREATE INDEX idx_flat_wing ON core.flat(wing_id);
CREATE INDEX idx_resident_assignment_season ON core.resident_flat_assignment(season_id);
CREATE INDEX idx_resident_assignment_flat ON core.resident_flat_assignment(flat_id);
CREATE INDEX idx_event_season ON core.event(season_id);
CREATE INDEX idx_registration_event ON core.registration(event_id);
CREATE INDEX idx_registration_sub_event ON core.registration(sub_event_id);
CREATE INDEX idx_competition_event ON core.competition(event_id);
CREATE INDEX idx_competition_sub_event ON core.competition(sub_event_id);
CREATE INDEX idx_participant_competition ON core.competition_participant(competition_id);
CREATE INDEX idx_participant_fixture ON core.competition_participant(fixture_id);
CREATE INDEX idx_wing_score_season ON core.wing_score(season_id);
CREATE INDEX idx_gallery_album_season ON core.gallery_album(season_id);
CREATE INDEX idx_media_item_album ON core.media_item(album_id);

-- Indexes for finance schema
CREATE INDEX idx_contribution_flat_season ON finance.flat_contribution(flat_id, season_id);
CREATE INDEX idx_sponsor_season ON finance.sponsor(season_id);
CREATE INDEX idx_quotation_event ON finance.vendor_quotation(event_id);
CREATE INDEX idx_expense_season ON finance.expense(season_id);
CREATE INDEX idx_expense_event ON finance.expense(event_id);

-- ------------------------------------------
-- 6. System Functions & Trigger Scripts
-- ------------------------------------------

-- Modified Timestamp Auto-update Trigger Helper
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

-- Decoupled Flat Contribution Eligibility Procedure
CREATE OR REPLACE FUNCTION finance.is_flat_eligible(target_flat_id UUID, active_season_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM finance.flat_contribution
        WHERE flat_id = target_flat_id 
          AND season_id = active_season_id 
          AND status = 'PAID'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure Flat Payment Override Function
CREATE OR REPLACE FUNCTION finance.record_payment(
    target_flat_id UUID,
    active_season_id UUID,
    payment_amount DECIMAL,
    recorder_member_id UUID
) RETURNS finance.flat_contribution AS $$
BEGIN
    -- Explicit JWT Claims Verification for Security Definer
    IF (auth.jwt() -> 'user_metadata' ->> 'role')::text NOT IN ('SCOT_ADMIN', 'CORE_TEAM', 'WING_COMMANDER') THEN
        RAISE EXCEPTION 'Unauthorized: Insufficient privileges.';
    END IF;

    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status, payment_date, recorded_by_id)
    VALUES (target_flat_id, active_season_id, payment_amount, 'PAID', NOW(), recorder_member_id)
    ON CONFLICT (flat_id, season_id) 
    DO UPDATE SET status = 'PAID', payment_date = NOW(), recorded_by_id = recorder_member_id
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seasonal Dues Rollforward Initialization Procedure
CREATE OR REPLACE FUNCTION core.initialize_new_season(new_season_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Initialize flat contributions for all existing flats
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
    SELECT id, new_season_id, 3000.00, 'PENDING' FROM core.flat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------
-- 7. Row-Level Security (RLS) Policies
-- ------------------------------------------

-- Enable RLS on core schema operational tables
ALTER TABLE core.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.registration ENABLE ROW LEVEL SECURITY;

-- 7.1 Event Read Policy (Scopes queries to active season)
CREATE POLICY select_events_policy ON core.event
    FOR SELECT
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 7.2 Event Write Policy (Prevents modifications on archived data)
CREATE POLICY modify_events_policy ON core.event
    FOR ALL
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    )
    WITH CHECK (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    );

-- 7.3 Wing Captain Registration Policy (Restricts inserts to own wing residents)
CREATE POLICY wing_captain_insert_registration ON core.registration
    FOR INSERT
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'WING_CAPTAIN'
        AND
        resident_id IN (
            SELECT resident_id FROM core.resident_flat_assignment rfa
            JOIN core.flat f ON rfa.flat_id = f.id
            WHERE f.wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );
