# 02 - Role & Permission Matrix

Version: 1.0  
Status: Draft  
Owner: SCOT (Sports and Cultural Organizers of Topaz)  

---

## 1. Introduction
This document defines the user roles, system operations, and access control policies for the SCOT Community Operations Platform. It establishes a clear role-permission matrix to guide authentication, authorization, and data isolation boundaries (including season-level and wing-level isolation) during development.

---

## 2. Role Definitions

### 2.1 SCOT Admin
* **Description:** System administrator responsible for system configuration, seasonal setup, and user provisioning.
* **Key Focus:** Season lifecycle, onboarding SCOT members, role assignments, and flat metadata management.

### 2.2 Core Team
* **Description:** Executive committee of SCOT responsible for overall operations, financial oversight, strategic communications, and procurement.
* **Key Focus:** Finance management, sponsorships, vendor relations, global communications, and strategic decisions.

### 2.3 Event Champion
* **Description:** Operational leads assigned to plan and execute specific standalone or umbrella events.
* **Key Focus:** Event schedule, registration rules, competition fixtures, scores, event announcements, and gallery uploads.

### 2.4 Wing Commander
* **Description:** Wing-level coordinator (one per wing) acting as a bridge between the Core Team and wing residents.
* **Key Focus:** Contribution collections, wing participation, and wing-wide communications.

### 2.5 Wing Captain
* **Description:** Wing-level athletic and cultural organizers (two per wing).
* **Key Focus:** Form wing sports/cultural teams, register participants, and drive wing engagement.

### 2.6 Home Chief
* **Description:** The primary resident representative for a physical flat.
* **Key Focus:** Home member registration management, contribution tracking, voting, and general participation.

### 2.7 Home Member
* **Description:** Other members residing in a flat.
* **Key Focus:** Event self-registration, voting, and viewing platform content.

---

## 3. Operation Groups & Permissions Key

The following keys are used in the matrix to define access level:
* **C:** Create
* **R:** Read
* **U:** Update
* **D:** Delete
* **A:** Approve
* **-:** No Access

---

## 4. Role-Permission Matrix

