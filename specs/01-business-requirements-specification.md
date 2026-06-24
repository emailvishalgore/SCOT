# SCOT Community Operations Platform

## Business Requirements Specification (BRS)

Version: 1.0

Status: Draft

Owner: SCOT (Sports and Cultural Organizers of Topaz)

---

# 1. Product Vision

SCOT Community Operations Platform is a digital platform designed to manage the complete annual operations of SCOT (Sports and Cultural Organizers of Topaz).

The platform shall provide a centralized system for managing residents, events, competitions, communications, contributions, tasks, sponsors, vendors, galleries, and reporting.

The platform shall support SCOT's yearly operating cycle and preserve organizational history across seasons.

---

# 2. Business Objectives

The platform aims to:

* Digitize SCOT operations.
* Increase resident participation.
* Improve event planning and execution.
* Improve transparency of contributions and expenditures.
* Simplify communication between SCOT and residents.
* Enable wing-wise engagement and competition.
* Preserve organizational knowledge and event history.
* Reduce manual tracking through spreadsheets and WhatsApp groups.

---

# 3. Scope

## In Scope

### Organization Management

* Season management
* Member management
* Role management
* Portfolio assignment
* Wing management

### Resident Management

* Flat management
* Resident onboarding
* Resident authentication
* Family management

### Communication

* Announcements
* Notifications
* Polls

### Event Management

* Standalone events
* Umbrella events
* Sub-events
* Event registration
* Event assignments

### Competition Management

* Individual competitions
* Wing-based competitions
* Fixtures
* Scoring
* Attendance
* Results

### Task Management

* Task creation
* Task assignment
* Task tracking

### Finance Operations

* Annual contribution tracking
* Sponsor tracking
* Vendor tracking
* Vendor quotations
* Expense tracking
* Approval workflows

### Media Management

* Photo galleries
* Video galleries
* Event albums

### Reporting

* Participation reports
* Contribution reports
* Competition reports
* Finance reports

---

## Out of Scope (Initial Release)

* Online payments
* Payment gateways
* Vendor payouts
* UPI integrations
* Refund processing
* Automated WhatsApp messaging
* AI-generated content

These features may be introduced in future releases.

---

# 4. Organization Structure

The platform shall support the following organizational hierarchy.

SCOT
├── SCOT Admin
├── Core Team
├── Event Champions
├── Wing Commanders
└── Wing Captains

Residents participate in SCOT activities but are not members of the SCOT organization.

---

# 5. Season Model

SCOT operates on a yearly cycle.

Season Duration:
June to May

Examples:

* Season 2025-26
* Season 2026-27
* Season 2027-28

The platform shall support multiple historical seasons.

Member assignments may change between seasons.

Historical records shall remain accessible.

---

# 6. User Types

## SCOT Admin

Responsible for:

* Season creation
* Member onboarding
* Role assignment
* Permission management
* System administration

Number of Users:
Typically 2-3

---

## Core Team

Responsible for:

* Finance oversight
* Communications
* Sponsorship management
* Logistics
* Vendor management
* Stall management
* Sound and electricity management
* Strategic decisions

---

## Event Champions

Responsible for:

* Event planning
* Event execution
* Competition management
* Event registrations
* Event announcements
* Gallery uploads
* Event reporting

Multiple Event Champions may be assigned to a single event.

No lead or coordinator hierarchy exists within Event Champions.

---

## Wing Commanders

One Wing Commander shall be assigned to each wing.

Responsibilities:

* Contribution follow-up
* Wing-level communication
* Participation tracking
* Coordination with Core Team

---

## Wing Captains

Two Wing Captains shall be assigned to each wing.

Responsibilities:

* Event participation mobilization
* Team formation
* Sports coordination
* Rules communication

---

## Residents

Residents may:

* Register for events
* Participate in competitions
* Vote in polls
* View announcements
* View galleries
* Track participation

---

# 7. Society Structure

The society consists of:

* 10 Wings
* 28 Flats per Wing
* Approximately 280 Flats

