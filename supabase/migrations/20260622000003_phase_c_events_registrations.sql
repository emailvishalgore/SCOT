-- =======================================================
-- Migration: Phase C Events & Registrations
-- Path: supabase/migrations/20260622000003_phase_c_events_registrations.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Table Definitions
-- -------------------------------------------------------

-- 1.1 Flat Contribution Table (finance schema)
CREATE TABLE IF NOT EXISTS finance.flat_contribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES core.flat(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 3000.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    payment_date TIMESTAMP WITH TIME ZONE,
    recorded_by_id UUID REFERENCES core.member(id),
    receipt_url VARCHAR(1000),
    CONSTRAINT unique_flat_contribution UNIQUE (flat_id, season_id)
);

-- 1.2 Event Table (core schema)
CREATE TABLE IF NOT EXISTS core.event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    time_details VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 Sub-Event Table (core schema)
CREATE TABLE IF NOT EXISTS core.sub_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umbrella_event_id UUID NOT NULL REFERENCES core.event(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    time_details VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 Event Assignment Table (core schema)
CREATE TABLE IF NOT EXISTS core.event_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_assignment_id UUID NOT NULL REFERENCES core.member_season_assignment(id) ON DELETE CASCADE,
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    CONSTRAINT check_assignment_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL)
    ),
    CONSTRAINT unique_event_assignment UNIQUE (member_assignment_id, event_id),
    CONSTRAINT unique_sub_event_assignment UNIQUE (member_assignment_id, sub_event_id)
);

-- 1.5 Registration Table (core schema)
CREATE TABLE IF NOT EXISTS core.registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES core.resident(id) ON DELETE CASCADE,
    registration_method VARCHAR(20) NOT NULL CHECK (registration_method IN ('SELF', 'WING_CAPTAIN', 'ON_SPOT')),
    registered_by_id UUID REFERENCES core.resident(id),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_registration_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL)
    ),
    CONSTRAINT unique_event_registration UNIQUE (event_id, resident_id),
    CONSTRAINT unique_sub_event_registration UNIQUE (sub_event_id, resident_id)
);

-- -------------------------------------------------------
-- 2. Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contribution_flat_season ON finance.flat_contribution(flat_id, season_id);
CREATE INDEX IF NOT EXISTS idx_registration_event ON core.registration(event_id);
CREATE INDEX IF NOT EXISTS idx_registration_sub_event ON core.registration(sub_event_id);

-- -------------------------------------------------------
-- 3. Decoupled Finance Eligibility RPC
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- 4. Registration Validator Trigger Function
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION core.validate_registration()
RETURNS TRIGGER AS $$
DECLARE
    target_season_id uuid;
    target_status varchar(20);
    res_status core.resident_status;
    res_flat_id uuid;
    flat_number varchar(10);
BEGIN
    -- 1. Target Mutually Exclusive Check
    IF (NEW.event_id IS NOT NULL AND NEW.sub_event_id IS NOT NULL) OR (NEW.event_id IS NULL AND NEW.sub_event_id IS NULL) THEN
        RAISE EXCEPTION 'ConstraintViolation: Must register for either an event or a sub-event, not both.';
    END IF;

    -- 2. Active Target Check & get season_id
    IF NEW.event_id IS NOT NULL THEN
        SELECT season_id, status INTO target_season_id, target_status FROM core.event WHERE id = NEW.event_id;
        IF target_season_id IS NULL THEN
            RAISE EXCEPTION 'ConstraintViolation: The target event does not exist.';
        END IF;
    ELSE
        SELECT e.season_id, se.status INTO target_season_id, target_status 
        FROM core.sub_event se
        JOIN core.event e ON se.umbrella_event_id = e.id
        WHERE se.id = NEW.sub_event_id;
        IF target_season_id IS NULL THEN
            RAISE EXCEPTION 'ConstraintViolation: The target sub-event does not exist.';
        END IF;
    END IF;

    IF target_status IN ('COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION 'ConstraintViolation: Cannot register for an event that is already completed or cancelled.';
    END IF;

    -- 3. Resident Status Check
    SELECT status INTO res_status FROM core.resident WHERE id = NEW.resident_id;
    IF res_status IS NULL THEN
        RAISE EXCEPTION 'ConstraintViolation: The requested resident profile does not exist.';
    END IF;
    IF res_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'ConstraintViolation: Cannot register an inactive resident.';
    END IF;

    -- 4. Flat Assignment Check
    SELECT rfa.flat_id, f.number INTO res_flat_id, flat_number 
    FROM core.resident_flat_assignment rfa
    JOIN core.flat f ON rfa.flat_id = f.id
    WHERE rfa.resident_id = NEW.resident_id AND rfa.season_id = target_season_id;

    IF res_flat_id IS NULL THEN
        RAISE EXCEPTION 'ConstraintViolation: Resident is not assigned to any flat for this season.';
    END IF;

    -- 5. Dues Payment Check (Finance Gatekeeper)
    IF NOT finance.is_flat_eligible(res_flat_id, target_season_id) THEN
        RAISE EXCEPTION 'ConstraintViolation: Registration is locked. Annual contribution is pending for Flat %.', flat_number;
    END IF;

    -- 6. Duplicate Check (Trigger level safety)
    IF NEW.event_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM core.registration WHERE event_id = NEW.event_id AND resident_id = NEW.resident_id) THEN
            RAISE EXCEPTION 'ConstraintViolation: Resident is already registered for this event.';
        END IF;
    ELSE
        IF EXISTS (SELECT 1 FROM core.registration WHERE sub_event_id = NEW.sub_event_id AND resident_id = NEW.resident_id) THEN
            RAISE EXCEPTION 'ConstraintViolation: Resident is already registered for this sub-event.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_registration_before_insert
    BEFORE INSERT ON core.registration
    FOR EACH ROW EXECUTE FUNCTION core.validate_registration();

