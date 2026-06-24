-- =======================================================
-- Verification Script: Phase D Competition & Scoring Engine
-- Path: verify_phase_d.sql
-- =======================================================

DO $$
DECLARE
    active_season_id uuid;
    flat_101_id uuid;
    flat_102_id uuid;
    flat_103_id uuid;
    res_john_id uuid;
    res_jane_id uuid;
    res_bob_id uuid;
    res_alice_id uuid;
    
    test_event_id uuid := gen_random_uuid();
    comp_split_id uuid := gen_random_uuid();
    comp_full_id uuid := gen_random_uuid();
    comp_rr_id uuid := gen_random_uuid();
    
    fix_id1 uuid;
    fix_id2 uuid;
    fix_id3 uuid;
    fix_id4 uuid;
    
    cp_john_id uuid;
    cp_bob_id uuid;
    
    points_john numeric(5,2);
    points_bob numeric(5,2);
    points_wing_n numeric(5,2);
    
    byes_val int;
    fixtures_count int;
    ex_msg text;
BEGIN
    RAISE NOTICE 'Starting Phase D Competition & Scoring Engine Verification Tests...';

    -- 1. Get Dynamically Seeded IDs
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    SELECT id INTO res_john_id FROM core.resident WHERE name = 'John Doe' LIMIT 1;
    SELECT id INTO res_jane_id FROM core.resident WHERE name = 'Jane Doe' LIMIT 1;
    SELECT id INTO res_bob_id FROM core.resident WHERE name = 'Bob Smith' LIMIT 1;
    SELECT id INTO res_alice_id FROM core.resident WHERE name = 'Alice Cooper' LIMIT 1;

    SELECT flat_id INTO flat_101_id FROM core.resident_flat_assignment WHERE resident_id = res_john_id LIMIT 1;
    SELECT flat_id INTO flat_102_id FROM core.resident_flat_assignment WHERE resident_id = res_bob_id LIMIT 1;
    SELECT flat_id INTO flat_103_id FROM core.resident_flat_assignment WHERE resident_id = res_alice_id LIMIT 1;

    -- Make sure contributions are PAID for registrations to pass if needed (though we insert registrations directly as superuser to bypass trigger constraints)
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status) VALUES
    (flat_101_id, active_season_id, 3000.00, 'PAID'),
    (flat_102_id, active_season_id, 3000.00, 'PAID'),
    (flat_103_id, active_season_id, 3000.00, 'PAID')
    ON CONFLICT (flat_id, season_id) DO UPDATE SET status = 'PAID';

    -- Create test event
    INSERT INTO core.event (id, season_id, name, description, start_date, end_date, venue, status)
    VALUES (test_event_id, active_season_id, 'Winter Olympics 2027', 'Winter events', NOW(), NOW() + interval '5 days', 'Sports Complex', 'ACTIVE');

    -- Create competitions
    INSERT INTO core.competition (id, event_id, name, type, scoring_rule_json, status)
    VALUES (
        comp_split_id,
        test_event_id,
        'Chess Split Competition',
        'INDIVIDUAL',
        '{"placementPoints": {"first": 10.00, "second": 7.00, "third": 5.00}, "participationPoints": 2.00, "allowMultiplePlacementsPerWing": false, "participationPointsCap": 6.00, "tiedPlacementResolution": "SPLIT", "walkoverRules": {"pointsAwardedToPresent": 2.00, "defaultScore": {"present": 2.00, "absent": 0.00}, "forfeitParticipationPointsOnWalkover": true}}'::jsonb,
        'DRAFT'
    );

    INSERT INTO core.competition (id, event_id, name, type, scoring_rule_json, status)
    VALUES (
        comp_full_id,
        test_event_id,
        'Chess Full Competition',
        'INDIVIDUAL',
        '{"placementPoints": {"first": 10.00, "second": 7.00, "third": 5.00}, "participationPoints": 2.00, "allowMultiplePlacementsPerWing": false, "participationPointsCap": 6.00, "tiedPlacementResolution": "FULL"}'::jsonb,
        'DRAFT'
    );

    -- =========================================================================
    -- Test 1: Knockout Byes Calculation
    -- =========================================================================
    RAISE NOTICE 'Test 1: Knockout Byes Calculation...';
    
    byes_val := core.calculate_knockout_byes(3);
    IF byes_val <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Byes for 3 participants should be 1, got %', byes_val;
    END IF;

    byes_val := core.calculate_knockout_byes(5);
    IF byes_val <> 3 THEN
        RAISE EXCEPTION 'AssertionFailed: Byes for 5 participants should be 3, got %', byes_val;
    END IF;

    byes_val := core.calculate_knockout_byes(8);
    IF byes_val <> 0 THEN
        RAISE EXCEPTION 'AssertionFailed: Byes for 8 participants should be 0, got %', byes_val;
    END IF;

    RAISE NOTICE 'Test 1 Passed.';

    -- =========================================================================
    -- Test 2: Round Robin Circle Scheduling Algorithm
    -- =========================================================================
    RAISE NOTICE 'Test 2: Round Robin circle Scheduling...';
    
    INSERT INTO core.competition (id, event_id, name, type, scoring_rule_json, status)
    VALUES (
        comp_rr_id,
        test_event_id,
        'Round Robin Football',
        'WING_BASED',
        '{}'::jsonb,
        'DRAFT'
    );

    -- Generate round robin fixtures (should schedule for 10 wings)
    PERFORM core.generate_round_robin_fixtures(comp_rr_id);

    -- Check fixture count (10 wings -> odd? No, 10 is even. circle method rounds = 9. matches per round = 5. Total = 45 matches).
    SELECT count(*) INTO fixtures_count FROM core.fixture WHERE competition_id = comp_rr_id;
    IF fixtures_count <> 45 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected 45 round robin fixtures, got %', fixtures_count;
    END IF;

    RAISE NOTICE 'Test 2 Passed.';

    -- =========================================================================
    -- Test 3: Normal Score Entry (Placement and points allocation)
    -- =========================================================================
    RAISE NOTICE 'Test 3: Normal Score Entry...';
    
    INSERT INTO core.fixture (id, competition_id, name, scheduled_at, status)
    VALUES (test_event_id, comp_split_id, 'Finals Fixture', NOW(), 'SCHEDULED')
    RETURNING id INTO fix_id1;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_john_id, NULL, fix_id1, 'PENDING')
    RETURNING id INTO cp_john_id;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_bob_id, NULL, fix_id1, 'PENDING')
    RETURNING id INTO cp_bob_id;

    -- Record scores (John 1st, Bob 2nd)
    PERFORM core.record_fixture_score(
        fix_id1,
        jsonb_build_array(
            jsonb_build_object('participant_id', cp_john_id, 'score', 15.00, 'placement', 1, 'attendance_status', 'PRESENT'),
            jsonb_build_object('participant_id', cp_bob_id, 'score', 10.00, 'placement', 2, 'attendance_status', 'PRESENT')
        ),
        false,
        NULL
    );

    -- Asserts
    SELECT points_awarded INTO points_john FROM core.competition_participant WHERE id = cp_john_id;
    SELECT points_awarded INTO points_bob FROM core.competition_participant WHERE id = cp_bob_id;
    
    IF points_john <> 10.00 OR points_bob <> 7.00 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected 10.00 and 7.00 points, got % and %', points_john, points_bob;
    END IF;

    RAISE NOTICE 'Test 3 Passed.';

    -- =========================================================================
    -- Test 4: Split Tie Resolution (1st & 2nd split)
    -- =========================================================================
    RAISE NOTICE 'Test 4: Split Tie Resolution...';
    
    INSERT INTO core.fixture (id, competition_id, name, scheduled_at, status)
    VALUES (gen_random_uuid(), comp_split_id, 'Tie Split Fixture', NOW(), 'SCHEDULED')
    RETURNING id INTO fix_id2;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_john_id, NULL, fix_id2, 'PENDING')
    RETURNING id INTO cp_john_id;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_bob_id, NULL, fix_id2, 'PENDING')
    RETURNING id INTO cp_bob_id;

    -- Record scores (John and Bob tied for 1st place)
    PERFORM core.record_fixture_score(
        fix_id2,
        jsonb_build_array(
            jsonb_build_object('participant_id', cp_john_id, 'score', 12.00, 'placement', 1, 'attendance_status', 'PRESENT'),
            jsonb_build_object('participant_id', cp_bob_id, 'score', 12.00, 'placement', 1, 'attendance_status', 'PRESENT')
        ),
        false,
        NULL
    );

    -- Asserts: points should split (10 + 7) / 2 = 8.5
    SELECT points_awarded INTO points_john FROM core.competition_participant WHERE id = cp_john_id;
    SELECT points_awarded INTO points_bob FROM core.competition_participant WHERE id = cp_bob_id;
    
    IF points_john <> 8.50 OR points_bob <> 8.50 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected split 8.50 points, got % and %', points_john, points_bob;
    END IF;

    RAISE NOTICE 'Test 4 Passed.';

    -- =========================================================================
    -- Test 5: Full Tie Resolution (Both get 1st place points)
    -- =========================================================================
    RAISE NOTICE 'Test 5: Full Tie Resolution...';
    
    INSERT INTO core.fixture (id, competition_id, name, scheduled_at, status)
    VALUES (gen_random_uuid(), comp_full_id, 'Tie Full Fixture', NOW(), 'SCHEDULED')
    RETURNING id INTO fix_id3;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_full_id, res_john_id, NULL, fix_id3, 'PENDING')
    RETURNING id INTO cp_john_id;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_full_id, res_bob_id, NULL, fix_id3, 'PENDING')
    RETURNING id INTO cp_bob_id;

    -- Record scores (John and Bob tied for 1st place in Full resolution competition)
    PERFORM core.record_fixture_score(
        fix_id3,
        jsonb_build_array(
            jsonb_build_object('participant_id', cp_john_id, 'score', 12.00, 'placement', 1, 'attendance_status', 'PRESENT'),
            jsonb_build_object('participant_id', cp_bob_id, 'score', 12.00, 'placement', 1, 'attendance_status', 'PRESENT')
        ),
        false,
        NULL
    );

    -- Asserts: both get full 10 points
    SELECT points_awarded INTO points_john FROM core.competition_participant WHERE id = cp_john_id;
    SELECT points_awarded INTO points_bob FROM core.competition_participant WHERE id = cp_bob_id;
    
    IF points_john <> 10.00 OR points_bob <> 10.00 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected full 10.00 points, got % and %', points_john, points_bob;
    END IF;

    RAISE NOTICE 'Test 5 Passed.';

    -- =========================================================================
    -- Test 6: Walkover Resolution (Forfeits and default score)
    -- =========================================================================
    RAISE NOTICE 'Test 6: Walkover Resolution...';
    
    INSERT INTO core.fixture (id, competition_id, name, scheduled_at, status)
    VALUES (gen_random_uuid(), comp_split_id, 'Walkover Fixture', NOW(), 'SCHEDULED')
    RETURNING id INTO fix_id4;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_john_id, NULL, fix_id4, 'PENDING')
    RETURNING id INTO cp_john_id;

    INSERT INTO core.competition_participant (id, competition_id, resident_id, wing_id, fixture_id, attendance_status)
    VALUES (gen_random_uuid(), comp_split_id, res_bob_id, NULL, fix_id4, 'PENDING')
    RETURNING id INTO cp_bob_id;

    -- Record walkover with Bob as absent
    PERFORM core.record_fixture_score(
        fix_id4,
        NULL,
        true,
        cp_bob_id
    );

    -- Asserts: John gets 2 present points, Bob gets 0
    SELECT points_awarded INTO points_john FROM core.competition_participant WHERE id = cp_john_id;
    SELECT points_awarded INTO points_bob FROM core.competition_participant WHERE id = cp_bob_id;
    
    IF points_john <> 2.00 OR points_bob <> 0.00 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected 2.00 and 0.00 walkover points, got % and %', points_john, points_bob;
    END IF;

    RAISE NOTICE 'Test 6 Passed.';

    -- =========================================================================
    -- Test 7: Standings Recalculation (Participation Points Cap Check)
    -- =========================================================================
    RAISE NOTICE 'Test 7: Standings Recalculation (Participation Cap Check)...';
    
    -- In Test 3, we ran chess fixture finals:
    -- John (Flat 101, Wing N) got 10 points (placed 1st).
    -- Bob (Flat 102, Wing N) got 7 points (placed 2nd).
    -- Since chess competition has allowMultiplePlacementsPerWing = false, only the highest (John, 10pts) counts.
    -- Other wing residents (Jane) get participation points, but wait, Jane did not participate in cp fixture!
    -- Let's see: in Test 3, only John and Bob participated. For Wing N, John got 10.
    -- Let's query the wing_score generated for Wing N for this competition.
    SELECT points INTO points_wing_n FROM core.wing_score 
    WHERE competition_id = comp_split_id 
      AND wing_id = (SELECT id FROM core.wing WHERE name = 'N')
      AND reason LIKE '%' || fix_id1 || '%';

    -- John (Wing N) got 10. Bob is Wing N too! (Flat 102).
    -- Since allowMultiplePlacementsPerWing = false, the max placement points is John (10).
    -- The other participant is Bob (points 7). Bob is count as "OtherResidents" and gets participation points (2.00) instead of placement points.
    -- Total Wing N points = Max(John 10, Bob 7) + Bob part (2) = 10 + 2 = 12 points.
    IF points_wing_n <> 12.00 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected Wing N standings points to be 12.00, got %', points_wing_n;
    END IF;

    RAISE NOTICE 'Test 7 Passed.';

    -- =========================================================================
    -- Cleanup
    -- =========================================================================
    RAISE NOTICE 'Cleaning up test fixtures and competitions...';
    DELETE FROM core.fixture WHERE competition_id IN (comp_split_id, comp_full_id, comp_rr_id);
    DELETE FROM core.competition WHERE event_id = test_event_id;
    DELETE FROM core.event WHERE id = test_event_id;
    DELETE FROM finance.flat_contribution WHERE flat_id IN (flat_101_id, flat_102_id, flat_103_id);

    RAISE NOTICE 'All Phase D Verification Tests Completed Successfully!';
END $$;
