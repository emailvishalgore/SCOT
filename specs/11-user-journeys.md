# 11 - User Journeys Specification

Version: 1.0  
Status: Draft  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Introduction

This document outlines the step-by-step navigational pathways, user actions, system operations, and database state transitions for the core personas on the SCOT Community Operations Platform. By mapping these user journeys, we ensure the user experience is logically aligned with our Role-Permission Matrix, Database Schema, and System Architecture.

---

## 2. Resident User Journey

This journey describes the lifecycle of resident participation, from initial system entry to event results consumption.

```
Login ──> View Events ──> Register ──> Participate ──> View Results
```

### 2.1 Step-by-Step Path

#### Step 1: Login
* **User Action:** Resident enters phone number or email on `/login` screen.
* **System Operation:** Supabase Auth verifies credentials.
* **Result:** User is redirected to `/dashboard`. JWT claims load user details, flat number, and wing assignment (e.g. Wing "N", Flat "101", Role `HOME_CHIEF`).

#### Step 2: View Events
* **User Action:** User clicks "Events" in sidebar to navigate to `/events`.
* **Screen View:** Displays a calendar or grid of active standalone and umbrella events (e.g., "Ganesh Festival").
* **System Operation:** The client app fetches events filtered by the active `season_id`.

#### Step 3: Register
* **User Action:** Resident selects a sub-event (e.g., "Men's Carrom") and clicks "Register".
* **Database Verification (Gating check):** The application runs the `finance.is_flat_eligible()` stored procedure for the resident's `flat_id` and active `season_id`.
* **Result (Success Path):** If flat status is `PAID`, a record is inserted into the `core.registration` table. The screen updates to show "Registered".
* **Result (Exception Path):** If flat status is `PENDING`, registration is blocked. The user sees a modal: *"Dues Pending. Please contact your Wing Commander to resolve ₹3000 dues."*

#### Step 4: Participate
* **User Action:** Resident attends the competition at the scheduled venue (e.g., Clubhouse).
* **System Operation:** The Event Champion marks the resident's attendance status as `PRESENT` in the `core.competition_participant` table.

#### Step 5: View Results
* **User Action:** Resident navigates to `/leaderboard` or `/events/:id` to check the outcome.
* **Screen View:** Displays placement ranks, scores, and updated Wing Standings points.

---

## 3. Wing Commander User Journey

This journey details how a Wing Commander tracks and updates annual contributions from residents.

```
Login ──> View Pending Contributions ──> Follow-up ──> Update Status
```

### 3.1 Step-by-Step Path

#### Step 1: Login
* **User Action:** Wing Commander signs in on `/login`.
* **Result:** Redirected to `/admin`. User metadata verifies role as `WING_COMMANDER` for Wing "O".

#### Step 2: View Pending Contributions
* **User Action:** Commander clicks "Contributions" to navigate to `/admin/contributions`.
* **Screen View:** Displays a structured ledger of all 28 flats in Wing O.
* **System Operation:** Fetches `finance.flat_contribution` data joined with flat numbers. Flats with pending dues are highlighted in red. RLS restricts the view to only Wing O.

#### Step 3: Follow-up
* **User Action:** Commander checks flat numbers with `PENDING` status, notes resident phone numbers, and follows up offline (via WhatsApp or door-to-door).
* **Result:** Commander collects cash or verifies a bank transfer transaction.

#### Step 4: Update Status
* **User Action:** Commander clicks "Mark Paid" next to Flat 304, inputs the collected amount (₹3000), and clicks confirm.
* **System Operation:** Calls `finance.record_payment(flat_id, season_id, amount, recorder_id)`. The function verifies the user's role via JWT.
* **Result:** Database inserts/updates the `flat_contribution` status to `PAID`, records payment date/member ID, generates a PDF receipt saved to Google Drive, and saves the file URL to `receipt_url`. The ledger updates to green.

---

## 4. Event Champion User Journey

This journey maps the creation, execution, scoring, and publication lifecycle of a competition.

```
Create Competition ──> Open Registration ──> Create Fixtures ──> Record Scores ──> Publish Results
```

### 4.1 Step-by-Step Path

#### Step 1: Create Competition
* **User Action:** Event Champion navigates to `/admin/events`, selects an event, and clicks "Create Competition".
* **Screen View:** Input form for Competition Name (e.g. "Inter-wing Football"), Type (Individual vs Wing-based), and Configurable Scoring Rules (win points, placement points, tied placement resolution, walkover score).
* **System Operation:** Inserts a record into `core.competition` with rules saved in the `scoring_rule_json` column.

#### Step 2: Open Registration
* **User Action:** Champion changes competition status from `DRAFT` to `SCHEDULED`.
* **Result:** The competition registration page becomes visible on the Resident portal.

#### Step 3: Create Fixtures
* **User Action:** Once registration closes, Champion navigates to `/admin/competitions` and clicks "Generate Fixtures".
* **System Operation:** The system counts participants. If not a power-of-two, it injects "Byes" following seed rules. It schedules matchups and writes records to `core.fixture`.
* **Result:** Match brackets display on the coordinator and resident screens.

#### Step 4: Record Scores
* **User Action:** At the venue, Champion logs match results by clicking "Record Score" next to a fixture (e.g., Wing N vs Wing P).
* **Result (Standard Path):** Input score (e.g. 2-1) and select the winner. The status of the fixture transitions to `COMPLETED`.
* **Result (Tie-Breaker Path):** If scores are tied (e.g. 1-1 in Chess), the system evaluates `tiedPlacementResolution` policy (SPLIT vs FULL) from `scoring_rule_json` and updates participant points.
* **Result (Walkover Path):** If a wing is absent, Champion selects "Walkover". The system marks the present opponent as `COMPLETED_WALKOVER`, awards the default score (e.g. 2-0), and forfeits the absent wing's points.

#### Step 5: Publish Results
* **User Action:** Champion reviews final standings and clicks "Complete Competition".
* **System Operation:** The competition status transitions to `COMPLETED`. The system automatically aggregates points and inserts `core.wing_score` points records.
* **Result:** Standing updates are published live on `/leaderboard` for all residents.
