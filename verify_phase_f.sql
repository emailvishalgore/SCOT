-- =======================================================
-- Verification Script: Phase F Media & Communications
-- Path: verify_phase_f.sql
-- =======================================================

-- =========================================================================
-- Part 1: Setup and Administrative Verification (Runs as postgres superuser)
-- =========================================================================
DO $$
DECLARE
    active_season_id uuid;
    wing_n_id uuid;
    wing_o_id uuid;
    flat_n101_id uuid;
    res_john_id uuid;
    res_jane_id uuid;
    res_bob_id uuid;
    
    test_event_id uuid := '11111111-1111-1111-1111-111111111111';
    test_sub_event_id uuid := '22222222-2222-2222-2222-222222222222';
    
    ann_id1 uuid := 'a1111111-1111-1111-1111-111111111111';
    ann_id2 uuid := 'a2222222-2222-2222-2222-222222222222';
    ann_id3 uuid := 'a3333333-3333-3333-3333-333333333333';
    
    test_poll_id uuid := 'd1111111-1111-1111-1111-111111111111';
    vote_id uuid;
    
    test_album_id uuid := 'ab111111-1111-1111-1111-111111111111';
    test_media_id uuid := 'c1111111-1111-1111-1111-111111111111';
    
    temp_count int;
    ex_msg text;
