# 14 - Supabase Row-Level Security (RLS) Specification

Version: 1.0  
Status: Draft  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Introduction & JWT Claims Architecture

Supabase leverages PostgreSQL **Row-Level Security (RLS)** to secure database tables. When a client performs a query, Supabase passes the user's JSON Web Token (JWT) credentials. 

To enable fast, non-recursive RLS policy checks, user roles and boundary metadata are injected as custom claims inside the JWT user metadata. This metadata is extracted at database runtime using the `auth.jwt()` helper:

```json
{
  "sub": "user-uuid",
  "email": "resident@topaz.com",
  "user_metadata": {
    "role": "WING_COMMANDER",
    "wing_id": "uuid-wing-o",
    "flat_id": "uuid-flat-304"
  }
}
```

---

## 2. Resident RLS Policies (Own Flat Boundary)

Residents must have access to their own flat details, family occupancy assignments, and billing contribution ledgers, while remaining locked out of other flats' data.

### 2.1 View Own Flat
Allows residents to read metadata only for their assigned physical flat.
```sql
CREATE POLICY resident_select_own_flat ON core.flat
    FOR SELECT
    USING (
        id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
    );
```

### 2.2 View Own Flat Occupants
Allows flat members to view occupancy profiles linked to their flat.
```sql
CREATE POLICY resident_select_own_occupants ON core.resident_flat_assignment
    FOR SELECT
    USING (
        flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
        AND
        season_id IN (SELECT id FROM core.season WHERE status = 'ACTIVE')
    );
```

### 2.3 View Own Flat Contributions
Allows residents to check their payment dues and download generated receipts.
```sql
CREATE POLICY resident_select_own_contributions ON finance.flat_contribution
    FOR SELECT
    USING (
        flat_id = (auth.jwt() -> 'user_metadata' ->> 'flat_id')::uuid
    );
```

---

## 3. Wing Commander RLS Policies (Own Wing Boundary)

Wing Commanders oversee contribution collections and announcements for all flats within their assigned wing, but are isolated from other wings.

### 3.1 View Own Wing Flats
Allows Wing Commanders to view flats within their assigned wing.
```sql
CREATE POLICY wing_commander_select_own_flats ON core.flat
    FOR SELECT
    USING (
        wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
    );
```

### 3.2 View & Update Own Wing Contributions
Allows Wing Commanders to track the collection ledger and upload offline payment receipts for flats in their wing.
```sql
CREATE POLICY wing_commander_all_own_contributions ON finance.flat_contribution
    FOR ALL
    USING (
        flat_id IN (
            SELECT id FROM core.flat 
            WHERE wing_id = (auth.jwt() -> 'user_metadata' ->> 'wing_id')::uuid
        )
    );
```

---

## 4. Event Champion RLS Policies (Assigned Events Boundary)

Event Champions manage the schedule, registrations, brackets, and score logs for their assigned events, but have standard read-only access to other competitions.

### 4.1 Update Assigned Event Metadata
Allows Event Champions to modify details of events they are explicitly assigned to manage.
```sql
CREATE POLICY event_champion_update_assigned_events ON core.event
    FOR UPDATE
    USING (
        id IN (
            SELECT event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = auth.uid()
        )
    );
```

### 4.2 Record Scores for Assigned Competitions
Allows Event Champions to log fixture scores and configure brackets for their competitions.
```sql
CREATE POLICY event_champion_manage_competition ON core.competition
    FOR ALL
    USING (
        event_id IN (
            SELECT event_id FROM core.event_assignment ea
            JOIN core.member_season_assignment msa ON ea.member_assignment_id = msa.id
            WHERE msa.member_id = auth.uid()
        )
    );
```

---

## 5. Core Team RLS Policies (Administrative & Finance Scope)

The Core Team handles executive operations, sponsorship collections, vendor bids, and expense disbursements.

### 5.1 View All Data
The Core Team has global read permissions across all organizational, resident, and financial tables.
```sql
CREATE POLICY core_team_select_all ON core.flat
    FOR SELECT
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'CORE_TEAM'
    );
```

### 5.2 Approve Expenses
Allows the Core Team (specifically the Finance Portfolio Owner) to approve submitted expenses:
```sql
CREATE POLICY core_team_approve_expenses ON finance.expense
    FOR UPDATE
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'CORE_TEAM'
    )
    WITH CHECK (
        status = 'APPROVED'
    );
```

---

## 6. Guidelines to Prevent Recursive Policy Loops

To avoid database recursion loops (which exceed PostgreSQL's stack depth and crash transactions), RLS policies must adhere to the following rules:

1. **Prioritize JWT Claims:** Never perform sub-queries to fetch a user's role or wing inside RLS policies. Always read them directly from the JWT claims: `(auth.jwt() -> 'user_metadata' ->> 'role')`.
2. **Avoid Bi-directional Table Checks:** If Table A's policy checks Table B, Table B's policy must *never* check Table A.
3. **Use Helpers definition:** For complex checks, write lightweight database helper functions defined as `SECURITY DEFINER` and call them within the RLS policy, ensuring the helper itself does not invoke RLS checking.