Each Flat shall have:

* Head User Account
* Family User Account

Residents may be:

* Owners
* Tenants

Participation eligibility is governed by contribution status.

---

# 8. Contribution Rules

Annual Contribution Amount:
₹3000 per Flat

Contribution Status:

* Pending
* Paid

Only Flats with Paid status shall be eligible for event participation.

Contribution tracking shall be maintained per season.

---

# 9. Portfolio Management

SCOT members may be assigned to one or more portfolios.

Example portfolios include:

* Finance
* Communications
* Sponsorship
* Logistics
* Food
* Stalls
* Sports
* Cultural
* Vendor Management
* Sound and Electricity

Portfolios may evolve over time.

---

# 10. Event Management

The platform shall support:

## Standalone Events

Examples:

* Yoga Workshop
* Blood Donation Camp

## Umbrella Events

Examples:

* Ganesh Festival

Umbrella events may contain multiple sub-events.

Example:

Ganesh Festival
├── Cricket Tournament
├── Dance Competition
├── Singing Competition
├── Rangoli Competition
└── Food Festival

---

# 11. Event Registration

The platform shall support multiple registration methods.

## Resident Self Registration

Residents register directly.

## Wing Captain Registration

Wing Captains submit participant lists.

## On-Spot Registration

SCOT members register participants during the event.

The registration mechanism shall be configurable per event.

---

# 12. Competition Management

The platform shall support:

## Individual Competitions

Examples:

* Chess
* Singing
* Drawing
* Rangoli

## Wing-Based Competitions

Examples:

* Cricket
* Football
* Tug of War

The platform shall support:

* Fixtures
* Scheduling
* Attendance
* Scoring
* Results
* Rankings

---

# 13. Wing Championship

The platform shall support season-level wing scoring.

Competitions may award points to participating wings.

Points calculation may vary by competition.

The platform shall calculate:

* Wing standings
* Seasonal rankings
* Best Wing of the Season

Scoring rules shall be configurable.

---

# 14. Communication

The platform shall support:

## Global Announcements

Published by SCOT.

## Wing Announcements

Published by Wing Commanders.

## Event Announcements

Published by Event Champions.

Residents may view announcements.

Residents may not comment on announcements.

---

# 15. Polls

SCOT may create polls.

Residents may vote.

Poll results shall be visible based on configuration.

---

# 16. Task Management

Tasks may be assigned to:

* Individual members
* Portfolios
* Event teams

Task statuses:

* Open
* In Progress
* Done

---

# 17. Finance Operations

The platform shall support:

## Contribution Tracking

Annual flat-level contributions.

## Sponsorship Tracking

Sponsor commitments and collections.

## Vendor Repository

Reusable vendor records.

## Vendor Quotations

Multiple quotations per vendor.

## Expense Tracking

Expense categories may include:

* Vendors
* Logistics
* Prizes
* Miscellaneous

## Approval Workflow

Expenses may require approval from designated SCOT portfolio owners.

---

# 18. Gallery

The platform shall support:

* Photos
* Videos
* Albums

Residents may view gallery content.

Only authorized SCOT members may upload content.

---

# 19. Reporting

The platform shall support:

* Contribution Reports
* Participation Reports
* Wing Participation Reports
* Wing Championship Reports
* Sponsor Reports
* Vendor Reports
* Expense Reports
* Task Completion Reports

---

# 20. Future Enhancements

Potential future enhancements include:

* UPI Payments
* Payment Gateway Integration
* WhatsApp Automation
* AI Announcement Writer
* AI Event Planner
* AI Budget Estimator
* AI Fixture Generator
* Sponsor Follow-up Assistant

---

# 21. Success Criteria

The platform shall be considered successful when:

* Resident participation increases.
* Event execution becomes easier.
* Contribution tracking becomes transparent.
* Communication becomes centralized.
* SCOT operational activities are digitized.
* Historical knowledge is preserved across seasons.
* Manual spreadsheet dependency is significantly reduced.
