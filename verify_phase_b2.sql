-- =======================================================
-- Verification Script: Phase B.2 Auth Onboarding Triggers
-- Path: verify_phase_b2.sql
-- =======================================================

DO $$
DECLARE
    wing_n_id uuid;
    flat_101_id uuid;
    flat_102_id uuid;
    flat_103_id uuid;
    flat_104_id uuid;
    test_user_id1 uuid := gen_random_uuid();
    test_user_id2 uuid := gen_random_uuid();
    test_user_id3 uuid := gen_random_uuid();
    test_user_id4 uuid := gen_random_uuid();
    test_user_id5 uuid := gen_random_uuid();
    test_user_id6 uuid := gen_random_uuid();
    
    res_count int;
    acc_count int;
    mem_count int;
    assign_count int;
    flat_assign_count int;
    
    ex_msg text;
    resident_id_claim uuid;
BEGIN
    RAISE NOTICE 'Starting Phase B.2 Auth Onboarding Verification Tests...';

    -- Get Wing N ID
    SELECT id INTO wing_n_id FROM core.wing WHERE name = 'N';
    
    -- Get Flat IDs for Wing N
    SELECT f.id INTO flat_101_id FROM core.flat f WHERE f.wing_id = wing_n_id AND f.number = '101';
    SELECT f.id INTO flat_102_id FROM core.flat f WHERE f.wing_id = wing_n_id AND f.number = '102';
    SELECT f.id INTO flat_103_id FROM core.flat f WHERE f.wing_id = wing_n_id AND f.number = '103';
    SELECT f.id INTO flat_104_id FROM core.flat f WHERE f.wing_id = wing_n_id AND f.number = '104';

    -- =========================================================================
    -- Test 1: SCOT_ADMIN Signup (Success case)
    -- =========================================================================
    RAISE NOTICE 'Test 1: SCOT_ADMIN Signup...';
    INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
    VALUES (
        test_user_id1,
        '+919876543210',
        jsonb_build_object('name', 'Admin Test User', 'role', 'SCOT_ADMIN'),
        'admin.test@topaz.com',
        'password_hash_dummy',
        'authenticated',
        'authenticated'
    );
    
    -- Assertions for Test 1
    SELECT count(*) INTO res_count FROM core.resident WHERE phone = '+919876543210';
    IF res_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Resident record was not created for SCOT_ADMIN';
    END IF;
    
    SELECT count(*) INTO acc_count FROM core.user_account WHERE phone = '+919876543210' AND auth_user_id = test_user_id1;
    IF acc_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: User account was not created for SCOT_ADMIN';
    END IF;

    SELECT count(*) INTO mem_count FROM core.member WHERE id = (SELECT resident_id FROM core.user_account WHERE auth_user_id = test_user_id1);
    IF mem_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Member record was not created for SCOT_ADMIN';
    END IF;

    SELECT count(*) INTO assign_count FROM core.member_season_assignment WHERE member_id = (SELECT resident_id FROM core.user_account WHERE auth_user_id = test_user_id1) AND role = 'SCOT_ADMIN';
    IF assign_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Member season assignment was not created for SCOT_ADMIN';
    END IF;

    SELECT (raw_user_meta_data ->> 'resident_id')::uuid INTO resident_id_claim FROM auth.users WHERE id = test_user_id1;
    IF resident_id_claim IS NULL THEN
        RAISE EXCEPTION 'AssertionFailed: auth.users metadata was not updated with resident_id';
    END IF;

    RAISE NOTICE 'Test 1 Passed.';

    -- =========================================================================
    -- Test 2: HOME_CHIEF Signup (Success case)
    -- =========================================================================
    RAISE NOTICE 'Test 2: HOME_CHIEF Signup...';
    -- Flat 104 is currently unoccupied in the seed. Let's register a head user for it.
    INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
    VALUES (
        test_user_id2,
        '+919876543211',
        jsonb_build_object('name', 'Chief Test User', 'role', 'HOME_CHIEF', 'flat_id', flat_104_id, 'occupancy_type', 'OWNER'),
        'chief.test@topaz.com',
        'password_hash_dummy',
        'authenticated',
        'authenticated'
    );
    
    -- Assertions for Test 2
    SELECT count(*) INTO res_count FROM core.resident WHERE phone = '+919876543211';
    IF res_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Resident record was not created for HOME_CHIEF';
    END IF;

    SELECT count(*) INTO flat_assign_count FROM core.resident_flat_assignment rfa 
    JOIN core.user_account ua ON rfa.resident_id = ua.resident_id
    WHERE ua.auth_user_id = test_user_id2 AND rfa.flat_id = flat_104_id AND rfa.role = 'HOME_CHIEF';
    IF flat_assign_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Flat assignment was not created for HOME_CHIEF';
    END IF;
    
    RAISE NOTICE 'Test 2 Passed.';

    -- =========================================================================
    -- Test 3: HOME_MEMBER Signup on same flat (Success case)
    -- =========================================================================
    RAISE NOTICE 'Test 3: HOME_MEMBER Signup...';
    INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
    VALUES (
        test_user_id3,
        '+919876543212',
        jsonb_build_object('name', 'Member Test User', 'role', 'HOME_MEMBER', 'flat_id', flat_104_id, 'occupancy_type', 'OWNER'),
        'member.test@topaz.com',
        'password_hash_dummy',
        'authenticated',
        'authenticated'
    );

    -- Assertions for Test 3
    SELECT count(*) INTO flat_assign_count FROM core.resident_flat_assignment rfa 
    JOIN core.user_account ua ON rfa.resident_id = ua.resident_id
    WHERE ua.auth_user_id = test_user_id3 AND rfa.flat_id = flat_104_id AND rfa.role = 'HOME_MEMBER';
    IF flat_assign_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Flat assignment was not created for HOME_MEMBER';
    END IF;

    RAISE NOTICE 'Test 3 Passed.';

    -- =========================================================================
    -- Test 4: Duplicate HOME_CHIEF (Fail case)
    -- =========================================================================
    RAISE NOTICE 'Test 4: Duplicate HOME_CHIEF Signup (Should fail)...';
    BEGIN
        INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
        VALUES (
            test_user_id4,
            '+919876543213',
            jsonb_build_object('name', 'Duplicate Chief Test User', 'role', 'HOME_CHIEF', 'flat_id', flat_104_id, 'occupancy_type', 'OWNER'),
            'dup.chief@topaz.com',
            'password_hash_dummy',
            'authenticated',
            'authenticated'
        );
        RAISE EXCEPTION 'AssertionFailed: Duplicate HOME_CHIEF signup did not raise exception';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%already has a Head User%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected error message for duplicate chief: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 4 Passed (Successfully rejected duplicate HOME_CHIEF: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 5: Missing Name (Fail case)
    -- =========================================================================
    RAISE NOTICE 'Test 5: Missing Name Signup (Should fail)...';
    BEGIN
        INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
        VALUES (
            test_user_id5,
            '+919876543214',
            jsonb_build_object('role', 'HOME_MEMBER', 'flat_id', flat_104_id),
            'missing.name@topaz.com',
            'password_hash_dummy',
            'authenticated',
            'authenticated'
        );
        RAISE EXCEPTION 'AssertionFailed: Signup without name did not raise exception';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%Name is required%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected error message for missing name: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 5 Passed (Successfully rejected missing name: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 6: Duplicate Phone in core.resident (Fail case)
    -- =========================================================================
    RAISE NOTICE 'Test 6: Duplicate Phone Signup (Should fail)...';
    BEGIN
        INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
        VALUES (
            test_user_id5, -- Use unused UUID
            '+919999988888', -- Already exists in core.resident (seeded) but not in auth.users
            jsonb_build_object('name', 'Duplicate Phone User', 'role', 'HOME_MEMBER', 'flat_id', flat_104_id),
            'dup.phone@topaz.com',
            'password_hash_dummy',
            'authenticated',
            'authenticated'
        );
        RAISE EXCEPTION 'AssertionFailed: Signup with duplicate phone did not raise exception';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%Phone number%already registered%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected error message for duplicate phone: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 6 Passed (Successfully rejected duplicate phone: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 7: WING_COMMANDER Signup checks (Success case)
    -- =========================================================================
    RAISE NOTICE 'Test 7: WING_COMMANDER Signup...';
    INSERT INTO auth.users (id, phone, raw_user_meta_data, email, encrypted_password, aud, role)
    VALUES (
        test_user_id6,
        '+919876543215',
        jsonb_build_object('name', 'Commander Test User', 'role', 'WING_COMMANDER', 'wing_id', wing_n_id),
        'commander.test@topaz.com',
        'password_hash_dummy',
        'authenticated',
        'authenticated'
    );
    
    -- Assertions for Test 7
    SELECT count(*) INTO res_count FROM core.resident WHERE phone = '+919876543215';
    IF res_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Resident record was not created for WING_COMMANDER';
    END IF;

    SELECT count(*) INTO assign_count FROM core.member_season_assignment WHERE member_id = (SELECT resident_id FROM core.user_account WHERE auth_user_id = test_user_id6) AND role = 'WING_COMMANDER' AND wing_id = wing_n_id;
    IF assign_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: member_season_assignment wing_id is incorrect or null for WING_COMMANDER';
    END IF;

    RAISE NOTICE 'Test 7 Passed.';

    -- =========================================================================
    -- Cleanup: Delete test auth users to leave DB in clean seed state
    -- =========================================================================
    RAISE NOTICE 'Cleaning up test accounts...';
    DELETE FROM auth.users WHERE id IN (test_user_id1, test_user_id2, test_user_id3, test_user_id6);
    
    RAISE NOTICE 'All Phase B.2 Verification Tests Completed Successfully!';
END $$;
