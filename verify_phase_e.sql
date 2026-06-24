-- =======================================================
-- Verification Script: Phase E Finance Operations
-- Path: verify_phase_e.sql
-- =======================================================

DO $$
DECLARE
    active_season_id uuid;
    flat_101_id uuid;
    res_john_id uuid;
    res_jane_id uuid;
    
    pay_record finance.flat_contribution;
    audit_count int;
    audit_rec record;
    
    exp_id1 uuid := gen_random_uuid();
    exp_id2 uuid := gen_random_uuid();
    
    exp_record finance.expense;
    ex_msg text;
BEGIN
    RAISE NOTICE 'Starting Phase E Finance Operations Verification Tests...';

    -- 1. Get Dynamically Seeded IDs
    SELECT id INTO active_season_id FROM core.season WHERE status = 'ACTIVE' LIMIT 1;
    SELECT id INTO res_john_id FROM core.resident WHERE name = 'John Doe' LIMIT 1;
    SELECT id INTO res_jane_id FROM core.resident WHERE name = 'Jane Doe' LIMIT 1;
    SELECT flat_id INTO flat_101_id FROM core.resident_flat_assignment WHERE resident_id = res_john_id LIMIT 1;

    -- Clear contributions and audit logs for clean starting state
    DELETE FROM finance.flat_contribution WHERE flat_id = flat_101_id AND season_id = active_season_id;
    DELETE FROM finance.audit_log;

    -- =========================================================================
    -- Test 1: Record Payment RPC
    -- =========================================================================
    RAISE NOTICE 'Test 1: Record Payment RPC...';
    
    pay_record := finance.record_payment(
        flat_101_id,
        active_season_id,
        3000.00,
        res_john_id -- John is a member, so res_john_id is member_id
    );

    IF pay_record.status <> 'PAID' OR pay_record.amount <> 3000.00 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected PAID contribution status and 3000.00 amount, got % and %', pay_record.status, pay_record.amount;
    END IF;
    
    RAISE NOTICE 'Test 1 Passed.';

    -- =========================================================================
    -- Test 2: Flat Contribution Audit Trigger
    -- =========================================================================
    RAISE NOTICE 'Test 2: Payment Audit Trigger...';
    
    SELECT count(*) INTO audit_count FROM finance.audit_log;
    IF audit_count <> 1 THEN
        RAISE EXCEPTION 'AssertionFailed: Expected exactly 1 audit log entry, got %', audit_count;
    END IF;

    SELECT * INTO audit_rec FROM finance.audit_log LIMIT 1;
    IF audit_rec.table_name <> 'flat_contribution' OR audit_rec.action_type <> 'INSERT' THEN
        RAISE EXCEPTION 'AssertionFailed: Unexpected audit log table % or action %', audit_rec.table_name, audit_rec.action_type;
    END IF;

    RAISE NOTICE 'Test 2 Passed.';

    -- =========================================================================
    -- Test 3: Auto-Approval Expense (<= 500)
    -- =========================================================================
    RAISE NOTICE 'Test 3: Auto-Approval Expense (<= 500)...';
    
    INSERT INTO finance.expense (id, season_id, category, description, amount, status, created_by_id)
    VALUES (exp_id1, active_season_id, 'LOGISTICS', 'Test logistics small bill', 350.00, 'DRAFT', res_john_id);

    exp_record := finance.submit_expense_for_approval(exp_id1);
    
    IF exp_record.status <> 'APPROVED' OR exp_record.approved_by_id IS NOT NULL THEN
        RAISE EXCEPTION 'AssertionFailed: Expected AUTO-APPROVED status and null approver, got %', exp_record.status;
    END IF;

    RAISE NOTICE 'Test 3 Passed.';

    -- =========================================================================
    -- Test 4: Threshold Gated Expense (> 500)
    -- =========================================================================
    RAISE NOTICE 'Test 4: Threshold Gated Expense (> 500)...';
    
    INSERT INTO finance.expense (id, season_id, category, description, amount, status, created_by_id)
    VALUES (exp_id2, active_season_id, 'VENDOR', 'Test big vendor payout', 1200.00, 'DRAFT', res_john_id);

    exp_record := finance.submit_expense_for_approval(exp_id2);
    
    IF exp_record.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'AssertionFailed: Expected PENDING_APPROVAL status, got %', exp_record.status;
    END IF;

    RAISE NOTICE 'Test 4 Passed.';

    -- =========================================================================
    -- Test 5: Duplicate Submission Block (Should fail)
    -- =========================================================================
    RAISE NOTICE 'Test 5: Duplicate Submission Block (Should fail)...';
    
    BEGIN
        PERFORM finance.submit_expense_for_approval(exp_id2);
        RAISE EXCEPTION 'AssertionFailed: Duplicate submission allowed for already submitted expense.';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS ex_msg = MESSAGE_TEXT;
            IF ex_msg NOT LIKE '%Only draft expenses%' THEN
                RAISE EXCEPTION 'AssertionFailed: Unexpected exception during duplicate submission test: %', ex_msg;
            END IF;
            RAISE NOTICE 'Test 5 Passed (Correctly blocked duplicate submission: %).', ex_msg;
    END;

    -- =========================================================================
    -- Test 6: Approve Pending Expense
    -- =========================================================================
    RAISE NOTICE 'Test 6: Approve Pending Expense...';
    
    exp_record := finance.approve_expense(exp_id2, res_john_id);
    
    IF exp_record.status <> 'APPROVED' OR exp_record.approved_by_id <> res_john_id THEN
        RAISE EXCEPTION 'AssertionFailed: Expected APPROVED status and correct approver, got status % and approver %', exp_record.status, exp_record.approved_by_id;
    END IF;

    RAISE NOTICE 'Test 6 Passed.';

    -- =========================================================================
    -- Cleanup
    -- =========================================================================
    RAISE NOTICE 'Cleaning up test finance records...';
    DELETE FROM finance.expense WHERE id IN (exp_id1, exp_id2);
    DELETE FROM finance.flat_contribution WHERE flat_id = flat_101_id AND season_id = active_season_id;
    DELETE FROM finance.audit_log;

    RAISE NOTICE 'All Phase E Verification Tests Completed Successfully!';
END $$;