BEGIN
    RAISE NOTICE 'Starting Phase F Media & Communications Verification Tests...';

    -- 1. Get Dynamically Seeded IDs
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    IF active_season_id IS NULL THEN
        RAISE EXCEPTION 'No active season found for testing.';
    END IF;

    SELECT id INTO wing_n_id FROM core.wing WHERE name = 'N' LIMIT 1;
    SELECT id INTO wing_o_id FROM core.wing WHERE name = 'O' LIMIT 1;
    
    SELECT id INTO res_john_id FROM core.resident WHERE name = 'John Doe' LIMIT 1;
    SELECT id INTO res_jane_id FROM core.resident WHERE name = 'Jane Doe' LIMIT 1;
    SELECT id INTO res_bob_id FROM core.resident WHERE name = 'Bob Smith' LIMIT 1;

    SELECT flat_id INTO flat_n101_id FROM core.resident_flat_assignment WHERE resident_id = res_john_id LIMIT 1;

    -- Clean up any existing Phase F test data to ensure clean run
    DELETE FROM core.media_item WHERE id = test_media_id OR uploaded_by_id = res_john_id;
    DELETE FROM core.gallery_album WHERE id = test_album_id OR created_by_id = res_john_id;
    DELETE FROM core.poll_vote WHERE poll_id = test_poll_id OR resident_id IN (res_john_id, res_jane_id, res_bob_id);
    DELETE FROM core.poll WHERE id = test_poll_id OR created_by_id = res_john_id;
    DELETE FROM core.announcement WHERE id IN (ann_id1, ann_id2, ann_id3) OR author_id = res_john_id;
    DELETE FROM core.event_assignment WHERE event_id = test_event_id;
    DELETE FROM core.event WHERE id = test_event_id;

    -- Create test event and sub-event
    INSERT INTO core.event (id, season_id, name, description, start_date, end_date, venue, status)
    VALUES (test_event_id, active_season_id, 'Sports Fest', 'Annual sports festival', NOW(), NOW() + interval '5 days', 'Central Turf', 'ACTIVE');

    INSERT INTO core.sub_event (id, umbrella_event_id, name, description, start_date, end_date, venue, status)
    VALUES (test_sub_event_id, test_event_id, 'Cricket Finals', 'Final match', NOW(), NOW() + interval '2 days', 'Central Turf', 'ACTIVE');

    -- Create event champion assignment for John
    -- First make sure John has a season assignment
    INSERT INTO core.member_season_assignment (member_id, season_id, role, wing_id)
    VALUES (res_john_id, active_season_id, 'EVENT_CHAMPION', wing_n_id)
    ON CONFLICT (member_id, season_id, role) DO UPDATE SET wing_id = EXCLUDED.wing_id;

    INSERT INTO core.event_assignment (member_assignment_id, event_id)
    SELECT id, test_event_id FROM core.member_season_assignment 
    WHERE member_id = res_john_id AND season_id = active_season_id;

    -- =========================================================================
    -- Test 1: Create Global and Wing Announcements (Constraint Checks)
    -- =========================================================================
    RAISE NOTICE 'Test 1: Creating global and wing announcements...';

    -- Create Global
    INSERT INTO core.announcement (id, season_id, title, description, scope, author_id)
    VALUES (ann_id1, active_season_id, 'Global Notice', 'Welcome to Season!', 'GLOBAL', res_john_id);

    -- Create Wing
    INSERT INTO core.announcement (id, season_id, title, description, scope, wing_id, author_id)
    VALUES (ann_id2, active_season_id, 'Wing N Notice', 'Meeting at Wing N', 'WING', wing_n_id, res_john_id);

    -- Create Event
    INSERT INTO core.announcement (id, season_id, title, description, scope, event_id, author_id)
    VALUES (ann_id3, active_season_id, 'Sports Fest Notice', 'Match starting soon', 'EVENT', test_event_id, res_john_id);

    SELECT count(*) INTO temp_count FROM core.announcement WHERE id IN (ann_id1, ann_id2, ann_id3);
    IF temp_count <> 3 THEN
        RAISE EXCEPTION 'AssertionFailed: Announcements were not successfully recorded.';
    END IF;
    
    RAISE NOTICE 'Test 1 Passed.';

    -- =========================================================================
    -- Test 2: Announcement Targets Mutually Exclusive Constraints
    -- =========================================================================
    RAISE NOTICE 'Test 2: Verifying announcement constraints (Should fail)...';

    -- Attempt 1: GLOBAL with a wing_id set
    BEGIN
        INSERT INTO core.announcement (season_id, title, description, scope, wing_id, author_id)
        VALUES (active_season_id, 'Bad Global Notice', 'Test description', 'GLOBAL', wing_n_id, res_john_id);
        RAISE EXCEPTION 'AssertionFailed: Allowed GLOBAL announcement to have wing_id set.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%check_announcement_target%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during bad global notice test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 2.1 Passed (Correctly rejected bad GLOBAL target: %).', ex_msg;
    END;

    -- Attempt 2: WING without a wing_id set
    BEGIN
        INSERT INTO core.announcement (season_id, title, description, scope, author_id)
        VALUES (active_season_id, 'Bad Wing Notice', 'Test description', 'WING', res_john_id);
        RAISE EXCEPTION 'AssertionFailed: Allowed WING announcement to omit wing_id.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%check_announcement_target%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during bad wing notice test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 2.2 Passed (Correctly rejected bad WING target: %).', ex_msg;
    END;

    -- Attempt 3: EVENT with both wing_id and event_id set
    BEGIN
        INSERT INTO core.announcement (season_id, title, description, scope, wing_id, event_id, author_id)
        VALUES (active_season_id, 'Bad Event Notice', 'Test description', 'EVENT', wing_n_id, test_event_id, res_john_id);
        RAISE EXCEPTION 'AssertionFailed: Allowed EVENT announcement to have both wing_id and event_id set.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%check_announcement_target%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during bad event notice test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 2.3 Passed (Correctly rejected bad EVENT target: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 3: Create Poll & Submit Vote
    -- =========================================================================
    RAISE NOTICE 'Test 3: Creating poll and submitting vote...';

    INSERT INTO core.poll (id, season_id, title, description, options, status, created_by_id)
    VALUES (test_poll_id, active_season_id, 'Logistics Poll', 'Choose Turf A or B', '["Turf A", "Turf B"]'::jsonb, 'ACTIVE', res_john_id);

    INSERT INTO core.poll_vote (poll_id, resident_id, selected_option)
    VALUES (test_poll_id, res_john_id, 'Turf A')
    RETURNING id INTO vote_id;

    SELECT count(*) INTO temp_count FROM core.poll_vote WHERE id = vote_id;
    IF temp_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Poll vote not recorded.';
    END IF;

    RAISE NOTICE 'Test 3 Passed.';

    -- =========================================================================
    -- Test 4: Poll Double Vote Protection (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 4: Verifying double vote protection (Should fail)...';

    BEGIN
        INSERT INTO core.poll_vote (poll_id, resident_id, selected_option)
        VALUES (test_poll_id, res_john_id, 'Turf B');
        RAISE EXCEPTION 'AssertionFailed: Allowed duplicate vote from same resident on same poll.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%unique_resident_poll_vote%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during duplicate vote test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 4 Passed (Correctly rejected duplicate vote: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 5: Create Gallery Album and Upload Media Item
    -- =========================================================================
    RAISE NOTICE 'Test 5: Creating gallery album and media item...';

    INSERT INTO core.gallery_album (id, season_id, event_id, title, description, created_by_id)
    VALUES (test_album_id, active_season_id, test_event_id, 'Ganesh Utsav Photos', 'Photos of the festival', res_john_id);

    INSERT INTO core.media_item (id, album_id, type, url, uploaded_by_id)
    VALUES (test_media_id, test_album_id, 'PHOTO', 'https://drive.google.com/file/d/test-id-123/view', res_john_id);

    SELECT count(*) INTO temp_count FROM core.media_item WHERE id = test_media_id;
    IF temp_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Media item was not successfully recorded.';
    END IF;

    RAISE NOTICE 'Test 5 Passed.';

    -- =========================================================================
    -- Test 6: Gallery Album Constraints
    -- =========================================================================
    RAISE NOTICE 'Test 6: Verifying gallery album constraints (Should fail)...';

    -- Attempt 1: Setting both event_id and sub_event_id
    BEGIN
        INSERT INTO core.gallery_album (season_id, event_id, sub_event_id, title, created_by_id)
        VALUES (active_season_id, test_event_id, test_sub_event_id, 'Double target album', res_john_id);
        RAISE EXCEPTION 'AssertionFailed: Allowed gallery album to set both event_id and sub_event_id.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%check_album_target%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during double target album test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 6 Passed (Correctly rejected double target album: %).', ex_msg;
    END;
END $$;

-- =========================================================================
-- Part 2: RLS Policy Verification (Runs as non-superuser authenticated role)
-- =========================================================================
GRANT USAGE ON SCHEMA core TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA core TO authenticated;

SET ROLE authenticated;

DO $$
DECLARE
    wing_n_id uuid;
    wing_o_id uuid;
    res_jane_id uuid;
    res_bob_id uuid;
    ann_id2 uuid := 'a2222222-2222-2222-2222-222222222222';
    temp_count int;
BEGIN
    RAISE NOTICE 'Test 7: Verifying RLS Wing boundaries under authenticated role...';

    SELECT id INTO wing_n_id FROM core.wing WHERE name = 'N' LIMIT 1;
    SELECT id INTO wing_o_id FROM core.wing WHERE name = 'O' LIMIT 1;
    SELECT id INTO res_jane_id FROM core.resident WHERE name = 'Jane Doe' LIMIT 1;
    SELECT id INTO res_bob_id FROM core.resident WHERE name = 'Bob Smith' LIMIT 1;

    -- 7.1 Simulate Wing Commander of Wing N
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
        'sub', res_jane_id,
        'user_metadata', jsonb_build_object(
            'role', 'WING_COMMANDER',
            'wing_id', wing_n_id,
            'resident_id', res_jane_id
        )
    )::text, true);

    -- Should be able to read Wing N announcement
    SELECT count(*) INTO temp_count FROM core.announcement WHERE id = ann_id2;
    IF temp_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Wing Commander of Wing N could not view Wing N announcement. Count was %', temp_count;
    END IF;

    -- 7.2 Simulate Wing Commander of Wing O
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
        'sub', res_bob_id,
        'user_metadata', jsonb_build_object(
            'role', 'WING_COMMANDER',
            'wing_id', wing_o_id,
            'resident_id', res_bob_id
        )
    )::text, true);

    -- Should NOT be able to read Wing N announcement (ann_id2)
    SELECT count(*) INTO temp_count FROM core.announcement WHERE id = ann_id2;
    IF temp_count <> 0 THEN
        RAISE EXCEPTION 'AssertionFailed: Wing Commander of Wing O was able to view Wing N announcement. Count was %', temp_count;
    END IF;

    -- Reset context
    PERFORM set_config('request.jwt.claims', NULL, true);
    RAISE NOTICE 'Test 7 Passed.';
