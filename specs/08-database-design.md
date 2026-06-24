# 08 - Database Design Specification

Version: 1.0  
Status: Draft  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Database Schema Overview

The SCOT Community Operations Platform database is hosted on **Supabase** and runs on **PostgreSQL 16**. To maintain strict module boundaries and respect the plug-and-play architecture of the Finance module, the database tables are partitioned into two separate PostgreSQL schemas:

1. **`core` Schema:** Houses organization layout, residents, events, registrations, competitions, fixtures, and task entities.
2. **`finance` Schema:** Houses contributions, sponsors, vendors, quotations, and expense entities. 

### 1.1 Decoupling Rule
* Core tables never reference tables in the `finance` schema via database foreign keys. Relationships are maintained logically using plain `UUID` fields.
* The `core` schema queries payment status strictly through the database function `finance.is_flat_eligible()`.

---

## 2. Table DDL (Data Definition Language)

Below are the SQL scripts to initialize the tables, keys, and default values.

### 2.1 Schema Initialization
```sql
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS finance;
```

### 2.2 `core` Schema Tables

```sql
-- Season Table
CREATE TABLE core.season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wing Table (N to W)
CREATE TABLE core.wing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CHAR(1) UNIQUE NOT NULL CHECK (name IN ('N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'))
);

-- Flat Table
CREATE TABLE core.flat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(10) NOT NULL,
    wing_id UUID NOT NULL REFERENCES core.wing(id),
    CONSTRAINT unique_flat_per_wing UNIQUE (wing_id, number)
);

-- Member Table (SCOT Organizers)
CREATE TABLE core.member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- Member Season Assignment Table
CREATE TABLE core.member_season_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES core.member(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role VARCHAR(30) NOT NULL CHECK (role IN ('SCOT_ADMIN', 'CORE_TEAM', 'EVENT_CHAMPION', 'WING_COMMANDER', 'WING_CAPTAIN')),
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

-- Resident Table
CREATE TABLE core.resident (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- Resident Flat Assignment Table
CREATE TABLE core.resident_flat_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES core.resident(id),
    flat_id UUID NOT NULL REFERENCES core.flat(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('HOME_CHIEF', 'HOME_MEMBER')),
    occupancy_type VARCHAR(20) NOT NULL CHECK (occupancy_type IN ('OWNER', 'TENANT')),
    CONSTRAINT unique_resident_flat_season UNIQUE (resident_id, flat_id, season_id)
);

-- Event Table
CREATE TABLE core.event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('STANDALONE', 'UMBRELLA')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    time_details VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'))
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
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'))
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

-- Registration Table
CREATE TABLE core.registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES core.resident(id),
    registration_method VARCHAR(20) NOT NULL CHECK (registration_method IN ('SELF', 'WING_CAPTAIN', 'ON_SPOT')),
    registered_by_id UUID, -- UUID of member or resident performing action
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
    type VARCHAR(20) NOT NULL CHECK (type IN ('INDIVIDUAL', 'WING_BASED')),
    scoring_rule_json JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
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
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'))
);

-- Competition Participant Table
CREATE TABLE core.competition_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES core.competition(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES core.resident(id),
    wing_id UUID REFERENCES core.wing(id),
    fixture_id UUID REFERENCES core.fixture(id) ON DELETE SET NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (attendance_status IN ('PENDING', 'PRESENT', 'ABSENT')),
    score NUMERIC(5,2),
    placement INT,
    CONSTRAINT check_participant_identity CHECK (
        (resident_id IS NOT NULL AND wing_id IS NULL) OR 
        (resident_id IS NULL AND wing_id IS NOT NULL)
    )
);

-- Wing Score Table ( Leaderboard )
CREATE TABLE core.wing_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wing_id UUID NOT NULL REFERENCES core.wing(id),
    season_id UUID NOT NULL REFERENCES core.season(id),
    competition_id UUID REFERENCES core.competition(id) ON DELETE CASCADE,
    points NUMERIC(5,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration Table
CREATE TABLE core.system_config (
    key VARCHAR(100) PRIMARY KEY,
    season_id UUID REFERENCES core.season(id), -- Scoped per season
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

-- Media Item Table
CREATE TABLE core.media_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES core.gallery_album(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PHOTO', 'VIDEO')),
    url VARCHAR(1000) NOT NULL, -- Google Drive web link
    uploaded_by_id UUID NOT NULL REFERENCES core.member(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 `finance` Schema Tables

```sql
-- Flat Contribution Table
CREATE TABLE finance.flat_contribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL, -- Logical link to core.flat
    season_id UUID NOT NULL, -- Logical link to core.season
    amount NUMERIC(10,2) NOT NULL DEFAULT 3000.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    payment_date TIMESTAMP WITH TIME ZONE,
    recorded_by_id UUID, -- Logical link to core.member
    receipt_url VARCHAR(1000), -- Google Drive link for generated payment receipt PDF
    CONSTRAINT unique_flat_contribution UNIQUE (flat_id, season_id)
);

