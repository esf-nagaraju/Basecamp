# Basecamp - Healthcare AR Management System

## Overview
Basecamp is an enterprise-grade, multi-tenant healthcare accounts receivable (AR) management system. Its core purpose is to streamline medical claims processing, enabling healthcare organizations to efficiently manage claims workflows, track denials, monitor productivity, and automate task prioritization. The system provides financial intelligence and supports various user roles (RCM Specialist, Manager, System Administrator, Client User, Auditor) to enhance financial performance for healthcare providers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend adheres to Microsoft Fluent Design principles, emphasizing information density, a professional aesthetic, and role-based visual hierarchy. It supports dual themes (light/dark mode). Key features include:
-   **Productivity Analytics:** Comprehensive historical tracking with date range filtering, trend visualization, and team performance tables.
-   **Team Productivity Management:** Dedicated page for managers to oversee team metrics, manage region/payer assignments, set daily targets, monitor real-time productivity, and generate tasks to meet targets.
-   **Navigation:** Streamlined sidebar navigation with role-based menu items.
-   **Analytics & Reporting Dashboard:** Business intelligence featuring KPI cards (Total Revenue, Total Denials, Active Team Members, AR 90+ Days), revenue trends, top denial codes, AR aging distribution, and team performance scorecards.
-   **Work Group Assignment & Filtering:** 3-dimensional filtering (Line of Business, Criteria, Team) for task management.
-   **Team Management:** Page for System Administrators and Managers to view and manage users, edit roles, and add new users with role-based restrictions:
    -   **Add User Feature:** System Administrators can create users with any role; Managers restricted to non-elevated roles (RCM Specialist, Client User, Auditor) to prevent privilege escalation
    -   Form validation using react-hook-form with zodResolver matching backend Zod schema
    -   Backend POST /api/users endpoint with security enforcement and employee ID support for team assignments
    -   Race condition guards prevent elevated roles from being exposed during auth loading
-   **AR Tasks Modal Redesign:** Simplified task management with a "Risk Score" (1-10) replacing "Priority," and a parent-child action workflow for resolution categories with auto-populated follow-up days.
-   **Settings Page:** User preference management for personal info, display settings (theme, timezone, date format, density), and notification toggles.

### Technical Implementations
-   **Frontend:** Built with React 18 (TypeScript), Wouter for routing, TanStack React Query for server state, shadcn/ui for components, and Tailwind CSS for styling.
-   **Backend:** Node.js (TypeScript) with Express.js, Drizzle ORM, and Neon serverless PostgreSQL. Authentication uses OpenID Connect via Replit Auth with Passport.js.
-   **API Design:** RESTful API with authentication, tenant isolation, and response logging. Includes endpoints for productivity, team management, analytics, and user settings.
-   **Data Access:** Storage abstraction layer, tenant-scoped queries, bulk operations (claims, tasks, assignments), and computed metrics aggregation.
-   **Background Processing:** Task generator for automated priority scoring and SLA computation.
-   **Database:** PostgreSQL (Neon serverless) with a multi-tenancy model using `tenantId` and row-level isolation. Core tables include Tenants, Users, Claims, Tasks, Activity Logs, Sessions, Team Assignments, Daily Targets, and Productivity Metrics (including `revenue_collected` with high precision). Zod schemas are used for data validation.
-   **Security:** Multi-layer authorization, row-level security, and a fix for role persistence during OIDC authentication to prevent unintended role downgrades.

## External Dependencies

**Authentication & Authorization:**
-   **Replit Auth:** OpenID Connect provider for SSO.

**Database Services:**
-   **Neon PostgreSQL:** Serverless PostgreSQL database.

**Build & Development Tools:**
-   **Vite:** Frontend build tool and dev server.

**UI Component Libraries:**
-   **Radix UI:** Headless component primitives.
-   **shadcn/ui:** Pre-built accessible components.
-   **Lucide React:** Icon library.
-   **Recharts:** Charting library.

**Utility Libraries:**
-   **zod:** Runtime type validation.
-   **date-fns:** Date manipulation.