-- =======================================================
-- Database Seed Script: Phase A & B.1 Identity
-- Path: supabase/seed.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Season & Wing Foundations (Phase A)
-- -------------------------------------------------------
INSERT INTO core.season (name, start_date, end_date, status)
VALUES ('Season 2026-2027', '2026-07-01', '2027-06-30', 'ACTIVE')
ON CONFLICT (name) DO UPDATE 
SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status;

INSERT INTO core.wing (name) VALUES
('N'), ('O'), ('P'), ('Q'), ('R'), ('S'), ('T'), ('U'), ('V'), ('W')
ON CONFLICT (name) DO NOTHING;

-- Programmatically Generate 280 Flats
DO $$
DECLARE
    wing_record RECORD;
    floor_num INT;
    flat_idx INT;
    flat_no VARCHAR(10);
BEGIN
    FOR wing_record IN SELECT id, name FROM core.wing LOOP
        FOR floor_num IN 1..7 LOOP
            FOR flat_idx IN 1..4 LOOP
                flat_no := (floor_num * 100 + flat_idx)::text;
                
                INSERT INTO core.flat (number, wing_id)
                VALUES (flat_no, wing_record.id)
                ON CONFLICT (wing_id, number) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- -------------------------------------------------------
-- 2. Portfolios (Phase B.1)
-- -------------------------------------------------------
INSERT INTO core.portfolio (name, description) VALUES
('Finance', 'Monetary collections, budgets, payouts, and compliance audit reporting.'),
('Sponsorship', 'Sponsorship outreach, vendor booths, and corporate collaborations.'),
('Logistics', 'Venue management, inventory, equipment rentals, and security.'),
('Sports', 'Sports tournaments, rules configurations, and scheduling fixtures.'),
('Cultural', 'Performances, drawing, rangoli, and stage coordination.'),
('Food', 'Stalls, catering coordination, and refreshments distribution.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- -------------------------------------------------------
-- 3. Residents & Flat Assignments (Phase B.1)
-- -------------------------------------------------------
DO $$
DECLARE
    flat_101_id UUID;
    flat_102_id UUID;
    flat_103_id UUID;
    active_season_id UUID;
    res_john_id UUID;
    res_jane_id UUID;
    res_bob_id UUID;
    res_alice_id UUID;
    mem_john_id UUID;
    mem_bob_id UUID;
    assign_john_cmd UUID;
    assign_john_champ UUID;
    assign_bob UUID;
    port_finance_id UUID;
    port_spon_id UUID;
    port_log_id UUID;
    port_sports_id UUID;
BEGIN
    -- Fetch active season ID
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    
    -- Fetch Flat IDs for Wing N
    SELECT f.id INTO flat_101_id FROM core.flat f JOIN core.wing w ON f.wing_id = w.id WHERE w.name = 'N' AND f.number = '101';
    SELECT f.id INTO flat_102_id FROM core.flat f JOIN core.wing w ON f.wing_id = w.id WHERE w.name = 'N' AND f.number = '102';
    SELECT f.id INTO flat_103_id FROM core.flat f JOIN core.wing w ON f.wing_id = w.id WHERE w.name = 'N' AND f.number = '103';

    -- Fetch Portfolio IDs
    SELECT id INTO port_finance_id FROM core.portfolio WHERE name = 'Finance';
    SELECT id INTO port_spon_id FROM core.portfolio WHERE name = 'Sponsorship';
    SELECT id INTO port_log_id FROM core.portfolio WHERE name = 'Logistics';
    SELECT id INTO port_sports_id FROM core.portfolio WHERE name = 'Sports';

    -- 3.1 Insert Residents
    INSERT INTO core.resident (name, phone, status)
    VALUES ('John Doe', '+919999988888', 'ACTIVE')
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO res_john_id;

    INSERT INTO core.resident (name, phone, status)
    VALUES ('Jane Doe', '+919999988887', 'ACTIVE')
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO res_jane_id;

    INSERT INTO core.resident (name, phone, status)
    VALUES ('Bob Smith', '+919999988886', 'ACTIVE')
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO res_bob_id;

    INSERT INTO core.resident (name, phone, status)
    VALUES ('Alice Cooper', '+919999988885', 'ACTIVE')
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO res_alice_id;

    -- 3.2 Insert User Accounts (linked to residents)
    INSERT INTO core.user_account (phone, resident_id) VALUES
    ('+919999988888', res_john_id),
    ('+919999988887', res_jane_id),
    ('+919999988886', res_bob_id),
    ('+919999988885', res_alice_id)
    ON CONFLICT (phone) DO NOTHING;

    -- 3.3 Create Resident Flat Assignments
    -- Flat 101: John Doe is HOME_CHIEF, Jane Doe is HOME_MEMBER
    INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
    VALUES (res_john_id, flat_101_id, active_season_id, 'HOME_CHIEF', 'OWNER')
    ON CONFLICT (resident_id, flat_id, season_id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
    VALUES (res_jane_id, flat_101_id, active_season_id, 'HOME_MEMBER', 'OWNER')
    ON CONFLICT (resident_id, flat_id, season_id) DO UPDATE SET role = EXCLUDED.role;

    -- Flat 102: Bob Smith is HOME_CHIEF
    INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
    VALUES (res_bob_id, flat_102_id, active_season_id, 'HOME_CHIEF', 'TENANT')
    ON CONFLICT (resident_id, flat_id, season_id) DO UPDATE SET role = EXCLUDED.role;

    -- Flat 103: Alice Cooper is HOME_CHIEF
    INSERT INTO core.resident_flat_assignment (resident_id, flat_id, season_id, role, occupancy_type)
    VALUES (res_alice_id, flat_103_id, active_season_id, 'HOME_CHIEF', 'OWNER')
    ON CONFLICT (resident_id, flat_id, season_id) DO UPDATE SET role = EXCLUDED.role;

    -- -------------------------------------------------------
    -- 4. SCOT Members & Role Assignments (Phase B.1)
    -- -------------------------------------------------------
    
    -- 4.1 Insert SCOT Member Profiles
    -- John Doe is a SCOT Member
    INSERT INTO core.member (id, status)
    VALUES (res_john_id, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
    mem_john_id := res_john_id;

    -- Bob Smith is a SCOT Member
    INSERT INTO core.member (id, status)
    VALUES (res_bob_id, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
    mem_bob_id := res_bob_id;

    -- 4.2 Assign Roles (Season 2026-2027)
    -- John Doe holds WING_COMMANDER (for Wing N) and EVENT_CHAMPION
    INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
    VALUES (mem_john_id, active_season_id, 'WING_COMMANDER', (SELECT id FROM core.wing WHERE name = 'N'))
    ON CONFLICT (member_id, season_id, role) DO NOTHING
    RETURNING id INTO assign_john_cmd;

    INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
    VALUES (mem_john_id, active_season_id, 'EVENT_CHAMPION', NULL)
    ON CONFLICT (member_id, season_id, role) DO NOTHING
    RETURNING id INTO assign_john_champ;

    -- Bob Smith holds CORE_TEAM
    INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
    VALUES (mem_bob_id, active_season_id, 'CORE_TEAM', NULL)
    ON CONFLICT (member_id, season_id, role) DO NOTHING
    RETURNING id INTO assign_bob;

    -- 4.3 Assign Portfolios
    -- John Doe: WING_COMMANDER linked to Logistics portfolio
    IF assign_john_cmd IS NOT NULL THEN
        INSERT INTO core.member_portfolio_assignment (member_assignment_id, portfolio_id)
        VALUES (assign_john_cmd, port_log_id)
        ON CONFLICT (member_assignment_id, portfolio_id) DO NOTHING;
    END IF;

    -- John Doe: EVENT_CHAMPION linked to Sports portfolio
    IF assign_john_champ IS NOT NULL THEN
        INSERT INTO core.member_portfolio_assignment (member_assignment_id, portfolio_id)
        VALUES (assign_john_champ, port_sports_id)
        ON CONFLICT (member_assignment_id, portfolio_id) DO NOTHING;
    END IF;

    -- Bob Smith: CORE_TEAM linked to Finance and Sponsorship portfolios
    IF assign_bob IS NOT NULL THEN
        INSERT INTO core.member_portfolio_assignment (member_assignment_id, portfolio_id) VALUES
        (assign_bob, port_finance_id),
        (assign_bob, port_spon_id)
        ON CONFLICT (member_assignment_id, portfolio_id) DO NOTHING;
    END IF;

END $$;
