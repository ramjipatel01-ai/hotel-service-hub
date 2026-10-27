# UI/UX Design System Specification
## HOTEL SERVICE HUB — Smart Hotel Guest Service Request Management Platform

---

### 1. Brand Identity & Visual Aesthetic

Hotel Service Hub bridges modern 5-star hospitality elegance with high-efficiency enterprise tooling. The design system exudes premium quality:
- **Tone**: Sophisticated, trustworthy, intuitive, fast, and tactile.
- **Visual Style**: Clean modern surface elevation, subtle glassmorphic headers, crisp typography, and refined micro-interactions.
- **Theme**: Slate/Navy core with Indigo primary accents, complemented by functional status colors (Emerald for completion, Amber for pending, Rose for urgent).

---

### 2. Color Palette & Design Tokens

```
PRIMARY (Brand & Accents)
├── Indigo 500  : #6366F1 (Buttons, primary highlights, active states)
├── Indigo 600  : #4F46E5 (Hover states, primary actions)
└── Indigo 50   : #EEF2FF (Light tints, subtle background highlights)

NEUTRALS (Surfaces & Typography)
├── Slate 900   : #0F172A (Primary text, deep sidebar backgrounds)
├── Slate 800   : #1E293B (Dark headers, elevated dark containers)
├── Slate 600   : #475569 (Secondary labels, muted text)
├── Slate 200   : #E2E8F0 (Borders, dividers, card outlines)
├── Slate 100   : #F1F5F9 (Muted card backgrounds, input backings)
└── Slate 50    : #F8FAFC (Global app background)

SEMANTIC STATUS SYSTEM
├── PENDING     : Amber   (Bg: #FEF3C7 | Text: #92400E | Border: #FDE68A)
├── ASSIGNED    : Sky     (Bg: #E0F2FE | Text: #0369A1 | Border: #BAE6FD)
├── ACCEPTED    : Blue    (Bg: #DBEAFE | Text: #1E40AF | Border: #BFDBFE)
├── IN_PROGRESS : Violet  (Bg: #EDE9FE | Text: #5B21B6 | Border: #DDD6FE)
├── COMPLETED   : Emerald (Bg: #D1FAE5 | Text: #065F46 | Border: #A7F3D0)
├── CONFIRMED   : Teal    (Bg: #CCFBF1 | Text: #115E59 | Border: #99F6E4)
└── CANCELLED   : Rose    (Bg: #FFE4E6 | Text: #9F1239 | Border: #FECDD3)

PRIORITY PALETTE
├── LOW         : Gray    (Bg: #F3F4F6 | Text: #4B5563)
├── NORMAL      : Blue    (Bg: #EFF6FF | Text: #1D4ED8)
├── HIGH        : Amber   (Bg: #FFFBEB | Text: #B45309)
└── URGENT      : Rose    (Bg: #FFF1F2 | Text: #BE123C | Pulse Animation)
```

---

### 3. Typography Hierarchy

- **Font Family**: Modern sans-serif stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Scale**:
  - `Display / Hero`: `28px - 32px` | Bold (`font-bold`) | Line height `1.2`
  - `Page Heading (H1)`: `24px` | Semi-bold (`font-semibold`) | Tracking `-0.02em`
  - `Section Heading (H2)`: `18px - 20px` | Semi-bold (`font-semibold`)
  - `Card Title (H3)`: `15px - 16px` | Medium (`font-medium`)
  - `Body / Standard`: `14px` | Regular (`font-normal`) | Line height `1.5`
  - `Caption / Meta`: `12px` | Regular (`font-normal`) | Color `text-slate-500`
  - `Badge / Tag`: `11px - 12px` | Medium/Semi-bold | Uppercase tracking `tracking-wider`

---

### 4. Component Design System

#### 4.1 Buttons
- **Primary Button**: `bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/20 active:scale-98`
- **Secondary / Outline Button**: `border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg transition-all`
- **Danger Button**: `bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg transition-all`
- **Action Pills / Status Updaters**: Responsive height, accessible 44px min tap targets on mobile.

#### 4.2 Status & Priority Badges
- Pill-shaped with subtle border and text contrast (`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider`).
- Urgent priority features a subtle pulse ring indicator (`animate-pulse`).

