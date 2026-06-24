-- =======================================================
-- Migration: Phase F Media & Communications
-- Path: supabase/migrations/20260622000006_phase_f_media_comms.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Custom Types (ENUM) Definitions
-- -------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type' AND typnamespace = 'core'::regnamespace) THEN
        CREATE TYPE core.media_type AS ENUM ('PHOTO', 'VIDEO');
    END IF;
END
$$;

-- -------------------------------------------------------
-- 2. Table Definitions
-- -------------------------------------------------------

-- 2.1 Announcement Table
CREATE TABLE IF NOT EXISTS core.announcement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('GLOBAL', 'WING', 'EVENT')),
    wing_id UUID REFERENCES core.wing(id) ON DELETE CASCADE,
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES core.member(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_announcement_target CHECK (
        (scope = 'GLOBAL' AND wing_id IS NULL AND event_id IS NULL AND sub_event_id IS NULL) OR
        (scope = 'WING' AND wing_id IS NOT NULL AND event_id IS NULL AND sub_event_id IS NULL) OR
        (scope = 'EVENT' AND wing_id IS NULL AND (event_id IS NOT NULL OR sub_event_id IS NOT NULL))
    )
);

-- 2.2 Poll Table
CREATE TABLE IF NOT EXISTS core.poll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- JSON array of strings
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    created_by_id UUID NOT NULL REFERENCES core.member(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Poll Vote Table
CREATE TABLE IF NOT EXISTS core.poll_vote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES core.poll(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES core.resident(id) ON DELETE CASCADE,
    selected_option VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_resident_poll_vote UNIQUE (poll_id, resident_id)
);

-- 2.4 Gallery Album Table
CREATE TABLE IF NOT EXISTS core.gallery_album (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by_id UUID NOT NULL REFERENCES core.member(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_album_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL) OR
        (event_id IS NULL AND sub_event_id IS NULL)
    )
);

-- 2.5 Media Item Table
CREATE TABLE IF NOT EXISTS core.media_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES core.gallery_album(id) ON DELETE CASCADE,
    type core.media_type NOT NULL,
    url VARCHAR(1000) NOT NULL,
    uploaded_by_id UUID NOT NULL REFERENCES core.member(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_announcement_season ON core.announcement(season_id);
CREATE INDEX IF NOT EXISTS idx_announcement_wing ON core.announcement(wing_id);
CREATE INDEX IF NOT EXISTS idx_announcement_event ON core.announcement(event_id);
CREATE INDEX IF NOT EXISTS idx_poll_season ON core.poll(season_id);
CREATE INDEX IF NOT EXISTS idx_poll_vote_poll ON core.poll_vote(poll_id);
CREATE INDEX IF NOT EXISTS idx_gallery_album_season ON core.gallery_album(season_id);
CREATE INDEX IF NOT EXISTS idx_media_item_album ON core.media_item(album_id);

-- -------------------------------------------------------
-- 4. Enable Row-Level Security (RLS)
-- -------------------------------------------------------
ALTER TABLE core.announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.poll ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.poll_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.gallery_album ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.media_item ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 5. RLS Policies
-- -------------------------------------------------------

-- 5.1 Announcements Policies
CREATE POLICY select_announcements ON core.announcement
    FOR SELECT
    USING (
        (scope = 'GLOBAL' AND season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE'))
        OR
        (scope = 'EVENT' AND season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE'))
        OR
        (
            scope = 'WING' 
            AND season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
            AND (
                wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
                OR (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
            )
        )
        OR
        ((auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM'))
    );

CREATE POLICY insert_announcements ON core.announcement
    FOR INSERT
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            scope = 'WING'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'WING_COMMANDER'
            AND wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
        OR
        (
            scope = 'EVENT'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                (event_id IS NOT NULL AND event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
                OR
                (sub_event_id IS NOT NULL AND sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY modify_announcements ON core.announcement
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            scope = 'WING'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'WING_COMMANDER'
            AND wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
        OR
        (
            scope = 'EVENT'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                (event_id IS NOT NULL AND event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
                OR
                (sub_event_id IS NOT NULL AND sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            scope = 'WING'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'WING_COMMANDER'
            AND wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
        OR
        (
            scope = 'EVENT'
            AND (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                (event_id IS NOT NULL AND event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
                OR
                (sub_event_id IS NOT NULL AND sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
            )
        )
    );

-- 5.2 Polls Policies
CREATE POLICY select_polls ON core.poll
    FOR SELECT
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY manage_polls ON core.poll
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.3 Poll Votes Policies
CREATE POLICY select_poll_votes ON core.poll_vote
    FOR SELECT
    USING (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY insert_poll_votes ON core.poll_vote
    FOR INSERT
    WITH CHECK (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        AND
        poll_id IN (SELECT id FROM core.poll WHERE status = 'ACTIVE')
    );

CREATE POLICY modify_poll_votes ON core.poll_vote
    FOR UPDATE
    USING (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
    )
    WITH CHECK (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        AND
        poll_id IN (SELECT id FROM core.poll WHERE status = 'ACTIVE')
    );

-- 5.4 Gallery Album Policies
CREATE POLICY select_gallery_albums ON core.gallery_album
    FOR SELECT
    USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY manage_gallery_albums ON core.gallery_album
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                (event_id IS NOT NULL AND event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
                OR
                (sub_event_id IS NOT NULL AND sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                (event_id IS NOT NULL AND event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
                OR
                (sub_event_id IS NOT NULL AND sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ))
            )
        )
    );

-- 5.5 Media Item Policies
CREATE POLICY select_media_items ON core.media_item
    FOR SELECT
    USING (
        album_id IN (
            SELECT id FROM core.gallery_album
            WHERE season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
            OR (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        )
    );

CREATE POLICY manage_media_items ON core.media_item
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND album_id IN (
                SELECT id FROM core.gallery_album
                WHERE event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ) OR sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND album_id IN (
                SELECT id FROM core.gallery_album
                WHERE event_id IN (
                    SELECT ea.event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                ) OR sub_event_id IN (
                    SELECT ea.sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = auth.uid()
                )
            )
        )
    );