-- -------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- -------------------------------------------------------

ALTER TABLE core.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sub_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.event_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.flat_contribution ENABLE ROW LEVEL SECURITY;

-- 5.1 Event Policies
CREATE POLICY select_events_policy ON core.event
    FOR SELECT USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY admin_modify_events_policy ON core.event
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY event_champion_update_assigned_events ON core.event
    FOR UPDATE USING (
        id IN (
            SELECT event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        )
        AND
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    );

-- 5.2 Sub-Event Policies
CREATE POLICY select_sub_events_policy ON core.sub_event
    FOR SELECT USING (
        umbrella_event_id IN (SELECT id FROM core.event WHERE season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE'))
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY admin_modify_sub_events_policy ON core.sub_event
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.3 Event Assignment Policies
CREATE POLICY select_event_assignments ON core.event_assignment
    FOR SELECT USING (true);

CREATE POLICY admin_modify_event_assignments ON core.event_assignment
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.4 Registration Policies
CREATE POLICY select_registrations ON core.registration
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION')
        OR
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        OR
        resident_id IN (
            SELECT resident_id FROM core.resident_flat_assignment rfa
            JOIN core.flat f ON rfa.flat_id = f.id
            WHERE f.wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );

CREATE POLICY insert_registrations ON core.registration
    FOR INSERT WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                event_id IN (
                    SELECT event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
                OR
                sub_event_id IN (
                    SELECT sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
            )
        )
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('HOME_CHIEF', 'HOME_MEMBER')
            AND
            resident_id IN (
                SELECT resident_id FROM core.resident_flat_assignment
                WHERE flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
            )
        )
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('WING_COMMANDER', 'WING_CAPTAIN')
            AND
            resident_id IN (
                SELECT resident_id FROM core.resident_flat_assignment rfa
                JOIN core.flat f ON rfa.flat_id = f.id
                WHERE f.wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
            )
        )
    );

CREATE POLICY delete_registrations ON core.registration
    FOR DELETE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                event_id IN (
                    SELECT event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
                OR
                sub_event_id IN (
                    SELECT sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
            )
        )
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('HOME_CHIEF', 'HOME_MEMBER')
            AND
            resident_id IN (
                SELECT resident_id FROM core.resident_flat_assignment
                WHERE flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
            )
        )
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('WING_COMMANDER', 'WING_CAPTAIN')
            AND
            resident_id IN (
                SELECT resident_id FROM core.resident_flat_assignment rfa
                JOIN core.flat f ON rfa.flat_id = f.id
                WHERE f.wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
            )
        )
    );

-- 5.5 Flat Contribution Policies
CREATE POLICY select_contributions ON finance.flat_contribution
    FOR SELECT USING (
        flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        flat_id IN (
            SELECT id FROM core.flat
            WHERE wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );

CREATE POLICY modify_contributions ON finance.flat_contribution
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'WING_COMMANDER'
            AND
            flat_id IN (
                SELECT id FROM core.flat
                WHERE wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
            )
        )
    );

-- 5.6 Auto-update updated_at modtimes for events
CREATE TRIGGER update_event_modtime
    BEFORE UPDATE ON core.event
    FOR EACH ROW EXECUTE FUNCTION core.update_modified_column();

CREATE TRIGGER update_sub_event_modtime
    BEFORE UPDATE ON core.sub_event
    FOR EACH ROW EXECUTE FUNCTION core.update_modified_column();