#### 4.3 Request Cards
- **Container**: `bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`
- **Header**: Request Number (`font-mono font-medium text-slate-600`), Category Badge, Priority Indicator.
- **Body**: Service Title, description excerpt, Room badge (`Room 402`), Assigned Staff Avatar + Name.
- **Footer**: Live Status badge, Time elapsed (`15m ago`), Action CTA ("Track", "Accept", "Update").

#### 4.4 Live Lifecycle Stepper (Timeline Tracker)
Visual step indicator representing the 5 key milestone phases:
`Created (Pending/Assigned)` $\to$ `Accepted` $\to$ `In Progress` $\to$ `Completed` $\to$ `Confirmed`.
- Completed steps: Filled Indigo/Emerald circle with checkmark.
- Active step: Glowing pulse border, clear current role instructions.
- Upcoming steps: Muted border with step number.
- Timeline audit trail beneath details timestamps and user notes.

#### 4.5 Metrics & KPI Cards
- Metric count in bold display font (`text-2xl font-bold text-slate-800`).
- Contextual trend indicator with icon (e.g. upward trend in green, pending volume in amber).
- Light icon background badge in top-right corner.

---

### 5. Role-Specific UX Layouts

#### 5.1 Guest Experience (Mobile-First)
- **Top Bar**: Hotel Brand, Room badge (`Room 304`), Guest Name, Notification Bell.
- **Active Requests Strip**: Horizontal swiper or elevated cards showing active in-flight requests with live status chips.
- **Quick Service Grid**: Category tiles with iconography (Housekeeping, Maintenance, Dining, Transport, Concierge).
- **Service Request Modal / Drawer**: Smooth bottom sheet on mobile, centered modal on desktop. Includes image upload preview, priority picker, and quantity selector.
- **Request Detail & Tracking Screen**: Real-time progress bar, assigned staff photo/name, timeline history, and one-click "Confirm Service Received" button followed by the star rating dialog.

#### 5.2 Staff Portal (Action-Oriented Dashboard)
- **Top Bar**: Department identifier, Duty switch (`On Duty` / `Off Duty`), pending notifications.
- **Workload Summary Banner**: "You have 3 active tasks in progress".
- **Department Queue Tabs**: "Assigned to Me", "Department Pool", "Completed Today".
- **Execution Drawer**: Single-click action buttons: `Accept Request` $\to$ `Start Work` $\to$ `Complete Request`. Work notes text area.

#### 5.3 Admin Control Room
- **Header & Navigation**: Sidebar navigation (Overview, All Requests, Departments, Services, Rooms, Staff).
- **Live Dispatch Table**: Multi-parameter search and filters (Department, Status, Priority, Room).
- **Assignment Drawer**: Allows one-click manual staff assignment or auto-allocation trigger.
- **Catalog Management**: Add/Edit services, set default priorities, toggle service availability.

#### 5.4 Manager Analytics Hub
- **KPI Summary Grid**: Total requests, Avg response time (mins), Avg completion time (mins), Customer satisfaction score (CSAT out of 5.0).
- **Chart Views (Recharts)**:
  - *Daily Volume Trend*: Area chart with smooth curves.
  - *Department Distribution*: Donut / Pie chart with custom tooltips.
  - *Staff Performance & Workload*: Horizontal bar chart ranking completed tasks and active loads.
  - *Resolution SLA*: Bar chart comparing response time vs completion time across departments.

---

### 6. Phase 6 Implemented Shared Component Registry

All reusable UI components are centrally defined in `client/src/components/common/index.js` and obey strict accessibility and contrast standards:

