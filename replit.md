# ClaimFlowPro - Healthcare AR Management System

## Overview

ClaimFlowPro is a multi-tenant healthcare accounts receivable (AR) management system designed for medical claims processing. The application enables healthcare organizations to manage claims workflows, track denials, monitor productivity metrics, and automate task prioritization. Built for enterprise use, it supports role-based access control with 5 distinct roles (RCM Specialist, Manager, System Administrator, Client User, Auditor) and provides comprehensive financial intelligence for medical billing operations.

## Recent Changes

### Team Management Feature (October 2025)
- **User Management UI**: Added comprehensive Team Management page at `/team-management` for System Administrators
  - Displays all users in current tenant with avatar, name, email, role, date added, and last active timestamp
  - Users grouped into "Admin users" (System Administrators, Managers) and "Team members" (other roles)
  - Role editing via dropdown dialog supporting all 5 roles
  - Real-time UI updates after role changes
  - Client-side access guard shows "Access Denied" for non-administrators

- **Backend API Endpoints**:
  - `GET /api/users`: Lists all tenant users (System Administrator only)
  - `PATCH /api/users/:id/role`: Updates user role with tenant isolation validation
  - Role-based access control enforced at API level (403 for unauthorized access)
  - Tenant scoping prevents cross-tenant role manipulation

- **Security Enhancements**:
  - Multi-layer authorization: Client-side guard + server-side role validation
  - Tenant isolation: Admins can only view/modify users within their own tenant
  - Role persistence: Manual role changes now persist across login sessions

- **Navigation**: Added "User Management" menu item in sidebar (UserCog icon) visible only to System Administrators

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack React Query v5 for server state
- **UI Framework:** shadcn/ui components built on Radix UI primitives
- **Styling:** Tailwind CSS with custom design system based on Microsoft Fluent Design principles

**Design System:**
The application follows Microsoft Fluent Design guidelines optimized for data-heavy enterprise healthcare applications. Key design principles include:
- Information density and scannability for claims data
- Professional healthcare aesthetic with subtle elevation system
- Dual theme support (light/dark mode) with healthcare-appropriate color palette
- Role-based visual hierarchy for different user personas

**Component Architecture:**
- Reusable UI components in `client/src/components/ui/` (buttons, cards, tables, forms)
- Domain-specific components for claims management (ClaimsTable, MetricCard, StatusBadge, SlaIndicator)
- Layout components (AppSidebar, ThemeProvider) for application shell
- Component examples for development reference

**State Management Approach:**
- Server state managed via React Query with custom query client
- Authentication state through `useAuth` hook
- Theme state via Context API (ThemeProvider)
- Form state using react-hook-form with zod validation

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **ORM:** Drizzle ORM with Neon serverless PostgreSQL
- **Session Management:** express-session with PostgreSQL storage (connect-pg-simple)
- **Authentication:** OpenID Connect via Replit Auth with Passport.js

**API Design:**
- RESTful API endpoints under `/api` prefix
- Authentication-protected routes using `isAuthenticated` middleware
- Tenant isolation enforced at data access layer through context extraction
- Response logging middleware for development monitoring

**Data Access Pattern:**
- Storage abstraction layer (`server/storage.ts`) implementing `IStorage` interface
- Centralized database operations with tenant-scoped queries
- Bulk operations support for claims and tasks (batched at 1000 rows per batch)
- CSV file upload for bulk claim ingestion (supports 60,000+ records)
  - Transactional safety: Claims, tasks, and activity logs created atomically
  - Tenant consistency validation enforced before import
  - Automatic rollback on any failure prevents orphaned data
- Bulk task assignment for high-volume operations (50,000+ daily tasks)
  - Checkbox-based selection with Set data structure for O(1) lookups
  - Bulk action toolbar with assignment dialog
  - Single database query for mass updates with minimal payload (ID-only returning)
  - Tenant-scoped filtering prevents cross-tenant assignment
  - Activity log tracking for audit trail
