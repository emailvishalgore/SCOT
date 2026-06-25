-- =======================================================
-- Migration: Phase N Organizer Registration & Safety checks
-- Path: supabase/migrations/20260622000008_organizer_registration.sql
-- =======================================================

-- 1. Make mobile nullable in registration_request to remove phone references
ALTER TABLE core.registration_request ALTER COLUMN mobile DROP NOT NULL;

-- 2. Drop NOT NULL and UNIQUE constraints on core.resident.phone to completely remove phone/mobile dependency
ALTER TABLE core.resident ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE core.resident DROP CONSTRAINT IF EXISTS resident_phone_key;

-- 3. Create organizer registration request table
CREATE TABLE IF NOT EXISTS core.organizer_registration_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CORE_TEAM', 'WING_COMMANDER', 'WING_CAPTAIN', 'EVENT_CHAMPION')),
    wing_id UUID REFERENCES core.wing(id) ON DELETE SET NULL,
    pin_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stored Procedure: Submit Organizer Registration Request
CREATE OR REPLACE FUNCTION core.submit_organizer_registration_request(
    p_username VARCHAR(50),
    p_role VARCHAR(20),
    p_wing_id UUID,
    p_pin VARCHAR(20)
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_lower_username VARCHAR(50);
BEGIN
    v_lower_username := LOWER(p_username);

    -- Check username collision
    IF EXISTS (SELECT 1 FROM core.resident_account WHERE username = v_lower_username) OR
       EXISTS (SELECT 1 FROM core.organizer_account WHERE username = v_lower_username) OR
       EXISTS (SELECT 1 FROM core.registration_request WHERE username = v_lower_username AND status = 'PENDING') OR
       EXISTS (SELECT 1 FROM core.organizer_registration_request WHERE username = v_lower_username AND status = 'PENDING') THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;

    INSERT INTO core.organizer_registration_request (username, role, wing_id, pin_hash)
    VALUES (v_lower_username, p_role, p_wing_id, crypt(p_pin, gen_salt('bf')))
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Stored Procedure: Approve Organizer Registration Request
CREATE OR REPLACE FUNCTION core.approve_organizer_registration_request(
    p_request_id UUID,
    p_approver_member_id UUID
) RETURNS VOID AS $$
DECLARE
    v_req RECORD;
    v_new_resident_id UUID;
    v_active_season_id UUID;
BEGIN
    SELECT * INTO v_req FROM core.organizer_registration_request WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organizer registration request not found';
    END IF;

    IF v_req.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Request has already been processed';
    END IF;

    SELECT id INTO v_active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF v_active_season_id IS NULL THEN
        -- Fallback: insert one if it doesn't exist
        INSERT INTO core.season (name, start_date, end_date, status)
        VALUES ('Season 2026-2027', '2026-07-01', '2027-06-30', 'ACTIVE')
        RETURNING id INTO v_active_season_id;
    END IF;

    -- 1. Create resident profile
    INSERT INTO core.resident (name, phone, status)
    VALUES (v_req.username, NULL, 'ACTIVE')
    RETURNING id INTO v_new_resident_id;

    -- 2. Create member profile
    INSERT INTO core.member (id, status)
    VALUES (v_new_resident_id, 'ACTIVE');

    -- 3. Create season assignment
    INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
    VALUES (v_new_resident_id, v_active_season_id, v_req.role, v_req.wing_id);

    -- 4. Create organizer account
    INSERT INTO core.organizer_account (member_id, username, pin_hash)
    VALUES (v_new_resident_id, v_req.username, v_req.pin_hash);

    -- 5. Mark request as APPROVED
    UPDATE core.organizer_registration_request
    SET status = 'APPROVED'
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Stored Procedure: Submit Registration Request (redefined for no mobile field + case-insensitive usernames)
CREATE OR REPLACE FUNCTION core.submit_registration_request(
    p_username VARCHAR(50),
    p_wing_id UUID,
    p_flat_id UUID,
    p_pin VARCHAR(20),
    p_members JSONB
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_member RECORD;
    v_lower_username VARCHAR(50);
BEGIN
    v_lower_username := LOWER(p_username);

    -- Check members limit (Max 7 total, including flat head, so max 6 additional members)
    IF p_members IS NOT NULL AND jsonb_array_length(p_members) > 6 THEN
        RAISE EXCEPTION 'Maximum allowed members per flat is 7';
    END IF;

    -- Check username collision
    IF EXISTS (SELECT 1 FROM core.resident_account WHERE username = v_lower_username) OR
       EXISTS (SELECT 1 FROM core.organizer_account WHERE username = v_lower_username) OR
       EXISTS (SELECT 1 FROM core.registration_request WHERE username = v_lower_username AND status = 'PENDING') OR
       EXISTS (SELECT 1 FROM core.organizer_registration_request WHERE username = v_lower_username AND status = 'PENDING') THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;

    -- Create request
    INSERT INTO core.registration_request (username, mobile, wing_id, flat_id, pin_hash)
    VALUES (v_lower_username, NULL, p_wing_id, p_flat_id, crypt(p_pin, gen_salt('bf')))
    RETURNING id INTO v_request_id;

    -- Create family members
    FOR v_member IN SELECT * FROM jsonb_to_recordset(p_members) AS x(name text, gender text, age_group text) LOOP
        INSERT INTO core.registration_member_request (request_id, name, gender, age_group)
        VALUES (v_request_id, v_member.name, v_member.gender, v_member.age_group);
    END LOOP;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Stored Procedure: Approve Registration Request (redefined for no mobile phone field)
CREATE OR REPLACE FUNCTION core.approve_registration_request(
    p_request_id UUID,
    p_approver_member_id UUID
) RETURNS VOID AS $$
DECLARE
    v_req RECORD;
    v_m RECORD;
    v_primary_resident_id UUID;
    v_family_resident_id UUID;
BEGIN
    SELECT * INTO v_req FROM core.registration_request WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration request not found';
    END IF;

    IF v_req.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Request has already been processed';
    END IF;

    -- 1. Create primary resident
    INSERT INTO core.resident (name, phone, status)
    VALUES (v_req.username, NULL, 'ACTIVE')
    RETURNING id INTO v_primary_resident_id;

    INSERT INTO core.resident_flat_assignment (resident_id, flat_id, occupancy_role, occupancy_type, season_id)
    SELECT v_primary_resident_id, v_req.flat_id, 'HOME_CHIEF', 'OWNER', s.id
    FROM core.season s WHERE s.status = 'ACTIVE' LIMIT 1;

    -- 2. Create resident account
    INSERT INTO core.resident_account (resident_id, username, pin_hash)
    VALUES (v_primary_resident_id, v_req.username, v_req.pin_hash);

    -- 3. Create family members
    FOR v_m IN SELECT * FROM core.registration_member_request WHERE request_id = p_request_id LOOP
        INSERT INTO core.resident (name, phone, status)
        VALUES (v_m.name, NULL, 'ACTIVE')
        RETURNING id INTO v_family_resident_id;

        INSERT INTO core.resident_flat_assignment (resident_id, flat_id, occupancy_role, occupancy_type, season_id)
        SELECT v_family_resident_id, v_req.flat_id, 'HOME_MEMBER', 'OWNER', s.id
        FROM core.season s WHERE s.status = 'ACTIVE' LIMIT 1;
    END LOOP;

    -- 4. Set request status to APPROVED
    UPDATE core.registration_request
    SET status = 'APPROVED'
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Stored Procedure: Authenticate User (redefined to be case-insensitive for usernames)
CREATE OR REPLACE FUNCTION core.authenticate_user(
    p_username VARCHAR(50),
    p_pin VARCHAR(20)
) RETURNS JSONB AS $$
DECLARE
    v_resident_rec RECORD;
    v_organizer_rec RECORD;
    v_season_id UUID;
    v_wing_id UUID;
    v_flat_id UUID;
    v_role VARCHAR(20);
    v_lower_username VARCHAR(50);
BEGIN
    v_lower_username := LOWER(p_username);

    -- Check resident account
    SELECT ra.*, r.name, r.id as res_id INTO v_resident_rec
    FROM core.resident_account ra
    JOIN core.resident r ON r.id = ra.resident_id
    WHERE ra.username = v_lower_username AND ra.pin_hash = crypt(p_pin, ra.pin_hash);

    IF FOUND THEN
        SELECT rfa.flat_id, rfa.occupancy_role, f.wing_id INTO v_flat_id, v_role, v_wing_id
        FROM core.resident_flat_assignment rfa
        JOIN core.flat f ON f.id = rfa.flat_id
        WHERE rfa.resident_id = v_resident_rec.res_id LIMIT 1;

        SELECT id INTO v_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'RESIDENT',
            'role', COALESCE(v_role, 'HOME_MEMBER'),
            'username', v_lower_username,
            'name', v_resident_rec.name,
            'resident_id', v_resident_rec.res_id,
            'flat_id', v_flat_id,
            'wing_id', v_wing_id,
            'season_id', v_season_id
        );
    END IF;

    -- Check coordinator account
    SELECT oa.*, r.name, m.id as mem_id, msa.role as org_role, msa.wing_id as assigned_wing_id INTO v_organizer_rec
    FROM core.organizer_account oa
    JOIN core.member m ON m.id = oa.member_id
    JOIN core.resident r ON r.id = m.id
    LEFT JOIN core.member_season_assignment msa ON msa.member_id = m.id
    WHERE oa.username = v_lower_username AND oa.pin_hash = crypt(p_pin, oa.pin_hash);

    IF FOUND THEN
        SELECT id INTO v_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'COORDINATOR',
            'role', COALESCE(v_organizer_rec.org_role, 'CORE_TEAM'),
            'username', v_lower_username,
            'name', v_organizer_rec.name,
            'member_id', v_organizer_rec.mem_id,
            'resident_id', v_organizer_rec.mem_id,
            'wing_id', v_organizer_rec.assigned_wing_id,
            'season_id', v_season_id
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Invalid username or PIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Clean up test logins and Pre-seed Predefined Main SCOT Admins
DO $$
DECLARE
    v_res_id UUID;
    v_mem_id UUID;
    v_active_season_id UUID;
BEGIN
    -- Cleanup Dave Miller account from 000007 migration (and any other potential test accounts)
    DELETE FROM core.organizer_account WHERE username = 'dave_miller';
    DELETE FROM core.member WHERE id IN (SELECT id FROM core.resident WHERE name = 'Dave Miller');
    DELETE FROM core.member_season_assignment WHERE member_id IN (SELECT id FROM core.resident WHERE name = 'Dave Miller');
    DELETE FROM core.resident WHERE name = 'Dave Miller';

    SELECT id INTO v_active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF v_active_season_id IS NULL THEN
        INSERT INTO core.season (name, start_date, end_date, status)
        VALUES ('Season 2026-2027', '2026-07-01', '2027-06-30', 'ACTIVE')
        RETURNING id INTO v_active_season_id;
    END IF;

    -- Pre-seed SCOTAdmin1 (PIN 0122)
    SELECT id INTO v_res_id FROM core.resident WHERE name = 'SCOT Admin 1' LIMIT 1;
    IF v_res_id IS NULL THEN
        INSERT INTO core.resident (name, phone, status)
        VALUES ('SCOT Admin 1', NULL, 'ACTIVE')
        RETURNING id INTO v_res_id;
    END IF;

    SELECT id INTO v_mem_id FROM core.member WHERE id = v_res_id LIMIT 1;
    IF v_mem_id IS NULL THEN
        INSERT INTO core.member (id, status)
        VALUES (v_res_id, 'ACTIVE')
        RETURNING id INTO v_mem_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM core.member_season_assignment WHERE member_id = v_mem_id AND season_id = v_active_season_id) THEN
        INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
        VALUES (v_mem_id, v_active_season_id, 'SCOT_ADMIN', NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM core.organizer_account WHERE username = 'scotadmin1') THEN
        INSERT INTO core.organizer_account (member_id, username, pin_hash)
        VALUES (v_mem_id, 'scotadmin1', crypt('0122', gen_salt('bf')));
    END IF;

    -- Pre-seed SCOTAdmin2 (PIN 0133)
    SELECT id INTO v_res_id FROM core.resident WHERE name = 'SCOT Admin 2' LIMIT 1;
    IF v_res_id IS NULL THEN
        INSERT INTO core.resident (name, phone, status)
        VALUES ('SCOT Admin 2', NULL, 'ACTIVE')
        RETURNING id INTO v_res_id;
    END IF;

    SELECT id INTO v_mem_id FROM core.member WHERE id = v_res_id LIMIT 1;
    IF v_mem_id IS NULL THEN
        INSERT INTO core.member (id, status)
        VALUES (v_res_id, 'ACTIVE')
        RETURNING id INTO v_mem_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM core.member_season_assignment WHERE member_id = v_mem_id AND season_id = v_active_season_id) THEN
        INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
        VALUES (v_mem_id, v_active_season_id, 'SCOT_ADMIN', NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM core.organizer_account WHERE username = 'scotadmin2') THEN
        INSERT INTO core.organizer_account (member_id, username, pin_hash)
        VALUES (v_mem_id, 'scotadmin2', crypt('0133', gen_salt('bf')));
    END IF;
END;
$$;