END $$;

-- =========================================================================
-- Part 3: Cleanup (Runs as postgres superuser)
-- =========================================================================
RESET ROLE;

DO $$
DECLARE
    res_john_id uuid;
    test_event_id uuid := '11111111-1111-1111-1111-111111111111';
    ann_id1 uuid := 'a1111111-1111-1111-1111-111111111111';
    ann_id2 uuid := 'a2222222-2222-2222-2222-222222222222';
    ann_id3 uuid := 'a3333333-3333-3333-3333-333333333333';
    test_poll_id uuid := 'd1111111-1111-1111-1111-111111111111';
    test_album_id uuid := 'ab111111-1111-1111-1111-111111111111';
    test_media_id uuid := 'c1111111-1111-1111-1111-111111111111';
BEGIN
    RAISE NOTICE 'Cleaning up test records...';
    
    SELECT id INTO res_john_id FROM core.resident WHERE name = 'John Doe' LIMIT 1;

    DELETE FROM core.media_item WHERE id = test_media_id;
    DELETE FROM core.gallery_album WHERE id = test_album_id;
    DELETE FROM core.poll_vote WHERE poll_id = test_poll_id;
    DELETE FROM core.poll WHERE id = test_poll_id;
    DELETE FROM core.announcement WHERE id IN (ann_id1, ann_id2, ann_id3);
    DELETE FROM core.event_assignment WHERE event_id = test_event_id;
    DELETE FROM core.event WHERE id = test_event_id;

    RAISE NOTICE 'All Phase F Media & Communications Verification Tests Completed Successfully!';
END $$;