- Computed metrics aggregation (productivity, financial)

**Background Processing:**
- Task generator (`server/taskGenerator.ts`) for automated priority scoring
- Priority calculation based on claim age, balance, denial codes, and payor type
- SLA status computation for workflow tracking

### Database Architecture

**Database Technology:** PostgreSQL (Neon serverless)

**Multi-Tenancy:**
- Tenant-scoped data model with `tenantId` foreign keys on all entities
- Tenant settings stored as JSONB for flexible configuration
- Row-level tenant isolation enforced in all queries

**Core Schema:**

1. **Tenants Table:** Organization-level configuration
   - Settings stored as JSONB for extensibility
   
2. **Users Table:** User authentication and profile
   - Support for both Replit Auth (via `replitId`) and username/password
   - Role-based access control with 5 defined roles:
     - **RCM Specialist** (`rcm_specialist`): Works assigned claim tasks, logs time, updates status/resolution, escalates issues
     - **Manager** (`manager`): Oversees workload, handles escalations, reviews dashboards and targets
     - **System Administrator** (`system_administrator`): Manages tenants, users, roles, branding, and access policies
     - **Client User** (`client_user`): View-only access to their own tenant's dashboards and reports
     - **Auditor** (`auditor`): Read-only access to immutable task histories and system logs
   - Tenant association for data isolation
   - Default role: `rcm_specialist` for new users

3. **Claims Table:** Medical claim records
   - Patient demographics (name, DOB, customer ID)
   - Payor information (name, code, type)
   - Financial data (balance, list price, allowed amount)
   - Temporal tracking (invoice date, age, service date)
   - Clinical codes (HCPC, modifiers)
   - Workflow state (status, SLA status, denial codes)
   - Assignment and priority fields
   - Indexed on tenant, status, and assignment for query performance

4. **Tasks Table:** Workflow task management
   - Claim association via foreign key
   - User assignment with priority and due date
   - Task type categorization
   - Status tracking with completion timestamp

5. **Activity Logs Table:** Audit trail
   - Action tracking for claims and tasks
   - User attribution
   - JSONB details for flexible event data
   - Indexed by claim and tenant for history retrieval

6. **Sessions Table:** Authentication sessions
   - PostgreSQL-backed session storage
   - TTL-based expiration indexing

**Data Validation:**
- Zod schemas generated from Drizzle definitions (drizzle-zod)
- Insert schemas for API request validation
- Type-safe data models shared between client and server

### External Dependencies

**Authentication & Authorization:**
- **Replit Auth:** OpenID Connect provider for SSO
  - Configuration via environment variables (`ISSUER_URL`, `REPL_ID`)
  - Session management with 7-day cookie TTL
  - Token refresh mechanism implemented in Passport strategy

**Database Services:**
- **Neon PostgreSQL:** Serverless PostgreSQL database
  - WebSocket-based connection pooling
  - Connection string configured via `DATABASE_URL` environment variable
  - Drizzle ORM for schema management and migrations

**Build & Development Tools:**
- **Vite:** Frontend build tool and dev server
  - HMR (Hot Module Replacement) for development
  - Custom plugins for Replit integration (cartographer, dev banner, runtime error overlay)
  - Middleware mode for Express integration in development

**UI Component Libraries:**
- **Radix UI:** Headless component primitives (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui:** Pre-built accessible components with Tailwind styling
- **Lucide React:** Icon library
- **react-day-picker:** Calendar/date picker component
- **cmdk:** Command palette component
- **vaul:** Drawer component (mobile-optimized)

**Data Visualization:**
- **Recharts:** Charting library for analytics dashboards

**Utility Libraries:**
- **date-fns:** Date manipulation and formatting
- **zod:** Runtime type validation
- **class-variance-authority:** Type-safe component variants
- **nanoid:** Unique ID generation

**Development Dependencies:**
- **TypeScript:** Type safety across stack
- **esbuild:** Server-side bundling for production
- **tsx:** TypeScript execution for development