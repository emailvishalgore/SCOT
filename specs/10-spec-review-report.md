# 10 - Specification Review Report

Version: 1.0  
Status: Completed  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Executive Summary

This report reviews the complete specification suite (`01-business-requirements-specification.md` to `09-ui-navigation.md`) for the SCOT Community Operations Platform. The specifications are highly aligned and robust; however, several critical discrepancies, security gaps, and database design omissions must be resolved before proceeding to database migration and application coding. 

Addressing these issues now prevents database schema changes, RLS security bypasses, and memory/performance bottlenecks during development.

---

## 2. Identified Issues & Analysis

### 2.1 Contradictions
1. **Flat Occupancy Restrictions:** 
   * *Conflict:* [01 BRS Section 7](file:///c:/Personal/AI%20Projects/SCOT/specs/01-business-requirements-specification.md#L249-L267) states: *"Each Flat shall have: Head User Account, Family User Account"*, implying exactly two accounts. However, [03 Domain Model](file:///c:/Personal/AI%20Projects/SCOT/specs/03-domain-model.md#L140-L148) and [08 Database Design](file:///c:/Personal/AI%20Projects/SCOT/specs/08-database-design.md#L71-L80) permit one `HOME_CHIEF` and multiple `HOME_MEMBER` records.
   * *Resolution:* Clarify that the BRS is defining the *logical login limits* (a single primary owner account and a shared family account), while the database structure is designed to support the underlying resident list dynamically.
2. **Numeric Score Mapping:**
   * *Conflict:* [08 Database Design](file:///c:/Personal/AI%20Projects/SCOT/specs/08-database-design.md#L182-L192) defines `score` in `competition_participant` as `NUMERIC(5,2)`. While this accommodates decimal ranks (e.g. judges' scores), team sports use integer values (e.g., 2-0 goals).
   * *Resolution:* Keep `NUMERIC(5,2)` as it handles both formats. Clarify that UI and calculations should format or round the values based on competition type.

### 2.2 Missing Entities & Database Columns
1. **Flat Contribution Receipt URL Omission:**
   * *Gap:* [06 Finance Spec Section 2.2](file:///c:/Personal/AI%20Projects/SCOT/specs/06-finance-operations-spec.md#L29-L38) states that *“A PDF receipt is automatically generated and linked to the FlatContribution record”*, but the DDL in [08 Database Design Section 2.3](file:///c:/Personal/AI%20Projects/SCOT/specs/08-database-design.md#L206-L215) lacks a `receipt_url` column.
   * *Remediation:* Modify the `finance.flat_contribution` DDL to add:
     ```sql
     ALTER TABLE finance.flat_contribution ADD COLUMN receipt_url VARCHAR(500);
     ```
2. **Audit Trails for Financial Overrides:**
   * *Gap:* [02 Role-Permission Matrix](file:///c:/Personal/AI%20Projects/SCOT/specs/02-role-permission-matrix.md#L72-L74) allows Wing Commanders and Core Team members to override flat status. For financial compliance, there is no ledger table to track overrides or updates.
   * *Remediation:* Create an audit log table in the `finance` schema:
     ```sql
     CREATE TABLE finance.audit_log (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         editor_id UUID NOT NULL, -- core.member
         table_name VARCHAR(100) NOT NULL,
         record_id UUID NOT NULL,
         action_type VARCHAR(20) NOT NULL, -- INSERT/UPDATE/DELETE
         old_value JSONB,
         new_value JSONB,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```
3. **Scoping System Configuration to Seasons:**
   * *Gap:* [08 Database Design Section 2.2](file:///c:/Personal/AI%20Projects/SCOT/specs/08-database-design.md#L194-L198) defines `core.system_config` globally, but configs (e.g. contribution dues, approval thresholds) change per season.
   * *Remediation:* Add a `season_id` column to `core.system_config` to ensure configurations remain isolated between seasons:
     ```sql
     ALTER TABLE core.system_config ADD COLUMN season_id UUID REFERENCES core.season(id);
     ```

### 2.3 Missing Workflows
1. **Seasonal Transition Rollforward Workflow:**
   * *Gap:* No workflow exists to define how a new season is initialized (e.g. creating a new `Season` record and automatically creating `PENDING` `flat_contribution` entries for all 280 flats).
   * *Remediation:* Define a PostgreSQL trigger or stored procedure to automate this:
     ```sql
     CREATE OR REPLACE FUNCTION core.initialize_new_season(new_season_id UUID)
     RETURNS VOID AS $$
     BEGIN
         -- Initialize flat contributions for all existing flats
         INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status)
         SELECT id, new_season_id, 3000.00, 'PENDING' FROM core.flat;
     END;
     $$ LANGUAGE plpgsql;
     ```
2. **Contribution Status Reversal Workflow:**
   * *Gap:* The contribution state machine allows `PAID -> PENDING` for administrative overrides, but does not define validation rules.
   * *Remediation:* If payment is marked back to PENDING, any active registrations for residents in that flat must be checked and flagged as invalid/suspended.

### 2.4 Security Gaps
1. **SQL Injection/Bypass in `SECURITY DEFINER` Functions:**
   * *Gap:* Stored procedures defined as `SECURITY DEFINER` (e.g., `finance.record_payment`) execute with superuser privileges, bypassing table-level RLS policies. If authorization checks are not included in the function body, *any* authenticated user can call the function to mark their flat as PAID.
   * *Remediation:* Enforce explicit role validation checks inside the body of every `SECURITY DEFINER` function:
     ```sql
     -- Example check within finance.record_payment:
     IF (auth.jwt() -> 'user_metadata' ->> 'role')::text NOT IN ('SCOT_ADMIN', 'CORE_TEAM', 'WING_COMMANDER') THEN
         RAISE EXCEPTION 'Unauthorized: Insufficient privileges.';
     END IF;
     ```
2. **Resident Data Privacy Gaps:**
   * *Gap:* RLS policies on the `core.resident` and `core.resident_flat_assignment` tables must restrict access. Without strict policies, residents can scrape phone numbers and personal information of residents in other wings.
   * *Remediation:* Enforce that standard residents can only query resident details of their own flat or wing, while only SCOT members can view the master list.

### 2.5 Scalability Concerns (Supabase Free Tier Limits)
1. **Storage Limits (1GB Cap):**
   * *Concern:* [01 BRS](file:///c:/Personal/AI%20Projects/SCOT/specs/01-business-requirements-specification.md#L95-L99) includes video and photo gallery capabilities. At 500+ users, uploading raw media to Supabase Storage will deplete the 1GB free tier quickly.
   * *Mitigation:* 
     1. Integrate **Google Drive Storage** of the Admin's Google account (which typically provides 15GB free storage).
     2. All media uploads (photos/videos), vendor quotations, and payment receipts are uploaded directly to a dedicated Google Drive folder (via frontend Google Picker API or backend Deno Edge Function using Google Drive OAuth2/Service Account auth).
     3. The database URL columns (`receipt_url`, `quotation_file_url`, `url` in `media_item`) store the Google Drive shareable web links. The database column sizes must be expanded to `VARCHAR(1000)` to handle longer Google Drive sharing URLs.
2. **Database Connection Pooling:**
   * *Concern:* Supabase Free Tier limits active database connections.
   * *Mitigation:* Ensure the React client app utilizes the connection pool wrapper (Supabase serverless REST endpoint) rather than establishing direct persistent PostgreSQL connections.

### 2.6 Supabase RLS Policy Concerns (Recursive Policy Loops)
1. **RLS Performance & Recursion Loops:**
   * *Concern:* RLS policies that execute `SELECT` checks on the same table or perform multi-table joins (e.g. checking registrations by joining flats, wings, and assignments) cause recursive loops and crash database transactions.
   * *Mitigation:* 
     * Avoid table joins inside RLS policies.
     * Store key operational identifiers (like `wing_id` and `role`) directly in the user's Auth metadata (`auth.jwt()`). RLS policies should verify authorization using JWT claims rather than executing sub-queries.

---

## 3. Remediation DDL Fixes

The following database updates must be appended to the DDL scripts in `08-database-design.md`:

```sql
-- 1. Add receipt_url column as VARCHAR(1000)
ALTER TABLE finance.flat_contribution ADD COLUMN receipt_url VARCHAR(1000);

-- 2. Expand existing URL columns to support Google Drive web links
ALTER TABLE finance.vendor_quotation ALTER COLUMN quotation_file_url TYPE VARCHAR(1000);
ALTER TABLE core.media_item ALTER COLUMN url TYPE VARCHAR(1000);

-- 3. Scoping configs to seasons
ALTER TABLE core.system_config ADD COLUMN season_id UUID REFERENCES core.season(id);

-- 4. Create finance audit log
CREATE TABLE finance.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Apply role verification helper to payment record RPC
CREATE OR REPLACE FUNCTION finance.record_payment(
    target_flat_id UUID,
    active_season_id UUID,
    payment_amount DECIMAL,
    recorder_member_id UUID
) RETURNS finance.flat_contribution AS $$
BEGIN
    -- Authorization Check
    IF (auth.jwt() -> 'user_metadata' ->> 'role')::text NOT IN ('SCOT_ADMIN', 'CORE_TEAM', 'WING_COMMANDER') THEN
        RAISE EXCEPTION 'Unauthorized: Insufficient privileges.';
    END IF;

    INSERT INTO finance.flat_contribution (flat_id, season_id, amount, status, payment_date, recorded_by_id)
    VALUES (target_flat_id, active_season_id, payment_amount, 'PAID', NOW(), recorder_member_id)
    ON CONFLICT (flat_id, season_id) 
    DO UPDATE SET status = 'PAID', payment_date = NOW(), recorded_by_id = recorder_member_id
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
