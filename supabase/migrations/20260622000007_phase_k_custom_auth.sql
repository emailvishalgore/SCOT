-- =======================================================
-- Migration: Phase K Custom Auth & Resident Registry refactoring
-- Path: supabase/migrations/20260622000007_phase_k_custom_auth.sql
-- =======================================================

-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create registration request tables
CREATE TABLE IF NOT EXISTS core.registration_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    wing_id UUID NOT NULL REFERENCES core.wing(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES core.flat(id) ON DELETE CASCADE,
    pin_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.registration_member_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES core.registration_request(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    age_group VARCHAR(20) NOT NULL CHECK (age_group IN ('UNDER_12', 'BETWEEN_12_18', 'OVER_18'))
);

-- 2. Create login account tables
CREATE TABLE IF NOT EXISTS core.resident_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES core.resident(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    pin_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.organizer_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES core.member(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    pin_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stored Procedure: Submit Registration Request
CREATE OR REPLACE FUNCTION core.submit_registration_request(
    p_username VARCHAR(50),
    p_mobile VARCHAR(20),
    p_wing_id UUID,
    p_flat_id UUID,
    p_pin VARCHAR(20),
    p_members JSONB
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_member RECORD;
BEGIN
    -- Check members limit (Max 7 total, including flat head, so max 6 additional members)
    IF p_members IS NOT NULL AND jsonb_array_length(p_members) > 6 THEN
        RAISE EXCEPTION 'Maximum allowed members per flat is 7';
    END IF;

    -- Check username collision
    IF EXISTS (SELECT 1 FROM core.resident_account WHERE username = p_username) OR
       EXISTS (SELECT 1 FROM core.organizer_account WHERE username = p_username) OR
       EXISTS (SELECT 1 FROM core.registration_request WHERE username = p_username AND status = 'PENDING') THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;

    -- Create request
    INSERT INTO core.registration_request (username, mobile, wing_id, flat_id, pin_hash)
    VALUES (p_username, p_mobile, p_wing_id, p_flat_id, crypt(p_pin, gen_salt('bf')))
    RETURNING id INTO v_request_id;

    -- Create family members
    FOR v_member IN SELECT * FROM jsonb_to_recordset(p_members) AS x(name text, gender text, age_group text) LOOP
        INSERT INTO core.registration_member_request (request_id, name, gender, age_group)
        VALUES (v_request_id, v_member.name, v_member.gender, v_member.age_group);
    END LOOP;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored Procedure: Approve Registration Request
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
    VALUES (v_req.username, v_req.mobile, 'ACTIVE')
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
        VALUES (v_m.name, v_req.mobile, 'ACTIVE')
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

-- 5. Stored Procedure: Delete Flat Entry (Admin utility)
CREATE OR REPLACE FUNCTION core.delete_flat_entry(
    p_flat_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Delete accounts
    DELETE FROM core.resident_account
    WHERE resident_id IN (
        SELECT resident_id FROM core.resident_flat_assignment WHERE flat_id = p_flat_id
    );

    -- Delete assignments
    DELETE FROM core.resident_flat_assignment
    WHERE flat_id = p_flat_id;

    -- Clean orphan resident profiles
    DELETE FROM core.resident
    WHERE id NOT IN (
        SELECT resident_id FROM core.resident_flat_assignment
    ) AND id NOT IN (
        SELECT id FROM core.member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Stored Procedure: Authenticate User
CREATE OR REPLACE FUNCTION core.authenticate_user(
    p_username VARCHAR(50),
    p_pin VARCHAR(20)
) RETURNS JSONB AS $$
DECLARE
    v_resident_rec RECORD;
    v_organizer_rec RECORD;
    v_flat_rec RECORD;
    v_season_id UUID;
    v_wing_id UUID;
    v_flat_id UUID;
    v_role VARCHAR(20);
BEGIN
    -- Check resident account
    SELECT ra.*, r.name, r.id as res_id INTO v_resident_rec
    FROM core.resident_account ra
    JOIN core.resident r ON r.id = ra.resident_id
    WHERE ra.username = p_username AND ra.pin_hash = crypt(p_pin, ra.pin_hash);

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
            'username', p_username,
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
    WHERE oa.username = p_username AND oa.pin_hash = crypt(p_pin, oa.pin_hash);

    IF FOUND THEN
        SELECT id INTO v_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'COORDINATOR',
            'role', COALESCE(v_organizer_rec.org_role, 'CORE_TEAM'),
            'username', p_username,
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

-- 7. Pre-seed Default Organizer (Dave Miller - Admin)
-- We find an existing member or create one dynamically for seed stability.
DO $$
DECLARE
    v_admin_res_id UUID;
    v_admin_mem_id UUID;
    v_active_season_id UUID;
BEGIN
    SELECT id INTO v_active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF v_active_season_id IS NULL THEN
        INSERT INTO core.season (name, start_date, end_date, status)
        VALUES ('Season 2026-2027', '2026-07-01', '2027-06-30', 'ACTIVE')
        RETURNING id INTO v_active_season_id;
    END IF;

    -- Create resident profile if not exists
    SELECT id INTO v_admin_res_id FROM core.resident WHERE name = 'Dave Miller' LIMIT 1;
    IF v_admin_res_id IS NULL THEN
        INSERT INTO core.resident (name, phone, status)
        VALUES ('Dave Miller', '+919999911111', 'ACTIVE')
        RETURNING id INTO v_admin_res_id;
    END IF;

    -- Create member profile if not exists
    SELECT id INTO v_admin_mem_id FROM core.member WHERE id = v_admin_res_id LIMIT 1;
    IF v_admin_mem_id IS NULL THEN
        INSERT INTO core.member (id, status)
        VALUES (v_admin_res_id, 'ACTIVE')
        RETURNING id INTO v_admin_mem_id;
    END IF;

    -- Assign role as SCOT_ADMIN for active season
    IF NOT EXISTS (SELECT 1 FROM core.member_season_assignment WHERE member_id = v_admin_mem_id AND season_id = v_active_season_id) THEN
        INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
        VALUES (v_admin_mem_id, v_active_season_id, 'SCOT_ADMIN', NULL);
    END IF;

    -- Create organizer account if not exists
    IF NOT EXISTS (SELECT 1 FROM core.organizer_account WHERE username = 'dave_miller') THEN
        INSERT INTO core.organizer_account (member_id, username, pin_hash)
        VALUES (v_admin_mem_id, 'dave_miller', crypt('1234', gen_salt('bf')));
    END IF;
END;
$$;
