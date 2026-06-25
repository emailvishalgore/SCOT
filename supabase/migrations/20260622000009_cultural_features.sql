-- =======================================================
-- Migration: Phase N.3 Cultural Features
-- Path: supabase/migrations/20260622000009_cultural_features.sql
-- =======================================================

-- 1. Alter sub_event table to add category and type
ALTER TABLE core.sub_event 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'SPORTS' CHECK (category IN ('SPORTS', 'CULTURAL')),
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL' CHECK (type IN ('INDIVIDUAL', 'WING_BASED'));

-- 2. Alter registration table to add track_url for cultural performance audio files
ALTER TABLE core.registration 
ADD COLUMN IF NOT EXISTS track_url VARCHAR(1000);

-- 3. Create cultural_feedback table to track likes/dislikes of resident performers
CREATE TABLE IF NOT EXISTS core.cultural_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES core.resident(id) ON DELETE CASCADE,
    sub_event_id UUID NOT NULL REFERENCES core.sub_event(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_resident_cultural_feedback UNIQUE (resident_id, sub_event_id)
);

-- 4. Enable RLS on cultural_feedback
ALTER TABLE core.cultural_feedback ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for cultural_feedback
CREATE POLICY select_cultural_feedback_policy ON core.cultural_feedback
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY insert_cultural_feedback_policy ON core.cultural_feedback
    FOR INSERT TO authenticated
    WITH CHECK (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
    );

CREATE POLICY update_cultural_feedback_policy ON core.cultural_feedback
    FOR UPDATE TO authenticated
    USING (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
    )
    WITH CHECK (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
    );

CREATE POLICY delete_cultural_feedback_policy ON core.cultural_feedback
    FOR DELETE TO authenticated
    USING (
        resident_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
    );
