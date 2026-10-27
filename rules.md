# Engineering Rules & Development Constraints
## HOTEL SERVICE HUB — Smart Hotel Guest Service Request Management Platform

---

### 1. Fundamental Engineering Principles

1. **Separation of Concerns**:
   - Backend controllers handle HTTP request parsing, response formatting, and validation.
   - Core domain logic (smart allocation, audit trail logging, real-time dispatch) lives in dedicated service files (`services/`).
   - Mongoose models only define schemas, indexes, and schema-level validation.
   - Frontend components are modular: separate presentation (`components/`) from pages (`pages/`) and API communication (`services/`).

2. **No Fake Functionality or Dead Buttons**:
   - Every button, dropdown, form submit, and interactive element must connect to an actual functional backend endpoint or client handler.
   - No placeholder `onClick={() => alert("coming soon")}` or inert UI stubs pretending to be functional.
   - All state transitions must reflect in the database and audit trail.

3. **Single Source of Truth**:
   - Status, priority, and role strings must be defined as shared constants (`server/config/constants.js` and `client/src/utils/constants.js`) to avoid typos.
   - Database is the sole authority for request state; client UI must synchronize via REST and WebSockets.

---

### 2. Backend Coding Standards & Patterns

#### 2.1 Error Handling & Response Consistency
- All Express controller functions must be wrapped with an async error handler (or `try/catch` passing errors to `next(err)`).
- Never send raw database errors or stack traces to the client in production.
- Standardized API Response structure:
  ```json
  // Success Response (HTTP 200/201)
  {
    "success": true,
    "message": "Human-readable confirmation",
    "data": { ... }
  }

  // Error Response (HTTP 400/401/403/404/500)
  {
    "success": false,
    "message": "Description of the error",
    "errors": [ ...optional field validation errors ]
  }
  ```

#### 2.2 Controller & Service Division
- **Controllers** (`server/controllers/`): Validate input using schemas, call domain services, respond with status codes.
- **Services** (`server/services/`):
  - `allocationService.js`: Implements least-loaded staff assignment.
  - `auditService.js`: Creates immutable `RequestHistory` records whenever request attributes or status mutate.
  - `socketService.js`: Emits Socket.IO events to targeted user/department/admin rooms.

#### 2.3 Status Transition Rules
- Status transitions must follow the valid lifecycle graph:
  - `PENDING` $\to$ `ASSIGNED` or `CANCELLED`
  - `ASSIGNED` $\to$ `ACCEPTED` or `CANCELLED` or reassigned to `ASSIGNED`
  - `ACCEPTED` $\to$ `IN_PROGRESS`
  - `IN_PROGRESS` $\to$ `COMPLETED`
  - `COMPLETED` $\to$ `CONFIRMED`
- Status cannot be changed arbitrarily. Any unauthorized or invalid transition returns HTTP 400 with a specific error message.

#### 2.4 Audit Logging Requirement
- Every state change, assignment, reassignment, or staff work note **MUST** trigger an entry in `requesthistories`.
- An audit entry must record: `requestId`, `performedBy`, `previousStatus`, `newStatus`, `action`, `notes`, and `timestamp`.
- Audit records are strictly append-only; updates and deletions on `requesthistories` are forbidden.

---

### 3. Frontend Architecture & React Rules

#### 3.1 Component Modularity
- Split large UI views into focused, single-purpose components.
- Components should not exceed ~250 lines. Large forms or detail drawers must be broken into sub-components (e.g., `RequestDetailsDrawer`, `TimelineStep`, `FeedbackModal`).
- Use React hooks for state logic; avoid deeply prop-drilled state.

#### 3.2 Styling with Tailwind CSS
- Do not write arbitrary raw CSS when Tailwind utility classes suffice.
- Use clean, semantic Tailwind classes. Avoid excessively deep inline styles.
- Adhere to the established color palette (Indigo/Slate base, Emerald for completed, Amber for pending, Rose for urgent).
- Ensure all interactive elements have visible `:hover`, `:focus-visible`, and `:disabled` states.

#### 3.3 State Management & Real-Time Sync
- Use `AuthContext` for user session and authentication token.
- Use `SocketContext` for WebSocket lifecycle management.
- When a Socket.IO event arrives (e.g., `request:status_changed`):
  - If the active view is inspecting that request, update the request state in-memory or refetch to display live updates without requiring a page reload.
  - Show a non-intrusive toast notification.

---

### 4. Security & Environment Constraints

1. **Zero Secret Leakage**:
   - Never commit `.env` files with actual passwords, tokens, or live credentials.
   - Frontend code (`client/`) must never contain DB connection strings, JWT secrets, or administrative bypass keys.
   - The MongoDB URI must strictly be loaded from `process.env.MONGODB_URI` in the backend.
   - In documentation and `.env.example`, use the placeholder:
     `MONGODB_URI=mongodb+srv://kuntipatel19_db_user:YOUR_DB_PASSWORD@project1.zopmlnq.mongodb.net/hotel_service_platform?retryWrites=true&w=majority&appName=project1`

2. **Authentication & Authorization**:
   - Passwords must be hashed using `bcrypt` (salt rounds $\ge 10$) before saving.
   - JWT tokens must have an expiration (e.g., 24 hours).
   - Backend routes must verify JWT (`authMiddleware`) and enforce role permissions (`roleMiddleware`).

3. **Safe File Uploads**:
   - Files uploaded via Multer must only allow images (`image/jpeg`, `image/png`, `image/webp`).
   - File size must be capped at 5MB.
   - Stored file paths must be sanitized against directory traversal.

4. **Input Sanitization**:
   - Validate and sanitize all string inputs to guard against NoSQL injection and XSS.

---

### 5. Mobile & Responsive Layout Rules

- The **Guest Interface** must be built mobile-first. Guests primarily access hotel portals from their mobile devices.
  - Tap targets must be at least $44 \times 44\text{px}$.
  - Avoid horizontal scrolling on mobile viewports ($< 400\text{px}$).
- The **Staff Dashboard** must provide an intuitive mobile/tablet workflow for staff on the move.
- The **Admin and Manager Dashboards** must support responsive data tables and charts that adapt gracefully to tablets and desktops.