| Operation Group / Operation | SCOT Admin | Core Team | Event Champion | Wing Commander | Wing Captain | Home Chief | Home Member |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Season Management** | | | | | | | |
| Create Season / Transition | C/U/D | - | - | - | - | - | - |
| View Historical Seasons | R | R | R | R | R | R | R |
| **Member & Role Management** | | | | | | | |
| Onboard SCOT Members / Assign Roles | C/U/D | - | - | - | - | - | - |
| Assign Portfolio to Members | C/U/D | U | - | - | - | - | - |
| **Flat & Resident Management** | | | | | | | |
| Create/Edit Flats | C/U/D | - | - | - | - | - | - |
| Onboard Home Chief / Link to Flat | C/U/D | - | - | - | - | - | - |
| Manage Home Members under Flat | - | - | - | - | - | C/U/D (Own) | - |
| **Flat Contribution Management** | | | | | | | |
| View Flat Contribution Status | R | R | R | R (Own Wing) | R (Own Wing) | R (Own Flat) | R (Own Flat) |
| Update Contribution Status (Mark Paid) | C/U/D | C/U/D | - | U (Own Wing) [1] | - | - | - |
| **Communication & Polls** | | | | | | | |
| Publish Global Announcements | C/U/D | C/U/D | - | - | - | - | - |
| Publish Wing Announcements | - | - | - | C/U/D (Own) | - | - | - |
| Publish Event Announcements | - | - | C/U/D (Assigned) | - | - | - | - |
| Create Polls | C/U/D | C/U/D | - | - | - | - | - |
| Vote in Polls | - | R [2] | R [2] | R [2] | R [2] | Vote (Own) | Vote (Own) |
| **Event & Registration Management** | | | | | | | |
| Manage Events (Umbrella / Standalone) | C/U/D | C/U/D | C/U/D (Assigned) | R | R | R | R |
| Manage Sub-Events (under Umbrella) | C/U/D | C/U/D | C/U/D (Assigned) | R | R | R | R |
| Self-Register for Event | - | - | - | - | - | C (Own Flat) | C (Self Only) |
| Wing Captain Team Registration | - | - | - | - | C/U (Own Wing) | - | - |
| On-Spot Registration | C/U | C/U | C/U (Assigned) | - | - | - | - |
| **Competition & Scoring** | | | | | | | |
| Create Competitions / Config Scoring | C/U/D | C/U/D | C/U/D (Assigned) | R | R | R | R |
| Schedule & Create Fixtures | C/U/D | C/U/D | C/U/D (Assigned) | R | R | R | R |
| Record Competition Scores / Attendance | C/U | C/U | C/U (Assigned) | - | - | - | - |
| **Task Management** | | | | | | | |
| Create Global / Portfolio Tasks | C/U/D | C/U/D | - | - | - | - | - |
| Create Event Tasks | C/U/D | C/U/D | C/U/D (Assigned) | - | - | - | - |
| Update Task Status (Open / WIP / Done)| C/U | C/U | C/U | C/U | C/U | - | - |
| **Finance Operations** | | | | | | | |
| Track Sponsors | R | C/U/D | - | - | - | - | - |
| Manage Vendor Repository | R | C/U/D | - | - | - | - | - |
| Upload Vendor Quotations | R | C/U/D | C/U (Assigned) | - | - | - | - |
| Record Expenses | R | C/U/D | C/U (Assigned) | - | - | - | - |
| Approve Expenses | - | A (Finance Owner) | - | - | - | - | - |
| **Media Gallery** | | | | | | | |
| Create Gallery Albums | C/U/D | C/U/D | C/U (Assigned) | - | - | - | - |
| Upload Photos/Videos | C/U/D | C/U/D | C/U (Assigned) | - | - | R | R |
| **Reporting** | | | | | | | |
| View Financial Reports | R | R | - | - | - | - | - |
| View Participation Reports | R | R | R (Assigned) | R (Own Wing) | R (Own Wing) | R (Own Flat) | R (Own Flat) |
| View Wing Standings / Leaderboard | R | R | R | R | R | R | R |

---

## 5. Matrix Notes & Business Rules

### [1] Contribution Status Updates
* **Rule:** Wing Commanders may update flat contribution status for their *own* wing to "Paid" only if authorized by the Core Team (e.g., they collected the cash contribution locally). However, the final financial reconciliation remains the responsibility of the Core Team (specifically the Finance Portfolio owner).

### [2] SCOT Members Voting
* **Rule:** SCOT Admins, Core Team members, Event Champions, Wing Commanders, and Wing Captains participate in voting in polls *only* if they also reside in a flat in the society. They vote using their resident accounts (Home Chief or Home Member), not their organizational role accounts.

---

## 6. Access Control & Security Policies

### 6.1 Season Isolation
* All read and write operations for events, registrations, contributions, tasks, and finance must be scoped to the active `season_id` context. 
* SCOT Admins and Core Team members can access historical seasons in read-only mode to preserve organizational records.

### 6.2 Wing Isolation
* Wing Commanders and Wing Captains cannot create announcements or view detailed reports for wings other than their own. 
* Wing Captain registration lists are restricted to residents belonging to their wing.

### 6.3 Event Champion Assignment Isolation
* Event Champions can only modify data (fixtures, registration types, score records, announcements, and media uploads) for events where they are explicitly assigned in the `EventAssignment` table.
* They have default resident read-only permissions for other events.

### 6.4 Contribution-Based Participation Gate
* The registration engine must verify the contribution status of a resident's flat before allowing any resident (Home Chief or Home Member) to register for a paid-participating event. 
* Flat status must be `Paid` in the active season to allow registration.