| Component | File Path | Props & Description |
| :--- | :--- | :--- |
| `Button` | `client/src/components/common/Button.jsx` | Variants: `primary`, `secondary`, `outline`, `danger`, `dangerOutline`, `success`, `ghost`. Sizes: `xs`, `sm`, `md`, `lg`. Spinner, accessible tap target, active-scale. |
| `Input` | `client/src/components/common/Input.jsx` | Accessible label, `forwardRef`, `aria-invalid`, icon adornments, rightElement slot, error and helper text. |
| `Select` | `client/src/components/common/Select.jsx` | ForwardRef, custom chevron, options array or JSX children, error and helper text. |
| `Textarea` | `client/src/components/common/Textarea.jsx` | ForwardRef, resize-y, label, error, helper text. |
| `FormField` | `client/src/components/common/FormField.jsx` | Wrapper associating label, input, and validation errors. |
| `Badge` | `client/src/components/common/Badge.jsx` | Generic badge supporting `indigo`, `slate`, `emerald`, `amber`, `rose`, `sky`, `violet`, `teal`, `gray` with optional dot. |
| `StatusBadge` | `client/src/components/common/StatusBadge.jsx` | Specialized badge for all 7 lifecycle states (`PENDING`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CONFIRMED`, `CANCELLED`) with distinctive icons and colors. |
| `PriorityBadge` | `client/src/components/common/PriorityBadge.jsx` | Pill badge for `LOW`, `NORMAL`, `HIGH`, `URGENT` (with `animate-pulse` on urgent). |
| `Card` | `client/src/components/common/Card.jsx` | Compound components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| `Modal` | `client/src/components/common/Modal.jsx` | Accessible dialog with backdrop blur, Escape key listener, scroll lock, and sizes (`sm`, `md`, `lg`, `xl`, `full`). |
| `ConfirmDialog` | `client/src/components/common/ConfirmDialog.jsx` | Danger or warning confirmation modal for destructive/irreversible actions. |
| `LoadingSpinner` | `client/src/components/common/LoadingSpinner.jsx` | Sizes `xs` to `xl`, configurable colors and accessible screen-reader text. |
| `SkeletonLoader` | `client/src/components/common/SkeletonLoader.jsx` | Supports `card`, `table`, `row`, and `metric` skeleton loading types. |
| `EmptyState` | `client/src/components/common/EmptyState.jsx` | Centered dashed card with icon, title, description, and primary CTA slot. |
| `ErrorState` | `client/src/components/common/ErrorState.jsx` | Error alert card with title, message, and safe retry trigger. |
| `PageHeader` | `client/src/components/common/PageHeader.jsx` | Responsive title bar with icon, badge, description, and actions slot. |
| `SearchInput` | `client/src/components/common/SearchInput.jsx` | Search field with magnifying glass icon and instant clear (X) action. |
| `FilterBar` | `client/src/components/common/FilterBar.jsx` | Flex container for filter dropdowns, search fields, active filter count, and reset button. |
| `Pagination` | `client/src/components/common/Pagination.jsx` | Previous/Next pagination with item range indicator. |
| `ResponsiveTable`| `client/src/components/common/ResponsiveTable.jsx`| Accessible table with column definitions, custom renderers, zebra striping, loading skeleton, and empty fallback. |
| `Toast` | `client/src/components/common/Toast.jsx` | Alerts for `success`, `error`, `warning`, `info` with dismiss and action buttons. |
| `Avatar` | `client/src/components/common/Avatar.jsx` | User initials or photo with online/on-duty indicator dot. |
| `ConnectionStatus`| `client/src/components/common/ConnectionStatus.jsx`| Unobtrusive live WebSocket status indicator (`Live Sync` vs `REST Mode`). |
| `NotificationDropdown`| `client/src/components/common/NotificationDropdown.jsx`| In-app notification bell with live counter, mark all as read, and keyboard support. |
| `AppLayout` | `client/src/layouts/AppLayout.jsx` | Shared shell with sticky header, desktop/mobile navigation, user profile, and footer. |

---

### 7. Responsive Breakpoint Matrix

| Viewport | Device Range | Layout Strategy |
| :--- | :--- | :--- |
| `375px` | Compact Mobile (iPhone SE) | Stacked 1-col cards, hamburger drawer for portal navigation, compact header with icon-only actions, min 44px tap targets. |
| `430px` | Standard Mobile (iPhone Pro Max) | Single column, full-width modal sheets with `max-w-[calc(100vw-2rem)]`, horizontal scroll for table columns. |
| `768px` | Tablet (iPad Mini / Air) | 2-column card grids, horizontal filter bar, expanded table view with readable text. |
| `1024px` | Laptop / Small Desktop | 3-column service grid, full desktop navigation tabs in `AppLayout` header. |
| `1440px` | Large Desktop / Workstation | Max-width 7xl container (`max-w-7xl mx-auto`), 4-column metric dashboards, spacious 5-col department distributions. |
