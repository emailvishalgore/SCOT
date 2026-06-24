-- =======================================================
-- Verification Script: Phase C Events & Registrations
-- Path: verify_phase_c.sql
-- =======================================================

DO $$
DECLARE
    active_season_id uuid;
    flat_101_id uuid;
    flat_102_id uuid;
    flat_103_id uuid;
    res_john_id uuid;
    res_bob_id uuid;
    res_jane_id uuid;
    res_alice_id uuid;
    
    test_event_id uuid := gen_random_uuid();
    test_sub_event_id uuid := gen_random_uuid();
    completed_event_id uuid := gen_random_uuid();
    
    reg_id1 uuid;
    reg_count int;
    ex_msg text;
BEGIN
    RAISE NOTICE 'Starting Phase C Events & Registrations Verification Tests...';

    -- 1. Get dynamically seeded IDs
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF active_season_id IS NULL THEN
        RAISE EXCEPTION 'No active season found for testing.';
    END IF;

    SELECT id INTO res_john_id FROM core.resident WHERE name = 'John Doe' LIMIT 1;
    SELECT id INTO res_jane_id FROM core.resident WHERE name = 'Jane Doe' LIMIT 1;
    SELECT id INTO res_bob_id FROM core.resident WHERE name = 'Bob Smith' LIMIT 1;
    SELECT id INTO res_alice_id FROM core.resident WHERE name = 'Alice Cooper' LIMIT 1;

    SELECT flat_id INTO flat_101_id FROM core.resident_flat_assignment WHERE resident_id = res_john_id LIMIT 1;
    SELECT flat_id INTO flat_102_id FROM core.resident_flat_assignment WHERE resident_id = res_bob_id LIMIT 1;
    SELECT flat_id INTO flat_103_id FROM core.resident_flat_assignment WHERE resident_id = res_alice_id LIMIT 1;

    -- 2. Seed flat contributions for testing
    -- Flat 101 (John/Jane) is PAID
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
    VALUES (flat_101_id, active_season_id, 3000.00, 'PAID')
    ON CONFLICT (flat_id, season_id) DO UPDATE SET status = 'PAID';

    -- Flat 102 (Bob) is PENDING
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
    VALUES (flat_102_id, active_season_id, 3000.00, 'PENDING')
    ON CONFLICT (flat_id, season_id) DO UPDATE SET status = 'PENDING';

    -- Flat 103 (Alice) is PAID
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
    VALUES (flat_103_id, active_season_id, 3000.00, 'PAID')
    ON CONFLICT (flat_id, season_id) DO UPDATE SET status = 'PAID';

    -- 3. Create test events
    INSERT INTO core.event (id, season_id, name, description, start_date, end_date, venue, status)
    VALUES (test_event_id, active_season_id, 'Test Cricket Championship', 'Annual cricket event', NOW(), NOW() + interval '5 days', 'Main Ground', 'ACTIVE');

    INSERT INTO core.sub_event (id, umbrella_event_id, name, description, start_date, end_date, venue, status)
    VALUES (test_sub_event_id, test_event_id, 'Test U-19 Cricket Match', 'U19 match', NOW(), NOW() + interval '2 days', 'Main Ground', 'ACTIVE');

    INSERT INTO core.event (id, season_id, name, description, start_date, end_date, venue, status)
    VALUES (completed_event_id, active_season_id, 'Completed Table Tennis Cup', 'TT event', NOW() - interval '5 days', NOW() - interval '3 days', 'Clubhouse', 'COMPLETED');

    -- =========================================================================
    -- Test 1: Successful registration (Flat is PAID)
    -- =========================================================================
    RAISE NOTICE 'Test 1: Success Path Registration (PAID Flat)...';
    INSERT INTO core.registration (event_id, resident_id, registration_method)
    VALUES (test_event_id, res_john_id, 'SELF')
    RETURNING id INTO reg_id1;

    SELECT count(*) INTO reg_count FROM core.registration WHERE id = reg_id1;
    IF reg_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Registration was not successfully recorded in core.registration.';
    END IF;
    RAISE NOTICE 'Test 1 Passed.';

    -- =========================================================================
    -- Test 2: Gated registration failure (Flat is PENDING)
    -- =========================================================================
    RAISE NOTICE 'Test 2: Gated Registration (PENDING Flat - Should fail)...';
    BEGIN
        INSERT INTO core.registration (event_id, resident_id, registration_method)
        VALUES (test_event_id, res_bob_id, 'SELF');
        RAISE EXCEPTION 'AssertionFailed: Registration allowed for flat with pending dues.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%contribution is pending%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during pending dues test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 2 Passed (Correctly rejected due to pending dues: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 3: Double target verification (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 3: Mutually Exclusive Targets (Both event and sub-event - Should fail)...';
    BEGIN
        INSERT INTO core.registration (event_id, sub_event_id, resident_id, registration_method)
        VALUES (test_event_id, test_sub_event_id, res_jane_id, 'SELF');
        RAISE EXCEPTION 'AssertionFailed: Registration allowed for both event and sub-event.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%Must register for either an event or a sub-event%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during mutual exclusion check: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 3 Passed (Correctly rejected double targets: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 4: Duplicate registration prevention (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 4: Duplicate Registration Check (Should fail)...';
    BEGIN
        INSERT INTO core.registration (event_id, resident_id, registration_method)
        VALUES (test_event_id, res_john_id, 'SELF');
        RAISE EXCEPTION 'AssertionFailed: Double registration allowed for same resident and event.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%Resident is already registered%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during duplicate registration check: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 4 Passed (Correctly rejected duplicate registration: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 5: Closed event registration prevention (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 5: Completed Event Registration (Should fail)...';
    BEGIN
        INSERT INTO core.registration (event_id, resident_id, registration_method)
        VALUES (completed_event_id, res_jane_id, 'SELF');
        RAISE EXCEPTION 'AssertionFailed: Registration allowed for completed event.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%completed or cancelled%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during completed event check: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 5 Passed (Correctly rejected closed event registration: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 6: Inactive resident registration prevention (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 6: Inactive Resident Registration (Should fail)...';
    -- Set Alice Cooper as INACTIVE
    UPDATE core.resident SET status = 'INACTIVE' WHERE id = res_alice_id;

    BEGIN
        INSERT INTO core.registration (event_id, resident_id, registration_method)
        VALUES (test_event_id, res_alice_id, 'SELF');
        RAISE EXCEPTION 'AssertionFailed: Registration allowed for inactive resident.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%inactive resident%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during inactive resident check: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 6 Passed (Correctly rejected inactive resident: %).', ex_msg;
    END;

    -- Restore Alice Cooper status
    UPDATE core.resident SET status = 'ACTIVE' WHERE id = res_alice_id;

    -- =========================================================================
    -- 4. Cleanup
    -- =========================================================================
    RAISE NOTICE 'Cleaning up test event and registration records...';
    DELETE FROM core.registration WHERE event_id = test_event_id;
    DELETE FROM core.sub_event WHERE id = test_sub_event_id;
    DELETE FROM core.event WHERE id IN (test_event_id, completed_event_id);
    DELETE FROM finance.flat_contribution WHERE flat_id IN (flat_101_id, flat_102_id, flat_103_id);

    RAISE NOTICE 'All Phase C Verification Tests Completed Successfully!';
END $$;
