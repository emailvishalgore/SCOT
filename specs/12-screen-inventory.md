# 12 - Screen Inventory Specification

Version: 1.0  
Status: Draft  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Inventory Summary

This specification lists all screens in the SCOT Community Operations Platform, including their routes, access levels, key UI components, data mappings, and external Google Drive API integration points.

---

## 2. Public & Resident Portal Screens

### SCR-001: Login Screen
* **Route:** `/login`
* **Access Level:** Public (Unauthenticated)
* **UI Components:** Login card, input fields, error message alerts.
* **Data Inputs:** Phone Number / Email, Password.
* **Data Outputs:** Calls Supabase Auth sign-in endpoints. Sets JWT in browser session.

---

### SCR-002: Resident Dashboard
* **Route:** `/dashboard` or `/`
* **Access Level:** Resident & Member (Authenticated)
* **UI Components:** Flat payment status badge (Green for PAID, Red for PENDING), quick stats cards (upcoming events count, active tasks count), global announcements ticker.
* **Data Inputs:** Active Season dropdown selector.
* **Data Outputs:** 
  * Queries `finance.flat_contribution` for status.
  * Queries `core.event` for active events count.
  * Queries `core.announcement` for recent notifications.

---

### SCR-003: Events Listing Screen
* **Route:** `/events`
* **Access Level:** Resident & Member
* **UI Components:** Filter tabs (All, Standalone, Umbrella), Search Bar, Event Grid Cards (displays name, dates, venue, time, status).
* **Data Inputs:** Search query input, filter selection tabs.
* **Data Outputs:** Queries `core.event` (scoped by `season_id` from RLS).

---

### SCR-004: Event & Sub-Event Details
* **Route:** `/events/:id`
* **Access Level:** Resident & Member
* **UI Components:** Event description panel, Event Champions profile list, Sub-events list table, "Self Register" interactive action button.
* **Data Inputs:** "Self Register" / "De-register" click action.
* **Data Outputs:** 
  * Queries `core.event` and `core.sub_event` details by ID.
  * Queries `core.registration` to check if user is already registered.
  * Registration button calls database RPC `finance.is_flat_eligible()`. If successful, inserts into `core.registration`.

---

### SCR-005: Leaderboard / Wing Standings
* **Route:** `/leaderboard`
* **Access Level:** Resident & Member
* **UI Components:** Wing Championship Leaderboard Table (ranked by points), Wing Points Breakdown chart, Competition Results log.
* **Data Inputs:** None.
* **Data Outputs:** Queries `core.wing_score` points aggregated by `wing_id` for the active `season_id`.

---

### SCR-006: Announcements Board
* **Route:** `/announcements`
* **Access Level:** Resident & Member
* **UI Components:** Filter tabs (Global, My Wing, Events), Announcements Card List (title, description, author name, timestamp).
* **Data Inputs:** Tab filter selector.
* **Data Outputs:** Queries `core.announcement` filtered by `scope` and user's `wing_id`.

---

### SCR-007: Media Gallery Album Views
* **Route:** `/gallery`
* **Access Level:** Resident & Member
* **UI Components:** Album Cards Grid (displaying title, image count, and thumbnail), Image/Video Lightbox popup player.
* **Data Inputs:** Album card click, photo carousel pagination.
* **Data Outputs:** 
  * Queries `core.gallery_album` to populate categories.
  * Queries `core.media_item` URLs for images/videos in selected albums.
* **Google Drive Integration:** Renders image and video file view URLs directly sourced from Google Drive storage links.

---

## 3. Organizer Admin Control Screens

### SCR-008: Admin Control Dashboard
* **Route:** `/admin`
* **Access Level:** SCOT Member (Authenticated)
* **UI Components:** Task completion gauge chart, current season status override widget, quick links to logs and reports.
* **Data Inputs:** System config updates, active season selector.
* **Data Outputs:** Queries system-wide performance aggregates across `core` and `finance` schemas.