-- Sponsor Table
CREATE TABLE finance.sponsor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, -- Logical link to core.season
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    amount_committed NUMERIC(10,2) NOT NULL,
    amount_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'PARTIALLY_PAID', 'FULLY_PAID'))
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

-- Vendor Quotation Table
CREATE TABLE finance.vendor_quotation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, -- Logical link to core.season
    vendor_id UUID NOT NULL REFERENCES finance.vendor(id) ON DELETE CASCADE,
    event_id UUID, -- Logical link to core.event
    amount NUMERIC(10,2) NOT NULL,
    quotation_file_url VARCHAR(1000) NOT NULL, -- Google Drive quotation link
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED'))
);

-- Expense Table
CREATE TABLE finance.expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL, -- Logical link to core.season
    category VARCHAR(30) NOT NULL CHECK (category IN ('VENDOR', 'LOGISTICS', 'PRIZES', 'MISCELLANEOUS')),
    vendor_id UUID REFERENCES finance.vendor(id) ON DELETE SET NULL,
    event_id UUID, -- Logical link to core.event
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    receipt_url VARCHAR(1000), -- Google Drive invoice/bill receipt link
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED')),
    approved_by_id UUID -- Logical link to core.member
);

-- Financial Audit Log Table
CREATE TABLE finance.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id UUID NOT NULL, -- Logical link to core.member
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- INSERT/UPDATE/DELETE
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Database Indexes

To ensure high performance query scoping on the Supabase free tier, indexes are created on frequently searched columns, specifically targeting `season_id` (data isolation boundary) and `wing_id` (wing boundaries).

```sql
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
```

---

## 4. Row-Level Security (RLS) SQL Policies

Row-Level Security is enabled globally on all tables. Supabase injects the user's role and wing metadata into the `auth.jwt()` payload.

```sql
-- Enable RLS
ALTER TABLE core.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.registration ENABLE ROW LEVEL SECURITY;
```

### 4.1 Event Selection Policy (Season Boundary)
Allows reading events belonging to the active season (or all seasons for Admins/Core Team):
```sql
CREATE POLICY select_events_policy ON core.event
    FOR SELECT
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );
```

### 4.2 Event Modification Policy (Active Season Lockout)
Prevents any modifications to events belonging to archived seasons:
```sql
CREATE POLICY modify_events_policy ON core.event
    FOR ALL
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    )
    WITH CHECK (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    );
```

### 4.3 Wing Captain Registration Policy (Wing Boundary)
Enforces that Wing Captains can only register residents belonging to their physical wing:
```sql
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
```

---

## 5. System Functions & Trigger Scripts

### 5.1 Modified Timestamp Auto-update Trigger
```sql
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
```

### 5.2 Decoupled Payment Eligibility Stored Procedure
Exposed to the `core` schema, this queries flat status inside the `finance` schema:
```sql
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
```

### 5.3 Secure Payment Recording Stored Procedure
Secured with JWT claims verification to prevent RLS bypass on `SECURITY DEFINER`:
```sql
CREATE OR REPLACE FUNCTION finance.record_payment(
    target_flat_id UUID,
    active_season_id UUID,
    payment_amount DECIMAL,
    recorder_member_id UUID
) RETURNS finance.flat_contribution AS $$
BEGIN
    -- Authorization Check
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
```

### 5.4 Seasonal Rollforward Stored Procedure
Initializes contribution ledgers when starting a new season:
```sql
CREATE OR REPLACE FUNCTION core.initialize_new_season(new_season_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Initialize flat contributions for all existing flats
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
    SELECT id, new_season_id, 3000.00, 'PENDING' FROM core.flat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

