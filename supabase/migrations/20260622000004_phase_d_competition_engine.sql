-- =======================================================
-- Migration: Phase D Competition & Scoring Engine
-- Path: supabase/migrations/20260622000004_phase_d_competition_engine.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Table Definitions
-- -------------------------------------------------------

-- 1.1 Competition Table
CREATE TABLE IF NOT EXISTS core.competition (
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

-- 1.2 Fixture Table
CREATE TABLE IF NOT EXISTS core.fixture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES core.competition(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'))
);

-- 1.3 Competition Participant Table
CREATE TABLE IF NOT EXISTS core.competition_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES core.competition(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES core.resident(id) ON DELETE CASCADE,
    wing_id UUID REFERENCES core.wing(id) ON DELETE CASCADE,
    fixture_id UUID REFERENCES core.fixture(id) ON DELETE SET NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (attendance_status IN ('PENDING', 'PRESENT', 'ABSENT')),
    score NUMERIC(5,2),
    placement INT,
    points_awarded NUMERIC(5,2),
    CONSTRAINT check_participant_identity CHECK (
        (resident_id IS NOT NULL AND wing_id IS NULL) OR 
        (resident_id IS NULL AND wing_id IS NOT NULL)
    )
);

-- 1.4 Wing Score Table (Leaderboard entries)
CREATE TABLE IF NOT EXISTS core.wing_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wing_id UUID NOT NULL REFERENCES core.wing(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    competition_id UUID REFERENCES core.competition(id) ON DELETE CASCADE,
    points NUMERIC(5,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 System Configuration Table
CREATE TABLE IF NOT EXISTS core.system_config (
    key VARCHAR(100) PRIMARY KEY,
    season_id UUID REFERENCES core.season(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wing_score_season ON core.wing_score(season_id);
CREATE INDEX IF NOT EXISTS idx_fixture_competition ON core.fixture(competition_id);
CREATE INDEX IF NOT EXISTS idx_participant_fixture ON core.competition_participant(fixture_id);

-- -------------------------------------------------------
-- 3. Tournament Scheduling Algorithms
-- -------------------------------------------------------

-- 3.1 Knockout Byes Calculator
CREATE OR REPLACE FUNCTION core.calculate_knockout_byes(num_participants INT)
RETURNS INT AS $$
DECLARE
    next_power INT := 1;
BEGIN
    IF num_participants <= 0 THEN
        RETURN 0;
    END IF;
    WHILE next_power < num_participants LOOP
        next_power := next_power * 2;
    END LOOP;
    RETURN next_power - num_participants;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3.2 Round Robin Circle Match Scheduler
CREATE OR REPLACE FUNCTION core.generate_round_robin_fixtures(target_competition_id UUID, start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS VOID AS $$
DECLARE
    comp_type varchar(20);
    comp_event_id uuid;
    comp_sub_event_id uuid;
    active_season_id uuid;
    
    part_ids uuid[] := '{}';
    num_parts int;
    num_rounds int;
    num_matches_per_round int;
    
    round_idx int;
    match_idx int;
    
    p1_idx int;
    p2_idx int;
    
    p1_id uuid;
    p2_id uuid;
    
    fixture_id uuid;
    fixture_name text;
    fixture_time timestamp with time zone;
    
    temp_id uuid;
BEGIN
    -- Fetch competition details
    SELECT type, event_id, sub_event_id INTO comp_type, comp_event_id, comp_sub_event_id
    FROM core.competition WHERE id = target_competition_id;
    
    IF comp_type IS NULL THEN
        RAISE EXCEPTION 'Competition % not found', target_competition_id;
    END IF;

    -- Fetch active season
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;

    -- Get participant list from core.registration
    IF comp_type = 'INDIVIDUAL' THEN
        SELECT array_agg(resident_id) INTO part_ids 
        FROM core.registration 
        WHERE (event_id = comp_event_id OR sub_event_id = comp_sub_event_id);
    ELSE -- WING_BASED
        SELECT array_agg(id) INTO part_ids FROM core.wing;
    END IF;

    num_parts := array_length(part_ids, 1);
    IF num_parts IS NULL OR num_parts < 2 THEN
        RETURN;
    END IF;

    -- If odd number of participants, add a NULL dummy for Bye
    IF num_parts % 2 <> 0 THEN
        part_ids := array_append(part_ids, NULL::uuid);
        num_parts := num_parts + 1;
    END IF;

    num_rounds := num_parts - 1;
    num_matches_per_round := num_parts / 2;

    -- Update competition status to SCHEDULED
    UPDATE core.competition SET status = 'SCHEDULED' WHERE id = target_competition_id;

    FOR round_idx IN 1..num_rounds LOOP
        fixture_time := start_time + (round_idx - 1) * interval '1 day';
        
        FOR match_idx IN 1..num_matches_per_round LOOP
            p1_idx := match_idx;
            p2_idx := num_parts - match_idx + 1;
            
            p1_id := part_ids[p1_idx];
            p2_id := part_ids[p2_idx];
            
            IF p1_id IS NOT NULL AND p2_id IS NOT NULL THEN
                fixture_name := 'Round ' || round_idx || ' Match ' || match_idx;
                
                INSERT INTO core.fixture (competition_id, name, scheduled_at, status)
                VALUES (target_competition_id, fixture_name, fixture_time, 'SCHEDULED')
                RETURNING id INTO fixture_id;
                
                -- Insert participants for the fixture
                IF comp_type = 'INDIVIDUAL' THEN
                    INSERT INTO core.competition_participant (competition_id, resident_id, wing_id, fixture_id, attendance_status)
                    VALUES (target_competition_id, p1_id, NULL, fixture_id, 'PENDING');
                    
                    INSERT INTO core.competition_participant (competition_id, resident_id, wing_id, fixture_id, attendance_status)
                    VALUES (target_competition_id, p2_id, NULL, fixture_id, 'PENDING');
                ELSE -- WING_BASED
                    INSERT INTO core.competition_participant (competition_id, resident_id, wing_id, fixture_id, attendance_status)
                    VALUES (target_competition_id, NULL, p1_id, fixture_id, 'PENDING');
                    
                    INSERT INTO core.competition_participant (competition_id, resident_id, wing_id, fixture_id, attendance_status)
                    VALUES (target_competition_id, NULL, p2_id, fixture_id, 'PENDING');
                END IF;
            END IF;
        END LOOP;
        
        -- Rotate array elements clockwise for the next round (except the first one)
        temp_id := part_ids[num_parts];
        FOR idx IN REVERSE num_parts..3 LOOP
            part_ids[idx] := part_ids[idx - 1];
        END LOOP;
        part_ids[2] := temp_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- 4. Score Entry & Standing Recalculation RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION core.record_fixture_score(
    p_fixture_id UUID,
    p_scores JSONB,
    p_is_walkover BOOLEAN,
    p_walkover_absent_participant_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_competition_id uuid;
    v_comp_type varchar(20);
    v_scoring_rule jsonb;
    v_season_id uuid;
    
    v_score_record jsonb;
    v_part_id uuid;
    v_score numeric(5,2);
    v_placement int;
    v_attendance varchar(20);
    
    v_p_first numeric(5,2);
    v_p_second numeric(5,2);
    v_p_third numeric(5,2);
    v_p_part numeric(5,2);
    
    v_points numeric(5,2);
    v_tied_res text;
    v_count_tied int;
    
    v_walkover_present_points numeric(5,2);
    v_walkover_forfeit_part boolean;
    
    v_wing_id uuid;
    
    v_max_placement_points numeric(5,2);
    v_part_points_sum numeric(5,2);
    v_part_cap numeric(5,2);
    v_wing_total_points numeric(5,2);
    
    v_reason text;
    v_comp_name varchar(255);
BEGIN
    -- 1. Fetch competition & fixture details
    SELECT c.id, c.type, c.scoring_rule_json, c.name
    INTO v_competition_id, v_comp_type, v_scoring_rule, v_comp_name
    FROM core.fixture f
    JOIN core.competition c ON f.competition_id = c.id
    WHERE f.id = p_fixture_id;

    IF v_competition_id IS NULL THEN
        RAISE EXCEPTION 'Fixture % not found', p_fixture_id;
    END IF;

    -- Get season_id from parent event
    SELECT e.season_id INTO v_season_id 
    FROM core.competition c
    LEFT JOIN core.event e ON c.event_id = e.id
    LEFT JOIN core.sub_event se ON c.sub_event_id = se.id
    LEFT JOIN core.event e2 ON se.umbrella_event_id = e2.id
    WHERE c.id = v_competition_id;

    -- Parse scoring rules
    v_p_first := COALESCE((v_scoring_rule -> 'placementPoints' ->> 'first')::numeric, 10.00);
    v_p_second := COALESCE((v_scoring_rule -> 'placementPoints' ->> 'second')::numeric, 7.00);
    v_p_third := COALESCE((v_scoring_rule -> 'placementPoints' ->> 'third')::numeric, 5.00);
    v_p_part := COALESCE((v_scoring_rule ->> 'participationPoints')::numeric, 2.00);
    v_tied_res := COALESCE(v_scoring_rule ->> 'tiedPlacementResolution', 'SPLIT');
    
    v_walkover_present_points := COALESCE((v_scoring_rule -> 'walkoverRules' ->> 'pointsAwardedToPresent')::numeric, 2.00);
    v_walkover_forfeit_part := COALESCE((v_scoring_rule -> 'walkoverRules' ->> 'forfeitParticipationPointsOnWalkover')::boolean, true);

    -- 2. Walkover vs Normal Score Recording
    IF p_is_walkover THEN
        -- Mark absent participant
        UPDATE core.competition_participant
        SET score = 0, placement = NULL, attendance_status = 'ABSENT', points_awarded = 0
        WHERE fixture_id = p_fixture_id AND id = p_walkover_absent_participant_id;

        -- Mark present participant(s)
        UPDATE core.competition_participant
        SET score = COALESCE((v_scoring_rule -> 'walkoverRules' -> 'defaultScore' ->> 'present')::numeric, 2.00), 
            placement = 1, 
            attendance_status = 'PRESENT', 
            points_awarded = v_walkover_present_points
        WHERE fixture_id = p_fixture_id AND id <> p_walkover_absent_participant_id;
    ELSE
        -- Normal resolution: Update scores and initial placements
        FOR v_score_record IN SELECT * FROM jsonb_array_elements(p_scores) LOOP
            v_part_id := (v_score_record ->> 'participant_id')::uuid;
            v_score := (v_score_record ->> 'score')::numeric;
            v_placement := (v_score_record ->> 'placement')::int;
            v_attendance := v_score_record ->> 'attendance_status';

            UPDATE core.competition_participant
            SET score = v_score, 
                placement = v_placement, 
                attendance_status = v_attendance
            WHERE fixture_id = p_fixture_id AND id = v_part_id;
        END LOOP;

        -- Apply tie-breakers and placement points to core.competition_participant
        FOR v_part_id, v_placement, v_attendance IN 
            SELECT id, placement, attendance_status FROM core.competition_participant WHERE fixture_id = p_fixture_id
        LOOP
            IF v_attendance = 'ABSENT' THEN
                v_points := 0;
            ELSIF v_placement = 1 THEN
                SELECT count(*) INTO v_count_tied FROM core.competition_participant 
                WHERE fixture_id = p_fixture_id AND placement = 1 AND attendance_status = 'PRESENT';
                
                IF v_count_tied > 1 AND v_tied_res = 'SPLIT' THEN
                    v_points := (v_p_first + v_p_second) / 2.00;
                ELSE
                    v_points := v_p_first;
                END IF;
            ELSIF v_placement = 2 THEN
                SELECT count(*) INTO v_count_tied FROM core.competition_participant 
                WHERE fixture_id = p_fixture_id AND placement = 2 AND attendance_status = 'PRESENT';
                
                IF v_count_tied > 1 AND v_tied_res = 'SPLIT' THEN
                    v_points := (v_p_second + v_p_third) / 2.00;
                ELSE
                    v_points := v_p_second;
                END IF;
            ELSIF v_placement = 3 THEN
                v_points := v_p_third;
            ELSE
                v_points := v_p_part;
            END IF;

            UPDATE core.competition_participant
            SET points_awarded = v_points
            WHERE id = v_part_id;
        END LOOP;
    END IF;

    -- 3. Standings Recalculation and Wing Score Update
    -- Delete previous wing scores for this specific fixture
    DELETE FROM core.wing_score WHERE competition_id = v_competition_id AND reason LIKE '%Fixture ' || p_fixture_id || '%';

    IF v_comp_type = 'WING_BASED' THEN
        FOR v_wing_id, v_points, v_placement IN 
            SELECT wing_id, points_awarded, placement FROM core.competition_participant 
            WHERE fixture_id = p_fixture_id AND wing_id IS NOT NULL
        LOOP
            v_reason := 'Wing placement ' || COALESCE(v_placement::text, 'participation') || ': ' || v_comp_name || ' - Fixture ' || p_fixture_id;
            INSERT INTO core.wing_score (wing_id, season_id, competition_id, points, reason)
            VALUES (v_wing_id, v_season_id, v_competition_id, v_points, v_reason);
        END LOOP;

    ELSE -- INDIVIDUAL
        FOR v_wing_id IN 
            SELECT DISTINCT f.wing_id 
            FROM core.competition_participant cp
            JOIN core.resident_flat_assignment rfa ON cp.resident_id = rfa.resident_id
            JOIN core.flat f ON rfa.flat_id = f.id
            WHERE cp.fixture_id = p_fixture_id AND cp.resident_id IS NOT NULL AND rfa.season_id = v_season_id
        LOOP
            IF COALESCE((v_scoring_rule ->> 'allowMultiplePlacementsPerWing')::boolean, true) THEN
                SELECT COALESCE(sum(points_awarded), 0) INTO v_wing_total_points
                FROM core.competition_participant cp
                JOIN core.resident_flat_assignment rfa ON cp.resident_id = rfa.resident_id
                JOIN core.flat f ON rfa.flat_id = f.id
                WHERE cp.fixture_id = p_fixture_id AND f.wing_id = v_wing_id AND rfa.season_id = v_season_id;
                
                v_reason := 'Individual placements (summed): ' || v_comp_name || ' - Fixture ' || p_fixture_id;
                
                INSERT INTO core.wing_score (wing_id, season_id, competition_id, points, reason)
                VALUES (v_wing_id, v_season_id, v_competition_id, v_wing_total_points, v_reason);
            ELSE
                SELECT COALESCE(max(points_awarded), 0) INTO v_max_placement_points
                FROM core.competition_participant cp
                JOIN core.resident_flat_assignment rfa ON cp.resident_id = rfa.resident_id
                JOIN core.flat f ON rfa.flat_id = f.id
                WHERE cp.fixture_id = p_fixture_id AND f.wing_id = v_wing_id AND rfa.season_id = v_season_id;

                -- participation points for other residents
                SELECT COALESCE(sum(v_p_part), 0) INTO v_part_points_sum
                FROM core.competition_participant cp
                JOIN core.resident_flat_assignment rfa ON cp.resident_id = rfa.resident_id
                JOIN core.flat f ON rfa.flat_id = f.id
                WHERE cp.fixture_id = p_fixture_id AND f.wing_id = v_wing_id AND rfa.season_id = v_season_id
                  AND cp.id <> (
                      SELECT cp2.id FROM core.competition_participant cp2
                      JOIN core.resident_flat_assignment rfa2 ON cp2.resident_id = rfa2.resident_id
                      JOIN core.flat f2 ON rfa2.flat_id = f2.id
                      WHERE cp2.fixture_id = p_fixture_id AND f2.wing_id = v_wing_id AND rfa2.season_id = v_season_id
                      ORDER BY cp2.points_awarded DESC, cp2.id LIMIT 1
                  );
                
                v_part_cap := (v_scoring_rule ->> 'participationPointsCap')::numeric;
                IF v_part_cap IS NOT NULL THEN
                    v_part_points_sum := least(v_part_points_sum, v_part_cap);
                END IF;

                v_wing_total_points := v_max_placement_points + v_part_points_sum;
                v_reason := 'Highest individual placement + capped participation: ' || v_comp_name || ' - Fixture ' || p_fixture_id;

                INSERT INTO core.wing_score (wing_id, season_id, competition_id, points, reason)
                VALUES (v_wing_id, v_season_id, v_competition_id, v_wing_total_points, v_reason);
            END IF;
        END LOOP;
    END IF;

    -- 4. Transition fixture and competition status
    UPDATE core.fixture SET status = 'COMPLETED' WHERE id = p_fixture_id;

    IF NOT EXISTS (SELECT 1 FROM core.fixture WHERE competition_id = v_competition_id AND status <> 'COMPLETED') THEN
        UPDATE core.competition SET status = 'COMPLETED' WHERE id = v_competition_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- -------------------------------------------------------

ALTER TABLE core.competition ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.fixture ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.competition_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.wing_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.system_config ENABLE ROW LEVEL SECURITY;

-- 5.1 Competition Policies
CREATE POLICY select_competitions ON core.competition
    FOR SELECT USING (
        event_id IN (SELECT id FROM core.event WHERE season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE'))
        OR
        sub_event_id IN (SELECT se.id FROM core.sub_event se JOIN core.event e ON se.umbrella_event_id = e.id WHERE e.season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE'))
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY admin_modify_competitions ON core.competition
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY event_champion_modify_competitions ON core.competition
    FOR ALL USING (
        event_id IN (
            SELECT event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        )
    );

-- 5.2 Fixture Policies
CREATE POLICY select_fixtures ON core.fixture
    FOR SELECT USING (true);

CREATE POLICY admin_modify_fixtures ON core.fixture
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY event_champion_modify_fixtures ON core.fixture
    FOR ALL USING (
        competition_id IN (
            SELECT id FROM core.competition WHERE event_id IN (
                SELECT event_id FROM core.event_assignment ea
                JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
            )
        )
    );

-- 5.3 Competition Participant Policies
CREATE POLICY select_participants ON core.competition_participant
    FOR SELECT USING (true);

CREATE POLICY admin_modify_participants ON core.competition_participant
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY event_champion_modify_participants ON core.competition_participant
    FOR ALL USING (
        competition_id IN (
            SELECT id FROM core.competition WHERE event_id IN (
                SELECT event_id FROM core.event_assignment ea
                JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
            )
        )
    );

-- 5.4 Wing Score Policies
CREATE POLICY select_wing_scores ON core.wing_score
    FOR SELECT USING (true);

CREATE POLICY admin_modify_wing_scores ON core.wing_score
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.5 System Config Policies
CREATE POLICY select_system_config ON core.system_config
    FOR SELECT USING (true);

CREATE POLICY admin_modify_system_config ON core.system_config
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );
