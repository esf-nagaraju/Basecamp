# Basecamp Design Guidelines

## Design Approach

**Selected Approach**: Design System - Microsoft Fluent Design  
**Justification**: Basecamp is a data-heavy, enterprise healthcare productivity tool requiring optimal information density, clear hierarchy, and professional aesthetics. Fluent Design excels at complex data interfaces while maintaining clarity and accessibility.

**Key Design Principles**:
1. **Information Clarity First**: Dense data must be scannable and actionable
2. **Role-Based Visual Hierarchy**: Different personas need distinct interface patterns
3. **Professional Healthcare Aesthetic**: Trust, precision, and reliability
4. **Productivity-Optimized**: Minimize clicks, maximize screen real estate
5. **Consistent Depth System**: Use subtle elevation to organize complex interfaces

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Primary: 210 100% 50% (Professional blue for actions, CTAs)
- Background: 0 0% 98% (Neutral canvas)
- Surface: 0 0% 100% (Cards, panels)
- Border: 220 13% 91% (Subtle dividers)
- Text Primary: 220 9% 20%
- Text Secondary: 220 9% 46%
- Success: 142 71% 45% (Paid claims, positive metrics)
- Warning: 38 92% 50% (SLA warnings, aging claims)
- Error: 0 84% 60% (Denials, critical issues)
- Info: 199 89% 48% (Pending states, informational)

**Dark Mode**:
- Primary: 210 100% 60% (Slightly lighter for contrast)
- Background: 220 13% 10% (Rich dark base)
- Surface: 220 13% 14% (Elevated panels)
- Border: 220 13% 20% (Visible dividers)
- Text Primary: 0 0% 95%
- Text Secondary: 220 9% 70%
- Success: 142 71% 55%
- Warning: 38 92% 60%
- Error: 0 84% 70%
- Info: 199 89% 58%

### B. Typography

**Font Stack**: 
- Primary: 'Segoe UI', system-ui, -apple-system, sans-serif
- Monospace: 'Cascadia Code', 'Consolas', monospace (for claim IDs, amounts)

**Type Scale**:
- Hero/Dashboard Headers: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Headers: text-lg font-medium (18px)
- Body/Table Content: text-sm (14px)
- Secondary/Meta: text-xs (12px)
- Data Tables: text-sm font-medium for headers, text-sm for cells

**Usage**:
- Claims data uses monospace for financial amounts and IDs
- Dashboard metrics use bold weights (font-semibold/font-bold)
- Status labels use font-medium for emphasis

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card spacing: p-6 for content-rich, p-4 for compact
- Dashboard gaps: gap-4 for metrics, gap-6 for sections
- Table cell padding: px-4 py-3

**Grid System**:
- Dashboard: 12-column grid with gap-4 to gap-6
- Metrics cards: grid-cols-2 lg:grid-cols-4 for KPIs
- Claims table: Full-width with sticky headers
- Sidebar: 280px fixed width for navigation

### D. Component Library

**Navigation**:
- Top navbar: Fixed header with logo, tenant selector, user menu (h-16)
- Side navigation: Persistent sidebar with role-based menu items, active state with accent border-l-4
- Breadcrumbs: For deep navigation in claims details

**Data Tables**:
- Sticky headers with sort indicators
- Row hover states with subtle background change
- Alternating row backgrounds for scannability (zebra striping)
- Inline actions (view, edit, reassign) on row hover
- Multi-select with checkboxes for bulk operations
- Pagination with page size selector (25/50/100/250)

**Dashboard Cards**:
- Elevated cards with shadow-sm in light mode, border in dark mode
- Metric cards: Large number (text-3xl), label below (text-sm), trend indicator with icon
- Chart cards: Header with title and period selector, chart area, footer with legend
- Status cards: Color-coded left border (border-l-4) indicating priority/status

**Forms & Inputs**:
- Input fields: border-2 with focus ring-2 ring-primary/50
- Select dropdowns: Native styled with custom arrow
- Date pickers: Inline calendar for date ranges
- Search: Prominent with leading icon, clear button when active
- Multi-select: Tag-based with remove chips

**Status Indicators**:
- Pills/badges with appropriate semantic colors (rounded-full px-3 py-1 text-xs font-medium)
- SLA traffic lights: Circular indicators (Green/Yellow/Red) with pulsing animation for critical
- Progress bars: Linear progress for task completion, circular for queue capacity

**Modals & Overlays**:
- Slide-over panels for claim details (w-96 to w-1/2 from right)
- Modal dialogs for confirmations (max-w-lg centered)
- Toast notifications: Top-right corner with auto-dismiss

**Charts & Visualizations**:
- Use Chart.js or Recharts for consistency
- Bar charts for aging buckets and denial trends
- Line charts for productivity over time
- Donut charts for payer distribution
- Color-coded to match status/priority palette

### E. Animations

**Minimal & Purposeful**:
- Page transitions: None (instant load for productivity)
- Hover states: Subtle background color change (duration-150)
- Loading states: Skeleton screens for tables, spinner for actions
- Toast entrance: Slide-in from right (duration-200)
- Avoid all decorative animations

---

## Role-Specific Interface Patterns

**AR Specialist Dashboard**:
- Primary focus: Worklist table occupying 70% of viewport
- Left sidebar: Filters and saved queries (w-64)
- Top metrics bar: Claims assigned, completed today, average handle time (h-20)
- Claim detail slide-over: Opens from right on row click

**Team Lead Interface**:
- Split view: Allocation rules editor (left 40%), team workload viz (right 60%)
- Drag-and-drop reassignment interface
- Team member cards with capacity indicators and utilization bars

**AR Manager Dashboard**:
- Grid of analytical cards (4 columns on desktop, responsive)
- Prominent filters: Date range, client selector, team selector at top
- Exportable data tables with CSV/XLSX download buttons
- Trend charts with time-period toggles (Day/Week/Month/Quarter)

**System Admin**:
- Tab-based navigation: Tenants, Users, Roles, Settings
- CRUD forms with inline validation
- Audit log table with advanced filtering

---

## Data Density & Scannability

**Table Design**:
- Compact rows (h-12) with adequate touch targets
- Fixed-width columns for amounts (text-right for financial data)
- Truncated text with tooltips for long payer names
- Color-coded cells for aging (background tints): 0-30 days (no tint), 31-60 (yellow-50), 61-90 (orange-50), 90+ (red-50)

**Visual Anchors**:
- Use left-aligned patient/claim IDs as primary anchor
- Right-aligned financial amounts for easy scanning
- Status pills at consistent position in each row

**Whitespace Management**:
- Tighter spacing in data tables (gap-1, gap-2)
- Generous padding in dashboard cards (p-6)
- Consistent margins between sections (my-8)

---

## Accessibility & Usability

- WCAG AA compliant contrast ratios for all text
- Keyboard navigation with visible focus indicators (ring-2 ring-offset-2)
- Screen reader labels for icon-only actions
- Error states with both color and icon indicators
- Tooltips for abbreviations and truncated content
- Support for browser zoom up to 200% without breaking layout
- Dark mode toggle in user settings with system preference detection

---

## Images

**No hero images** - This is an enterprise productivity application. All visual weight should support data and workflows, not marketing imagery.

**Supportive Graphics**:
- Empty state illustrations: Simple line art for empty worklists, no data states (max-w-sm centered)
- User avatars: Initials-based with subtle background colors in navigation and activity logs
- Icon system: Use Heroicons for consistent UI icons throughout (size-5 for inline, size-6 for standalone)