---

### SCR-009: User and Role Provisioning
* **Route:** `/admin/members`
* **Access Level:** SCOT Admin
* **UI Components:** Member grid table, Portfolio tags, "Onboard Member" action modal, Flat Occupancy linked resident directory.
* **Data Inputs:** Member metadata details (Name, Phone), Role selection dropdown, Wing association selection dropdown.
* **Data Outputs:** Performs CRUD operations on `core.member`, `core.member_season_assignment`, `core.portfolio`, and `core.resident_flat_assignment`.

---

### SCR-010: Flat Contribution Ledger
* **Route:** `/admin/contributions`
* **Access Level:** Core Team & Wing Commander
* **UI Components:** Wing Filter tabs, Flat Grid Ledger (color-coded blocks representing flats), "Mark Paid" trigger modal.
* **Data Inputs:** Wing selector filter, Flat Payment form (Amount field, cash/bank checkbox, Google Drive upload file picker).
* **Data Outputs:** 
  * Queries `finance.flat_contribution` data (RLS restricted for Wing Commanders).
  * Confirming payment triggers `finance.record_payment()` RPC.
* **Google Drive Integration:** Automatically generates and uploads a payment receipt PDF to the Admin's Google Drive folder, returning the link to `receipt_url`.

---

### SCR-011: Event & Sub-Event Editor
* **Route:** `/admin/events`
* **Access Level:** Event Champion & Admin
* **UI Components:** Event Creation Form (Name, Description, Dates, Venue, Time, Type), Event Champions selector dropdown, Sub-events editor modal.
* **Data Inputs:** Event metadata form inputs, Champion checkbox assignments.
* **Data Outputs:** Performs CRUD operations on `core.event`, `core.sub_event`, and `core.event_assignment`.

---

### SCR-012: Competition & Bracket Manager
* **Route:** `/admin/competitions`
* **Access Level:** Event Champion & Admin
* **UI Components:** Competition Setup Form, Brackets Visualizer Panel (Knockout Tree / Round Robin Standings Grid), "Record Score" action modal.
* **Data Inputs:** 
  * Scoring config inputs (placement points, win/draw/loss points, tied score split/full dropdown, walkover defaults).
  * Bracket generation click triggers.
  * Score entries (Participant scores, walkover checkboxes).
* **Data Outputs:** Performs CRUD operations on `core.competition`, `core.fixture`, and `core.competition_participant`.

---

### SCR-013: Finance & Expense Manager
* **Route:** `/admin/finance`
* **Access Level:** Core Team & Event Champion
* **UI Components:** Sponsor commit logs list, Vendor Directory table, Vendor Quotations panel (with upload quotation buttons), Expense Ledger table (Draft, Pending, Approved review lists).
* **Data Inputs:** 
  * Sponsor commitment inputs (Company, Contact, Amount Committed, Amount Collected).
  * Upload quote files (Google Drive uploader).
  * Log Expense form (Amount, Category dropdown, description, receipt file uploader).
  * Expense Approval actions ("Approve" / "Reject" clicks).
* **Data Outputs:**
  * Performs CRUD operations on `finance.sponsor`, `finance.vendor`, `finance.vendor_quotation`, and `finance.expense`.
  * Submitting expense calls `finance.submit_expense_for_approval()`. Approving expense calls `finance.approve_expense()`.
* **Google Drive Integration:** Uploads vendor quotation PDFs and expense bill/receipt images directly to Google Drive folder, mapping file links to `quotation_file_url` and `receipt_url` respectively.

---

### SCR-014: Tasks Kanban Board
* **Route:** `/admin/tasks`
* **Access Level:** SCOT Member
* **UI Components:** Kanban columns (Open, In Progress, Done), Task Detail card component, "New Task" form modal.
* **Data Inputs:** Drag-and-drop card drag triggers, task descriptions, assignee details, due dates.
* **Data Outputs:** Performs CRUD operations on `core.task`.
