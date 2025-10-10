# Basecamp - Healthcare AR Management System

## Overview

Basecamp is a multi-tenant healthcare accounts receivable (AR) management system designed for medical claims processing. It enables healthcare organizations to manage claims workflows, track denials, monitor productivity, and automate task prioritization. Built for enterprise use, it supports role-based access control (RCM Specialist, Manager, System Administrator, Client User, Auditor) and provides financial intelligence for medical billing operations. The system aims to streamline operations and enhance financial performance for healthcare providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18 (TypeScript), Wouter (routing), TanStack React Query v5 (server state), shadcn/ui (UI components), Tailwind CSS (styling).

**Design System:** Adheres to Microsoft Fluent Design principles, optimized for data-heavy enterprise healthcare applications. Features include information density, professional aesthetic, a subtle elevation system, dual theme support (light/dark mode), and role-based visual hierarchy.

**Component Architecture:** Employs reusable UI components, domain-specific components for claims management (e.g., ClaimsTable, MetricCard), and layout components (e.g., AppSidebar).

**State Management Approach:** Server state via React Query; authentication state via `useAuth` hook; theme state via Context API; form state with react-hook-form and Zod validation.

### Backend Architecture

**Technology Stack:** Node.js (TypeScript), Express.js, Drizzle ORM with Neon serverless PostgreSQL, express-session (session management), OpenID Connect via Replit Auth with Passport.js (authentication).

**API Design:** RESTful API under `/api` with authentication, tenant isolation at the data access layer, and response logging.

**Data Access Pattern:** Features a storage abstraction layer, tenant-scoped queries, bulk operations for claims and tasks (including CSV upload with transactional safety), and bulk task assignment for high-volume operations. Computed metrics aggregation is also supported.

**Background Processing:** Includes a task generator for automated priority scoring based on claim age, balance, denial codes, and payor type, along with SLA status computation.

### Database Architecture

**Database Technology:** PostgreSQL (Neon serverless).

**Multi-Tenancy:** Tenant-scoped data model using `tenantId` foreign keys and row-level isolation. Tenant settings are stored as JSONB.

**Core Schema:**
1.  **Tenants Table:** Organization-level configuration with JSONB settings.
2.  **Users Table:** User authentication, profiles, and role-based access control (RCM Specialist, Manager, System Administrator, Client User, Auditor).
3.  **Claims Table:** Medical claim records with patient, payor, financial, temporal, clinical, and workflow data.
4.  **Tasks Table:** Workflow task management linked to claims, with user assignment, priority, and status.
5.  **Activity Logs Table:** Audit trail for actions, user attribution, and JSONB details.
6.  **Sessions Table:** PostgreSQL-backed authentication sessions with TTL-based expiration.
7.  **Team Assignments Table:** Region and payer assignments for team members with employee IDs.
8.  **Daily Targets Table:** Daily claim processing targets with historical tracking and change reasons.
9.  **Productivity Metrics Table:** Real-time productivity tracking including claims processed, pending, handling time, accuracy rate, and **revenue collected** (decimal precision: 12,2 supporting up to $999,999,999,999.99).

**Data Validation:** Utilizes Zod schemas generated from Drizzle definitions for type-safe data models and API request validation.

### UI/UX Decisions
- **Productivity Analytics:** Implemented comprehensive historical productivity tracking with date range filtering, trend visualization, summary metrics, and a dual-view team performance table. Includes skeleton loaders, error handling, and role-based access for Managers and System Administrators.
- **Team Productivity Management:** A dedicated page at `/team-productivity` for Managers and System Administrators to:
  - View team overview metrics (total members, avg performance, high performers, claims processed)
  - Manage region/payer assignments with bulk operations
  - Set and track daily claim targets with change history
  - Monitor real-time productivity with performance badges (High ≥100%, Medium 80-99%, Low <80%)
  - Search and filter team members by name, employee ID, or email
  - Multi-select team members for bulk assignment and target setting operations
  - **Bulk Task Generation:** One-click "Generate Tasks" button that automatically creates tasks to fulfill daily targets:
    - Calculates per-user remaining targets (target - processed) for all team members
    - Generates tasks distributed proportionally across users who haven't met their targets
    - Creates one realistic claim per task with all metadata fields populated
    - Marks tasks as completed with today's date
    - Updates productivity metrics automatically
    - Shows confirmation dialog explaining the automation process
