-- =======================================================
-- Migration: Phase E Finance Operations
-- Path: supabase/migrations/20260622000005_phase_e_finance_ops.sql
-- =======================================================

-- -------------------------------------------------------
-- 1. Table Definitions
-- -------------------------------------------------------

-- 1.1 Sponsor Table
CREATE TABLE IF NOT EXISTS finance.sponsor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    amount_committed NUMERIC(10,2) NOT NULL,
    amount_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'PARTIALLY_PAID', 'FULLY_PAID'))
);

-- 1.2 Vendor Table
CREATE TABLE IF NOT EXISTS finance.vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0)
);

-- 1.3 Vendor Quotation Table
CREATE TABLE IF NOT EXISTS finance.vendor_quotation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES finance.vendor(id) ON DELETE CASCADE,
    event_id UUID REFERENCES core.event(id) ON DELETE CASCADE,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    quotation_file_url VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT check_quotation_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL) OR
        (event_id IS NULL AND sub_event_id IS NULL)
    )
);

-- 1.4 Expense Table
CREATE TABLE IF NOT EXISTS finance.expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES core.season(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('VENDOR', 'LOGISTICS', 'PRIZES', 'MISCELLANEOUS')),
    vendor_id UUID REFERENCES finance.vendor(id) ON DELETE SET NULL,
    event_id UUID REFERENCES core.event(id) ON DELETE SET NULL,
    sub_event_id UUID REFERENCES core.sub_event(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    receipt_url VARCHAR(1000),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED')),
    approved_by_id UUID REFERENCES core.member(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES core.member(id) ON DELETE SET NULL,
    CONSTRAINT check_expense_target CHECK (
        (event_id IS NOT NULL AND sub_event_id IS NULL) OR 
        (event_id IS NULL AND sub_event_id IS NOT NULL) OR
        (event_id IS NULL AND sub_event_id IS NULL)
    )
);

-- 1.5 Financial Audit Log Table
CREATE TABLE IF NOT EXISTS finance.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- INSERT/UPDATE/DELETE
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sponsor_season ON finance.sponsor(season_id);
CREATE INDEX IF NOT EXISTS idx_quotation_season ON finance.vendor_quotation(season_id);
CREATE INDEX IF NOT EXISTS idx_expense_season ON finance.expense(season_id);
CREATE INDEX IF NOT EXISTS idx_expense_event ON finance.expense(event_id);

-- -------------------------------------------------------
-- 3. Audit Log Trigger Function
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION finance.audit_flat_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_editor_id uuid;
BEGIN
    -- Extract the editor_id from JWT user metadata, fallback to recorded_by_id
    v_editor_id := COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid,
        NEW.recorded_by_id
    );

    IF v_editor_id IS NULL THEN
        v_editor_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO finance.audit_log (editor_id, table_name, record_id, action_type, old_value, new_value)
        VALUES (v_editor_id, TG_TABLE_NAME::text, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO finance.audit_log (editor_id, table_name, record_id, action_type, old_value, new_value)
        VALUES (v_editor_id, TG_TABLE_NAME::text, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO finance.audit_log (editor_id, table_name, record_id, action_type, old_value, new_value)
        VALUES (v_editor_id, TG_TABLE_NAME::text, OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER audit_contribution_trigger
    AFTER INSERT OR UPDATE OR DELETE ON finance.flat_contribution
    FOR EACH ROW EXECUTE FUNCTION finance.audit_flat_contribution();

-- -------------------------------------------------------
-- 4. Stored Procedures (RPCs)
-- -------------------------------------------------------

-- 4.1 Record Contribution Payment
CREATE OR REPLACE FUNCTION finance.record_payment(
    target_flat_id UUID,
    active_season_id UUID,
    payment_amount DECIMAL,
    recorder_member_id UUID
) RETURNS finance.flat_contribution AS $$
DECLARE
    res_record finance.flat_contribution;
BEGIN
    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status, payment_date, recorded_by_id)
    VALUES (target_flat_id, active_season_id, payment_amount, 'PAID', NOW(), recorder_member_id)
    ON CONFLICT (flat_id, season_id) 
    DO UPDATE SET status = 'PAID', payment_date = NOW(), recorded_by_id = recorder_member_id
    RETURNING * INTO res_record;
    
    RETURN res_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Submit Expense for Approval
CREATE OR REPLACE FUNCTION finance.submit_expense_for_approval(
    target_expense_id UUID
) RETURNS finance.expense AS $$
DECLARE
    exp_record finance.expense;
    config_record RECORD;
BEGIN
    SELECT * INTO exp_record FROM finance.expense WHERE id = target_expense_id;
    
    IF exp_record.id IS NULL THEN
        RAISE EXCEPTION 'EXPENSE_NOT_FOUND: The requested expense draft does not exist.';
    END IF;

    IF exp_record.status <> 'DRAFT' THEN
        RAISE EXCEPTION 'INVALID_EXPENSE_STATE: Only draft expenses can be submitted for approval.';
    END IF;

    -- Load active seasonal approval configuration thresholds
    SELECT COALESCE((value->>'autoApprovalLimit')::numeric, 500.00) as auto_lim,
           COALESCE((value->>'singleOwnerApprovalLimit')::numeric, 2000.00) as single_lim
    INTO config_record
    FROM core.system_config 
    WHERE key = 'financeApprovalConfig';

    -- Evaluate thresholds
    IF exp_record.amount <= config_record.auto_lim THEN
        UPDATE finance.expense 
        SET status = 'APPROVED', approved_by_id = NULL
        WHERE id = target_expense_id
        RETURNING * INTO exp_record;
    ELSE
        UPDATE finance.expense 
        SET status = 'PENDING_APPROVAL' 
        WHERE id = target_expense_id
        RETURNING * INTO exp_record;
    END IF;
    
    RETURN exp_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Approve Pending Expense
CREATE OR REPLACE FUNCTION finance.approve_expense(
    target_expense_id UUID,
    approver_member_id UUID
) RETURNS finance.expense AS $$
DECLARE
    exp_record finance.expense;
BEGIN
    SELECT * INTO exp_record FROM finance.expense WHERE id = target_expense_id;
    
    IF exp_record.id IS NULL THEN
        RAISE EXCEPTION 'EXPENSE_NOT_FOUND: The requested expense does not exist.';
    END IF;

    IF exp_record.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'INVALID_EXPENSE_STATE: Only pending expenses can be approved.';
    END IF;

    -- Update expense status to APPROVED and assign approver
    UPDATE finance.expense
    SET status = 'APPROVED', approved_by_id = approver_member_id
    WHERE id = target_expense_id
    RETURNING * INTO exp_record;
    
    RETURN exp_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default approval thresholds config
INSERT INTO core.system_config (key, value)
VALUES ('financeApprovalConfig', '{"autoApprovalLimit": 500.00, "singleOwnerApprovalLimit": 2000.00, "dualOwnerApprovalLimit": 10000.00}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- -------------------------------------------------------

ALTER TABLE finance.sponsor ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.vendor ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.vendor_quotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.audit_log ENABLE ROW LEVEL SECURITY;

-- 5.1 Sponsor Policies
CREATE POLICY select_sponsors ON finance.sponsor
    FOR SELECT USING (
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

CREATE POLICY admin_modify_sponsors ON finance.sponsor
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.2 Vendor Policies
CREATE POLICY select_vendors ON finance.vendor
    FOR SELECT USING (true);

CREATE POLICY admin_modify_vendors ON finance.vendor
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );

-- 5.3 Vendor Quotation Policies
CREATE POLICY select_quotations ON finance.vendor_quotation
    FOR SELECT USING (true);

CREATE POLICY modify_quotations ON finance.vendor_quotation
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                event_id IN (
                    SELECT event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
                OR
                sub_event_id IN (
                    SELECT sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
            )
        )
    );

-- 5.4 Expense Policies
CREATE POLICY select_expenses ON finance.expense
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        event_id IN (
            SELECT event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        )
        OR
        sub_event_id IN (
            SELECT sub_event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
        )
    );

CREATE POLICY modify_expenses ON finance.expense
    FOR ALL USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
        OR
        (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'EVENT_CHAMPION'
            AND (
                event_id IN (
                    SELECT event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
                OR
                sub_event_id IN (
                    SELECT sub_event_id FROM core.event_assignment ea
                    JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
                    WHERE msa.member_id = (auth.jwt() -> 'user_metadata' ->> 'resident_id')::uuid
                )
            )
        )
    );

-- 5.5 Audit Log Policies
CREATE POLICY select_audit_logs ON finance.audit_log
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('SCOT_ADMIN', 'CORE_TEAM')
    );