- **Navigation:** Simplified sidebar navigation with role-based menu items including Team Productivity for Managers/Admins.
- **Work Group Assignment & Filtering:** Introduced a 3-dimensional filtering system (Line of Business, Criteria, Team) on the Task Management page with multi-select popovers, query parameter persistence, and real-time updates. Claim Detail Modal updated for single-select Work Group assignment.
- **Team Management:** A dedicated page at `/team-management` for System Administrators to view and manage users within their tenant, including role editing with client-side and server-side access control.
- **AR Tasks Modal Redesign:**
  - Removed Progress field (slider and input) from the interface
  - Changed Priority to Risk Score with discrete values 1-10 for clearer risk assessment
  - Relabeled "Accurio Action/Status" to "Action/Status" for clarity
  - Reorganized Resolution fields (Resolution Category, Root Cause Category, Root Cause Detail, Resolution/Action Taken) to appear directly above Notes for improved workflow
  - Made all database-driven fields read-only in Claim Details, Provider Information, Payor Information, Financial Details, and Additional Information sections to prevent unintended data modification
  - Updated AR Tasks table view to display Risk Score (1-10) with color-coded badges: High risk (8-10, red), Medium risk (4-7, default), Low risk (1-3, secondary)
  - **Parent-Child Action Workflow:** Implemented hierarchical relationship between Action Category and Action/Status with auto-populated Follow Up Days:
    - Action Category (parent) offers 3 options: Status check, Payment - To be Posted, Resubmit
    - Action/Status (child) dynamically filters options based on selected Action Category (40+ statuses for Status check, 2 for Payment - To be Posted, 19 for Resubmit)
    - Follow Up Days auto-populates when both fields are selected (values: 0, 7, 15, or 28 days)
    - Changing Action Category clears dependent Action/Status and Follow Up Days fields
    - Data sourced from Excel file with 62 unique Category::Status::Days mappings

### Technical Implementations
- **Health Check Endpoints:** Added `/health` and `/api/health` for deployment monitoring, returning 200 OK with `{"status": "ok"}`.
- **Backend API Support:** 
  - Productivity data: `/api/productivity/summary`, `/api/productivity/historical`
  - Work group assignment: `PATCH /api/claims/:id`
  - Filtered task retrieval: `GET /api/tasks`
  - Team productivity management: 
    - `GET /api/team/members` - Fetch team members with assignments, targets, and metrics
    - `POST /api/team/assign` - Bulk assign region/payer to team members
    - `GET /api/team/targets` - Get daily targets for a date
    - `POST /api/team/targets` - Set daily targets for team members
    - `GET /api/team/metrics` - Get productivity metrics for a date
    - `POST /api/team/generate-tasks` - Bulk generate tasks to fulfill daily targets for all team members
- **Database Schema Updates:** 
  - Added `line_of_business`, `criteria`, and `team` columns to the Claims table for Work Group assignment
  - Created `team_assignments`, `daily_targets`, and `productivity_metrics` tables for team productivity management
  - Added `revenue_collected` decimal column to productivity_metrics table for financial tracking
- **Revenue Collected Tracking:**
  - Productivity metrics now track revenue collected alongside claims processed
  - Historical productivity data aggregates total revenue by date
  - Task generation automatically calculates and updates revenue from claim payment values
  - Revenue data sourced from claims.payment field (decimal precision supports up to $999,999,999,999.99)
  - Backfilled historical revenue for existing productivity metrics ($8.1M total across 1,643 claims)
- **Security & Authentication:** 
  - Multi-layer authorization (client-side guard + server-side validation)
  - Tenant isolation with row-level security
  - **Role Persistence Fix:** Auth pipeline now preserves elevated roles (Manager, System Administrator) when OIDC claims don't include role field:
    - `replitAuth.ts` checks for existing users with non-default roles and preserves them when role claim is missing
    - `storage.ts upsertUser()` only updates role field when explicitly provided (undefined = preserve existing)
    - New users default to RCM Specialist if no role specified
    - Prevents unintended role downgrade on login when OIDC provider doesn't send custom role claims

## External Dependencies

**Authentication & Authorization:**
- **Replit Auth:** OpenID Connect provider for SSO.

**Database Services:**
- **Neon PostgreSQL:** Serverless PostgreSQL database.

**Build & Development Tools:**
- **Vite:** Frontend build tool and dev server.

**UI Component Libraries:**
- **Radix UI:** Headless component primitives.
- **shadcn/ui:** Pre-built accessible components.
- **Lucide React:** Icon library.
- **react-day-picker:** Calendar/date picker component.
- **cmdk:** Command palette component.
- **vaul:** Drawer component.

**Data Visualization:**
- **Recharts:** Charting library.

**Utility Libraries:**
- **date-fns:** Date manipulation.
- **zod:** Runtime type validation.
- **class-variance-authority:** Type-safe component variants.
- **nanoid:** Unique ID generation.