# Technical Architecture Document

## HOTEL SERVICE HUB — Smart Hotel Guest Service Request Management Platform

---

### 1. Architectural Overview & System Topography

Hotel Service Hub utilizes a modern, decoupled client-server architecture engineered for high responsiveness, strong transactional integrity, and scalable real-time state synchronization.

```text
                              ┌────────────────────────────────────────┐
                              │            CLIENT TIER                 │
                              │  React 18 + Vite + Tailwind CSS        │
                              │  React Router v6 + Axios + Recharts    │
                              │  Socket.IO Client                      │
                              └──────────────────┬─────────────────────┘
                                                 │
                                 HTTPS (REST APIs) │  WSS (Socket.IO)
                                                 │
                              ┌──────────────────▼─────────────────────┐
                              │            SERVER TIER                 │
                              │  Node.js (LTS) + Express.js            │
                              │  - REST Controllers & Middleware        │
                              │  - Socket.IO Server & Event Bus        │
                              │  - Smart Allocation Engine             │
                              │  - Audit Trail & State Machine         │
                              └──────────────────┬─────────────────────┘
                                                 │
                                           Mongoose ODM
                                                 │
                              ┌──────────────────▼─────────────────────┐
                              │           DATABASE TIER                │
                              │  MongoDB Atlas (Replica Set)           │
                              │  Collections: Users, Requests, Rooms,   │
                              │  Depts, Services, History, Feedback    │
                              └────────────────────────────────────────┘
```

---

### 2. Technology Stack & Key Libraries

| Component | Technology | Rationale / Specification |
| :--- | :--- | :--- |
| **Frontend Runtime** | React 18 | Declarative UI, concurrent rendering, hook-driven state architecture. |
| **Build Tool** | Vite | Lightning-fast HMR, optimized ESM bundle pipeline. |
| **Styling** | Tailwind CSS (v3) | Utility-first, strict design tokens, responsive grid/flexbox primitives. |
| **Icons & UI Accents** | Lucide React | High-performance SVG icon set with consistent visual weights. |
| **Client Routing** | React Router v6 | Declarative nested routing, role-protected route guards. |
| **HTTP Client** | Axios | Configurable interceptors for JWT injection, token expiration handling. |
| **Visualizations** | Recharts | Composable SVG-based chart components for analytics and throughput metrics. |
| **Backend Runtime** | Node.js (v18+ LTS) | Non-blocking asynchronous I/O, event-driven concurrency. |
| **Web Framework** | Express.js | Robust routing, lightweight middleware ecosystem. |
| **Real-time Protocol** | Socket.IO (v4) | WebSocket-first bidirectional messaging with long-polling fallback. |
| **Database** | MongoDB Atlas | Schema-flexible document database with horizontal scalability. |
| **Data Modeling** | Mongoose (v8) | Schema validation, business hooks (`pre/post`), relationship population. |
| **Authentication** | JSON Web Tokens (JWT) | Stateless cryptographic session assertion. |
| **Password Security** | bcryptjs | Adaptive salted password hashing. |
| **File Handling** | Multer | Multipart/form-data processor with mime-type filters and storage boundaries. |

---

### 3. Repository & Directory Structure

A clean, modular monolithic directory structure separating client and server:

```text
hotel-service-hub/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/              # Images, static media
│   │   ├── components/          # Reusable UI component library
│   │   │   ├── common/          # Button, Modal, Badge, Input, Card, Spinner
│   │   │   └── forms/           # Specific form views
│   │   ├── context/             # AuthContext, SocketContext, NotificationContext
│   │   ├── hooks/               # Custom hooks (useAuth, useSocket, useRequestRealtime)
│   │   ├── layouts/             # AppLayout, Navbar, Sidebar
│   │   ├── pages/               # GuestShell, StaffShell, AdminShell, ManagerShell
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── guest/           # Guest portal pages
│   │   │   ├── staff/           # Staff portal pages
│   │   │   ├── admin/           # Admin operations pages
│   │   │   └── manager/         # Manager analytics pages
│   │   ├── routes/              # ProtectedRoute, RoleRoute
│   │   ├── services/            # api.js, requestService.js, catalogService.js
│   │   ├── utils/               # constants.js, formatters.js
│   │   ├── App.jsx              # Main routing tree
│   │   ├── main.jsx             # React DOM root & GoogleOAuthProvider
│   │   └── index.css            # Tailwind directives & CSS variables
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/              # database.js, constants.js
│   │   ├── controllers/         # auth, request, service, dept, user, analytics
│   │   ├── middleware/          # auth, role, upload, errorHandler, rateLimiter
│   │   ├── models/              # User, Department, Service, Room, Request, etc.
│   │   ├── routes/              # auth, request, service, dept, user, analytics
│   │   ├── services/            # assignment, audit, realtime, notification
│   │   ├── sockets/             # index.js, socketAuth.middleware.js
│   │   ├── utils/               # token, formatters, logger
│   │   ├── validators/          # request, auth, user payload validators
│   │   ├── app.js               # Express application setup
│   │   └── server.js            # HTTP + Socket.IO server startup
│   ├── scripts/
│   │   └── seed.js              # Database seed script
│   ├── uploads/                 # Multer media directory
│   ├── package.json
│   ├── .env.example
│   └── .env
├── prd.md
├── architecture.md
├── design.md
├── memory.md
├── rules.md
└── task.md
```

---

### 4. Database Schema Specifications & Data Models

#### 4.1 Collection: `users`

Represents all system actors (Guests, Staff, Admins, Managers).

```javascript
{
  _id: ObjectId,
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true }, // bcrypt hashed
  googleId: { type: String, sparse: true, unique: true }, // Google OAuth identifier
  authProvider: { type: String, enum: ['local', 'google'], default: 'local', index: true },
  role: {
    type: String,
    enum: ['GUEST', 'STAFF', 'ADMIN', 'MANAGER'],
    default: 'GUEST',
    index: true
  },
  phone: { type: String, trim: true },
  departmentId: {
    type: ObjectId,
    ref: 'Department',
    default: null, // Populated for STAFF
    index: true
  },
  assignedRoomId: {
    type: ObjectId,
    ref: 'Room',
    default: null // Populated for active GUEST
  },
  isOnDuty: { type: Boolean, default: true }, // For STAFF scheduling
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.2 Collection: `departments`

Represents operational units (Housekeeping, Maintenance, Room Service, etc.).

```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true }, // e.g. "HK", "MAINT"
  description: { type: String },
  icon: { type: String, default: 'Building' }, // Lucide icon key
  isActive: { type: Boolean, default: true },
  headOfDepartment: { type: ObjectId, ref: 'User', default: null },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.3 Collection: `services`

Represents specific service requests offered to guests.

```javascript
{
  _id: ObjectId,
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['HOUSEKEEPING', 'MAINTENANCE', 'ROOM_SERVICE', 'TRANSPORTATION', 'FRONT_DESK'],
    required: true,
    index: true
  },
  departmentId: {
    type: ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  defaultPriority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  estimatedDurationMinutes: { type: Number, default: 30 },
  allowQuantity: { type: Boolean, default: false },
  maxQuantity: { type: Number, default: 5 },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.4 Collection: `rooms`

Registry of guest rooms.

```javascript
{
  _id: ObjectId,
  roomNumber: { type: String, required: true, unique: true, index: true },
  floor: { type: Number, required: true },
  type: {
    type: String,
    enum: ['STANDARD', 'DELUXE', 'EXECUTIVE_SUITE', 'PRESIDENTIAL_SUITE'],
    default: 'STANDARD'
  },
  currentGuestId: { type: ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['OCCUPIED', 'VACANT', 'MAINTENANCE'],
    default: 'VACANT',
    index: true
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.5 Collection: `requests`

The core business entity tracking service orders.

```javascript
{
  _id: ObjectId,
  requestNumber: { type: String, required: true, unique: true, index: true }, // e.g. "REQ-20261008-0012"
  guestId: { type: ObjectId, ref: 'User', required: true, index: true },
  roomId: { type: ObjectId, ref: 'Room', required: true, index: true },
  departmentId: { type: ObjectId, ref: 'Department', required: true, index: true },
  serviceId: { type: ObjectId, ref: 'Service', required: true },
  serviceTitle: { type: String, required: true }, // Denormalized for display resilience
  category: { type: String, required: true },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  assignedStaffId: { type: ObjectId, ref: 'User', default: null, index: true },
  quantity: { type: Number, default: 1 },
  description: { type: String, trim: true },
  specialInstructions: { type: String, trim: true },
  preferredTime: { type: Date, default: null },
  imageUrl: { type: String, default: null }, // Attachment path

  // Timestamps for SLA & Analytics
  createdAt: { type: Date, default: Date.now, index: true },
  assignedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
}
```

#### 4.6 Collection: `requesthistories`

Immutable audit trail entries.

```javascript
{
  _id: ObjectId,
  requestId: { type: ObjectId, ref: 'Request', required: true, index: true },
  performedBy: { type: ObjectId, ref: 'User', required: true },
  previousStatus: { type: String, default: null },
  newStatus: { type: String, required: true },
  action: { type: String, required: true }, // e.g. "CREATED", "ASSIGNED", "STATUS_CHANGE", "WORK_NOTE"
  notes: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true }
}
```

#### 4.7 Collection: `feedbacks`

Guest rating and reviews captured upon confirmation.

```javascript
{
  _id: ObjectId,
  requestId: { type: ObjectId, ref: 'Request', required: true, unique: true, index: true },
  guestId: { type: ObjectId, ref: 'User', required: true },
  staffId: { type: ObjectId, ref: 'User', default: null, index: true },
  departmentId: { type: ObjectId, ref: 'Department', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
}
```

#### 4.8 Collection: `notifications`

In-app notification records.

```javascript
{
  _id: ObjectId,
  recipientId: { type: ObjectId, ref: 'User', required: true, index: true },
  requestId: { type: ObjectId, ref: 'Request', default: null },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['STATUS_UPDATE', 'ASSIGNMENT', 'URGENT_ALERT', 'FEEDBACK_RECEIVED'],
    default: 'STATUS_UPDATE'
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
}
```

#### 4.9 Production Database Indexing Matrix

| Collection | Indexed Field(s) | Index Type | Query / Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `email` | Unique Single | Fast authentication lookup & uniqueness enforcement |
| `users` | `googleId` | Sparse Unique | Google OAuth identity lookup |
| `users` | `role, department, isOnDuty, isActive` | Compound | Smart staff workload candidate selection |
| `departments` | `code`, `name` | Unique Single | Business key uniqueness & lookups |
| `departments` | `isActive, name` | Compound | Active catalog rendering |
| `services` | `code` | Unique Single | Unique service identifier |
| `services` | `department, isActive` | Compound | Department-filtered catalog queries |
| `services` | `category, isActive` | Compound | Category-filtered catalog queries |
| `rooms` | `roomNumber` | Unique Single | Fast room dispatch & check-in lookup |
| `rooms` | `status, roomType` | Compound | Available room filtering |
| `requests` | `requestNumber` | Unique Single | Fast guest/staff ticket search |
| `requests` | `guest, status` | Compound | Guest personal request history |
| `requests` | `department, status` | Compound | Department active triage queues |
| `requests` | `assignedStaff, status` | Compound | Staff "Assigned to Me" queue & workload counts |
| `requests` | `status, priority, createdAt` | Compound | Admin/Staff priority queue ordering |
| `requesthistories` | `request, timestamp` | Compound | Immutable request timeline generation |
| `requesthistories` | `performedBy, timestamp` | Compound | Staff audit trail and accountability logs |
| `feedbacks` | `request` | Unique Single | Strictly one rating per request |
| `feedbacks` | `department, rating` | Compound | Department satisfaction CSAT aggregations |
| `feedbacks` | `staff, rating` | Compound | Staff performance evaluation |
| `notifications` | `user, isRead, createdAt` | Compound | Instant unread count badge & user inbox feed |

---

### 5. REST API Architecture & Endpoint Matrix

All REST endpoints follow standard JSON responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Errors return:

```json
{
  "success": false,
  "message": "Detailed error message",
  "errors": []
}
```

#### 5.1 Authentication & User APIs (`/api/auth`, `/api/users`)

- `POST /api/auth/register` — Register new user (Guest, or Staff by Admin).
- `POST /api/auth/login` — Authenticate and receive JWT + User Profile.
- `POST /api/auth/google` — Authenticate or register using Google verified ID token.
- `GET /api/auth/me` — Verify token and get current session profile.
- `PATCH /api/auth/change-password` — Change password for authenticated user.
- `POST /api/auth/logout` — Invalidate session client-side.
- `GET /api/users/me` — Retrieve current authenticated user profile with populated room and department.
- `PATCH /api/users/me` — Update permitted profile fields (`name`, `phone`, `avatar`). Whitelist guards prevent role or room tampering.
- `PATCH /api/users/me/on-duty` — Toggle staff member's operational availability (`isOnDuty: boolean`). Enforces role guard (`STAFF`/`ADMIN`) and immediately affects workload allocation dispatch.
- `POST /api/users` — Admin creation of Staff, Manager, or Guest accounts (ADMIN only).
- `GET /api/users` — Admin and Manager listing of all system users.
- `PATCH /api/users/:id/status` — Admin activation/deactivation of user accounts (ADMIN only).

#### 5.2 Service & Department APIs (`/api/departments`, `/api/services`)

- `GET /api/departments` — List active departments (Public/Authenticated).
- `POST /api/departments` — Create department (ADMIN only).
- `PUT /api/departments/:id` — Update department (ADMIN only).
- `DELETE /api/departments/:id` — Soft-delete / deactivate department (ADMIN only).
- `GET /api/services` — List service catalog (with category/department filters).
- `POST /api/services` — Create service item (ADMIN only).
- `PUT /api/services/:id` — Update service item (ADMIN only).
- `DELETE /api/services/:id` — Deactivate service item (ADMIN only).

#### 5.3 Request Operations API (`/api/requests`)

- `POST /api/requests` — Create request with optional image attachment (GUEST, ADMIN).
  - Auto-assigns department and attempts smart staff allocation.
- `GET /api/requests` — List requests with role-based filtering:
  - Guest: only their requests.
  - Staff: their department's requests or assigned tasks.
  - Admin/Manager: all requests with multi-parameter filter (status, dept, date, priority).
- `GET /api/requests/:id` — Retrieve detailed request info, including room, guest, staff, and history trail.
- `GET /api/requests/:id/history` — Retrieve immutable audit trail entries from `RequestHistory`.
- `PATCH /api/requests/:id/accept` — Staff accepts assigned ticket (STAFF, ADMIN).
- `PATCH /api/requests/:id/start` — Staff commences work on ticket (STAFF, ADMIN).
- `PATCH /api/requests/:id/complete` — Staff completes work on ticket (STAFF, ADMIN).
- `PATCH /api/requests/:id/confirm` — Guest confirms completed request (GUEST, ADMIN).
- `PATCH /api/requests/:id/cancel` — Guest or Admin cancels request (GUEST restricted to PENDING/ASSIGNED).
- `PATCH /api/requests/:id/assign` — Manual staff assignment or reassignment (ADMIN).
- `POST /api/requests/:id/notes` — Add operational work note without changing state (STAFF, ADMIN).

#### 5.4 Feedback & Reviews API (`/api/feedback`)

- `POST /api/feedback` — Submit rating (1–5 integer) and review comment ($\le 1000$ chars) for a `CONFIRMED` request (GUEST only, enforced 1 feedback per request).
- `GET /api/feedback/request/:requestId` — Retrieve submitted feedback for a specific request (GUEST restricted to own request; STAFF/ADMIN can view assigned/all).
- `GET /api/feedback/summary` — Department & staff average ratings (MANAGER, ADMIN).

#### 5.5 Analytics & Reporting API (`/api/analytics`)

Strictly guarded by `authenticate` and `authorize(USER_ROLES.MANAGER, USER_ROLES.ADMIN)`.

- `GET /api/analytics/overview` — Executive KPIs: total volume, pending, in-progress, completed, confirmed, cancelled, urgent, resolution rate %, avg response time, avg completion time, overdue count.
- `GET /api/analytics/trends` — Continuous daily time-series request volume trends (created, completed, confirmed, cancelled).
- `GET /api/analytics/departments` — Departmental performance breakdown: total volume, resolution rate %, turnaround averages, status counts.
- `GET /api/analytics/staff-performance` — Staff leaderboard: requests assigned, completed, active load, turnaround times, and verified guest ratings.
- `GET /api/analytics/sla` — Live SLA monitoring: overdue queue, approaching deadline warning queue, and healthy on-track active tickets.
- `GET /api/analytics/guest-satisfaction` — CSAT score, star distribution breakdown (1–5 stars), department ratings, and sanitized guest review feed.
- `GET /api/analytics/top-services` — Most requested services ranking with share percentages and turnaround times.
- `GET /api/analytics/priority-distribution` — Volume distribution by priority level (Low, Normal, High, Urgent) and urgent request status breakdown.
- `GET /api/analytics/export` — RFC-4180 CSV report export with OWASP formula injection protection (`type=requests|departments|staff|sla`).

---

### 6. Real-Time WebSocket Architecture (Socket.IO)

#### 6.1 Server Topology & Connection Lifecycle

The real-time engine is attached directly to the primary Express HTTP server, avoiding disparate server processes:

```text
Express Application + Node HTTP Server + Socket.IO Server (v4)
```

- **Single Instance**: Initialized via `initSocketServer(httpServer)` in `server/src/sockets/index.js`.
- **CORS Configuration**: Restricts connections strictly to `CLIENT_URL` (default `http://localhost:5173`) with credentials enabled; wildcards (`*`) are prohibited.
- **Transport Strategy**: WebSocket-first with HTTP long-polling fallback (`transports: ['websocket', 'polling']`).

#### 6.2 Handshake Authentication & Security Guards

Socket connections are authenticated cryptographically during the initial handshake:

1. Client transmits token: `auth: { token: "<JWT>" }` (or `Authorization: Bearer <JWT>` header).
2. `socketAuth.middleware.js` verifies JWT signature and expiration via `verifyToken(token)`.
3. Verifies user exists in database (`User.findById(decoded.userId).select('-password')`).
4. Verifies account is active (`user.isActive === true`).
5. Attaches sanitized user identity to `socket.data.user` (`id`, `name`, `email`, `role`, `department`, `room`, `isOnDuty`, `isActive`).
6. Invalid, expired, or missing tokens are rejected immediately with standard error codes (`NO_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `ACCOUNT_DEACTIVATED`).
7. **Privilege Escalation Prevention**: Client-supplied role or room selections are disregarded. The server blocks client `joinRoom` calls with `system:error` alerts.

#### 6.3 Server-Enforced Room Strategy

Upon successful handshake, the server joins sockets to authorized rooms based solely on authenticated identity:

- **Guest**: Joins `user:<userId>`.
- **Staff**: Joins `user:<userId>` and `dept:<departmentId>`.
- **Admin**: Joins `user:<userId>` and `role:admin`.
- **Manager**: Joins `user:<userId>` and `role:manager`.

#### 6.4 Standardized Event Contracts & Payload Shapes

All events use standardized naming conventions and sanitized payloads stripped of passwords and database internals:

| Event Name | Trigger Condition | Intended Audience | Payload Shape |
| :--- | :--- | :--- | :--- |
| `request:created` | Guest creates new service ticket | `user:<guestId>`, `dept:<deptId>`, `role:admin`, `role:manager`, `user:<assignedStaffId>` (if auto-assigned) | Safe Request Object |
| `request:assigned` | Ticket assigned/reassigned to staff | `user:<assignedStaffId>`, `user:<guestId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object |
| `request:accepted` | Assigned staff acknowledges ticket | `user:<guestId>`, `user:<assignedStaffId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object |
| `request:started` | Assigned staff commences work | `user:<guestId>`, `user:<assignedStaffId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object |
| `request:completed` | Physical work delivered | `user:<guestId>`, `user:<assignedStaffId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object |
| `request:confirmed` | Guest confirms service delivery | `user:<guestId>`, `user:<assignedStaffId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object |
| `request:cancelled` | Ticket aborted prior to work | `user:<guestId>`, `user:<assignedStaffId>` (if assigned), `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object + `cancellationReason` |
| `request:updated` | Operational note appended | `user:<guestId>`, `user:<assignedStaffId>`, `dept:<deptId>`, `role:admin`, `role:manager` | Safe Request Object + `action`, `notes` |
| `notification:new` | New persistent notification saved | `user:<recipientId>` | `{ notification: { id, recipientId, requestId, title, message, type, isRead, createdAt } }` |
| `notification:read` | Notification marked as read | `user:<userId>` (all active sessions/tabs) | `{ userId, notificationIds, isRead: true, timestamp }` |
| `system:error` | Security violation / system error | Originating socket | `{ message: "..." }` |

##### Safe Request Payload Schema

```json
{
  "requestId": "67240abcd...",
  "requestNumber": "REQ-20261019-0001",
  "status": "ASSIGNED",
  "priority": "HIGH",
  "category": "HOUSEKEEPING",
  "serviceTitle": "Extra Towels",
  "serviceId": "67240cdef...",
  "quantity": 2,
  "description": "Please bring fresh towels",
  "specialInstructions": "Leave on luggage rack",
  "imageUrl": null,
  "guestId": "672401111...",
  "guestName": "Alice Guest",
  "assignedStaffId": "672402222...",
  "assignedStaffName": "Bob Staff",
  "departmentId": "672403333...",
  "departmentName": "Housekeeping",
  "roomId": "672404444...",
  "roomNumber": "201",
  "createdAt": "2026-10-19T11:45:00.000Z",
  "assignedAt": "2026-10-19T11:45:01.000Z",
  "acceptedAt": null,
  "startedAt": null,
  "completedAt": null,
  "confirmedAt": null,
  "cancelledAt": null,
  "cancellationReason": null
}
```

#### 6.5 Real-Time Notification Integration & Single Source of Truth

Real-time Socket.IO dispatch acts strictly as a broadcast enhancement, not a secondary source of truth:

1. Business service updates MongoDB (`Request`, `RequestHistory`).
2. `createNotification()` persists the `Notification` document to MongoDB.
3. Once persistence succeeds, `realtime.service.js` dispatches socket events to target rooms.
4. If socket delivery fails or client is disconnected, persistent database records remain intact.

#### 6.6 Frontend SocketContext & Reconnection Lifecycle

Implemented in `client/src/context/SocketContext.jsx`:

- **Conditional Connection**: Sockets only connect when `isAuthenticated === true` and a valid token exists.
- **Auto-Cleanup**: Disconnects immediately on user logout or session expiration, removing all socket listeners.
- **Reconnection Logic**: Socket.IO automatically reconnects with exponential backoff (`reconnectionDelay: 1000ms`, `reconnectionDelayMax: 5000ms`, `reconnectionAttempts: 15`).
- **Subscription Deduplication**: `subscribe(event, handler)` returns a cleanup function, ensuring zero duplicate event listeners across component mount/unmount cycles.
- **Reusable Hook**: `useRequestRealtime({ onRequestUpdated, onRequestCreated, filterRequestId })` enables pages to react dynamically to lifecycle changes without full-page reloads.

#### 6.7 REST Fallback Architecture

All real-time updates have authoritative REST equivalents. If a user loses internet connectivity or reconnects:

- Requests can always be refetched via `GET /api/requests` or `GET /api/requests/:id`.
- Notifications can be queried via `GET /api/notifications` and `GET /api/notifications/unread-count`.

#### 6.8 In-App Notifications API (`/api/notifications`)

- `GET /api/notifications`: List authenticated user's notifications (supports pagination and `isRead` filtering).
- `GET /api/notifications/unread-count`: Retrieve current unread badge count.
- `PATCH /api/notifications/:id/read`: Mark an individual notification as read (strictly enforced: users can only modify their own notifications; unauthorized access returns HTTP 403).
- `PATCH /api/notifications/read-all`: Mark all notifications for the authenticated user as read.

---

### 7. Smart Staff Allocation Algorithm

Implemented in `server/src/services/assignment.service.js`:

```javascript
/**
 * Smart allocation picks the staff member with the lowest active workload
 * in the designated department.
 */
async function allocateStaffToRequest(departmentId) {
  // 1. Fetch all active and on-duty staff belonging to this department
  const eligibleStaff = await User.find({
    role: 'STAFF',
    departmentId: departmentId,
    isActive: true,
    isOnDuty: true
  }).select('_id fullName email');

  if (!eligibleStaff || eligibleStaff.length === 0) {
    return null; // Stays unassigned in department queue
  }

  // 2. Aggregate active workload counts for eligible staff members
  const staffIds = eligibleStaff.map(s => s._id);
  const activeStatuses = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'];

  const workloadCounts = await Request.aggregate([
    {
      $match: {
        assignedStaffId: { $in: staffIds },
        status: { $in: activeStatuses }
      }
    },
    {
      $group: {
        _id: '$assignedStaffId',
        activeCount: { $sum: 1 }
      }
    }
  ]);

  const workloadMap = new Map();
  workloadCounts.forEach(w => workloadMap.set(w._id.toString(), w.activeCount));

  // 3. Find staff with minimum active tasks
  let selectedStaff = eligibleStaff[0];
  let minWorkload = workloadMap.get(selectedStaff._id.toString()) || 0;

  for (const staff of eligibleStaff) {
    const load = workloadMap.get(staff._id.toString()) || 0;
    if (load < minWorkload) {
      minWorkload = load;
      selectedStaff = staff;
    }
  }

  return selectedStaff;
}
```

---

### 8. Security & Data Protection Architecture

1. **Authentication (JWT)**:
   - Secret key stored in `JWT_SECRET` environment variable (never exposed to client).
   - Stateless JWT tokens signed with HMAC-SHA256 (`{ userId, role }`) with configurable TTL (`JWT_EXPIRES_IN=7d`).
   - Bearer token passed in `Authorization: Bearer <token>` header.
   - Validated by `auth.middleware.js`, verifying token signature, expiration, database user existence, and active account status (`isActive`).
2. **Token Storage Strategy & Security Tradeoff**:
   - *Client Storage*: Token stored in browser `localStorage` (`hsh_auth_token`) for responsive single-page application hydration.
   - *Security Tradeoff*: Browser `localStorage` allows instant client session restoration across tabs and reloads, but is vulnerable to Cross-Site Scripting (XSS) if untrusted third-party scripts execute. In production enterprise hardening, migration to `HttpOnly`, `SameSite=Strict`, `Secure` cookies is recommended to eliminate script access to tokens.
   - *Stateless Logout*: Token discarding is coordinated on the frontend via `localStorage.removeItem('hsh_auth_token')` with an advisory call to `POST /api/auth/logout`.
3. **Role-Based Access Control (RBAC)**:
   - Enforced on backend via `role.middleware.js` (`authorize(...roles)`).
   - Roles: `GUEST`, `STAFF`, `ADMIN`, `MANAGER`.
   - Public registration is strictly locked to `GUEST` accounts (role tampering is rejected with HTTP 400).
   - Administrative endpoints (`POST /api/users`, `PATCH /api/users/:id/status`) are guarded for `ADMIN` only.
4. **Password Security**:
   - Passwords hashed using `bcryptjs` with salt work factor of 10.
   - Plaintext passwords never stored or returned in API responses (stripped via Mongoose `toJSON` transforms).
5. **Database Protection**:
   - Connection string uses `MONGODB_URI` environment variable.
   - No credentials in client source code. Standby guard prevents crash when placeholder is used.
6. **File Storage Sanitization**:
   - Multer checks file size limit (5MB) and mime-type (`image/jpeg`, `image/png`, `image/webp`).
   - Filenames cryptographically randomized via timestamp and unique suffix to avoid collision and traversal.
7. **CORS Policy**:
   - Server whitelists `http://localhost:5173` and production client origin with credentials enabled.

---

### 9. Core Request Engine Architecture & Business Logic (Phase 4)

#### 9.1 Service-to-Department Resolution & Zero-Trust Client Model

- **Single Source of Truth**: The department for every request is resolved strictly from `Service.department`. Client-supplied `department`, `room`, `guest`, `requestNumber`, `status`, or `assignedStaff` fields are disregarded.
- **Room Resolution**: Derived strictly from `req.user.room`. Guests without an assigned room cannot initiate service requests (HTTP 400).
- **Request Number Generator**: Standardized as `REQ-YYYYMMDD-XXXX` via atomic day-count query with randomized collision fallback.

#### 9.2 Request State Machine

- Lifecycle graph:
  - `PENDING` $\to$ `ASSIGNED` (auto/admin allocation) or `CANCELLED` (guest/admin)
  - `ASSIGNED` $\to$ `ACCEPTED` (assigned staff/admin), `ASSIGNED` (reassignment), or `CANCELLED` (guest/admin)
  - `ACCEPTED` $\to$ `IN_PROGRESS` (assigned staff/admin)
  - `IN_PROGRESS` $\to$ `COMPLETED` (assigned staff/admin)
  - `COMPLETED` $\to$ `CONFIRMED` (guest owner)
  - `CANCELLED` & `CONFIRMED` $\to$ Terminal states
- Any illegal or out-of-order transition is rejected with HTTP 400.

#### 9.3 Concurrency Control & Race Condition Prevention

- **Atomic Compare-and-Set**: All state updates and staff claims use `findOneAndUpdate({ _id: requestId, status: expectedStatus }, ...)` rather than find-then-save.
- If two staff members attempt to claim or transition the same request simultaneously, only the first transaction matches the exact current status; the second receives `null` and returns HTTP 409 Conflict.

#### 9.4 Smart Staff Workload Allocation Strategy

- Algorithm in `assignment.service.js`:
  1. Filters staff where `role === 'STAFF'`, `department === request.department`, `isActive === true`, `isOnDuty === true`.
  2. Aggregates active workloads where `status` $\in$ `['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS']`.
  3. Selects candidate with $\min(\text{ActiveWorkload})$.
  4. Tie-breaking: Earliest `lastAssignedAt`, followed by deterministic `_id` string sorting.
  5. If no eligible staff is on duty, ticket remains in `PENDING` status.

#### 9.5 Immutable Audit Trail & Notification Architecture

- **Append-Only History**: Every lifecycle state transition, manual reassignment, or operational work note appends an immutable entry to `RequestHistory` (`request`, `performedBy`, `previousStatus`, `newStatus`, `action`, `notes`, `timestamp`). No history record is ever modified or deleted.
- **Work Notes**: `POST /api/requests/:id/notes` appends an entry with `action: 'NOTE_ADDED'` without altering the request state.
- **Persistent Notifications**: Lifecycle milestones persist unread `Notification` documents for guests (`REQUEST_CREATED`, `REQUEST_ASSIGNED`, `REQUEST_COMPLETED`) and staff (`REQUEST_ASSIGNED`).

---

### 10. Real-Time Socket.IO Engine Architecture (Phase 5)

- **Lifecycle Mount**: Single Socket.IO server mounted onto Express HTTP server.
- **Handshake Validation**: Bearer JWT authenticated during handshake before socket acceptance.
- **Room Partitions**: Private user room (`user:<id>`), department pool (`dept:<id>`), and operational roles (`role:admin`, `role:manager`).
- **REST Fallback**: REST endpoints remain the authoritative transactional engine; WebSockets broadcast updates reactively.

---

### 11. Shared Frontend UI Architecture & Component Hierarchy (Phase 6)

#### 11.1 Component Tree & Layering

```text
App Root (BrowserRouter)
├── GoogleOAuthProvider (Google Client ID auth context)
├── AuthProvider (JWT session state, token persistence)
├── SocketProvider (WSS connection lifecycle, reconnect logic)
└── NotificationProvider (Live + persistent unread badge & dropdown)
    └── Routes
        ├── Public Routes: / (Home), /login, /register, /unauthorized
        └── Role-Guarded Portals (ProtectedRoute + RoleRoute)
            ├── /guest   → AppLayout → GuestShell (Catalog, Active Tracker, History)
            ├── /staff   → AppLayout → StaffShell (Duty Switch, Assigned Queue, Dept Pool)
            ├── /admin   → AppLayout → AdminShell (KPI Cards, Dispatch Table, Audit Trail)
            └── /manager → AppLayout → ManagerShell (Executive SLA, Dept Breakdown)
```

#### 11.2 Design System Tokens & Foundations

- **Base Styling**: `@tailwind base; @tailwind components; @tailwind utilities;` with centralized CSS variables in `index.css`.
- **Typography**: Google Fonts Inter with standard optical sizing; JetBrains Mono for ticket identifiers and timestamps.
- **Accessible Focus Management**: Global `*:focus-visible` styling (`ring-2 ring-indigo-500 ring-offset-2`) ensuring WCAG 2.1 AA keyboard navigation.
- **Modular Component Primitives**: All shared components exported from `client/src/components/common/index.js` (`Button`, `Input`, `Select`, `Textarea`, `FormField`, `Badge`, `StatusBadge`, `PriorityBadge`, `Card`, `Modal`, `ConfirmDialog`, `LoadingSpinner`, `SkeletonLoader`, `EmptyState`, `ErrorState`, `PageHeader`, `SearchInput`, `FilterBar`, `Pagination`, `ResponsiveTable`, `Toast`, `Avatar`, `ConnectionStatus`, `NotificationDropdown`).

---

### 12. Manager Analytics & SLA Reporting Engine Architecture (Phase 10)

#### 12.1 Core Architectural Principles & Data Integrity

1. **Zero Fake Metrics**: All metrics, charts, and tables are calculated dynamically from authentic MongoDB records (`Request`, `Department`, `Service`, `User`, `Feedback`). Hardcoded values or mock trends are prohibited.
2. **Read-Only Manager Scope**: The `MANAGER` role possesses read-only operational visibility. The manager cannot perform administrative mutations (e.g. creating admins, modifying roles, altering catalog entities, mutating room inventory, or bypassing request lifecycles).
3. **Server-Side Aggregations**: Complex enterprise aggregations execute within MongoDB pipelines; client applications receive structured, lightweight JSON responses rather than downloading unbounded collections.

#### 12.2 Metric Definitions & Formulas

| Metric | Mathematical Formula / Query Condition | Inclusion / Exclusion Criteria |
| :--- | :--- | :--- |
| **Total Volume** | $\text{Count}(\text{createdAt} \in [\text{start}, \text{end}])$ | All requests created in range. |
| **Pending** | $\text{Count}(\text{status} = \text{'PENDING'})$ | Awaiting staff assignment. |
| **Assigned** | $\text{Count}(\text{status} = \text{'ASSIGNED'})$ | Allocated to staff, pending acceptance. |
| **In Progress** | $\text{Count}(\text{status} \in [\text{'ACCEPTED'}, \text{'IN\_PROGRESS'}])$ | Staff actively addressing task. |
| **Completed** | $\text{Count}(\text{status} = \text{'COMPLETED'})$ | Work finished, awaiting guest confirm. |
| **Confirmed** | $\text{Count}(\text{status} = \text{'CONFIRMED'})$ | Guest validated delivery. |
| **Cancelled** | $\text{Count}(\text{status} = \text{'CANCELLED'})$ | Aborted prior to physical work. |
| **Urgent** | $\text{Count}(\text{priority} = \text{'URGENT'})$ | High escalation priority requests. |
| **Resolution Rate (%)** | $\frac{\text{Completed} + \text{Confirmed}}{\text{Total}} \times 100$ | Yields 100% when $\text{Total} = 0$ (no divide-by-zero). |
| **Average Response Time** | $\frac{\sum (\text{acceptedAt} - \text{createdAt})}{\text{Count}(\text{acceptedAt} \ge \text{createdAt})}$ | Excludes null or negative response durations. |
| **Average Completion Time** | $\frac{\sum (\text{completedAt} - \text{createdAt})}{\text{Count}(\text{completedAt} \ge \text{createdAt})}$ | Excludes null or negative completion durations. |
| **Overdue SLA Tickets** | Active tickets where $(\text{now} - \text{createdAt}) > \text{service.estimatedDurationMinutes} \times 60000$ | Active states: `PENDING`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`. |

#### 12.3 Timezone & Date Range Bounds Policy

- **Standardized Presets**:
  - `today`: Current date 00:00:00.000 UTC to 23:59:59.999 UTC.
  - `last7days`: 7 calendar days preceding now.
  - `last30days` (Default): 30 calendar days preceding now.
  - `thisMonth`: 1st day of current month 00:00:00 UTC to now.
  - `previousMonth`: 1st day of previous month to last day of previous month 23:59:59.999 UTC.
  - `custom`: Chronologically validated (`startDate <= endDate`) with a 366-day safety ceiling.

- **Timestamp Semantics**:
  - Request creation volume groups by `createdAt`.
  - Completed request volume groups by `completedAt`.
  - Confirmed request volume groups by `confirmedAt`.
  - Cancelled request volume groups by `cancelledAt`.

#### 12.4 SLA Monitoring & Escalation Strategy

- **Service Thresholds**: Each `Service` defines `estimatedDurationMinutes` (default: 30 minutes).
- **State Categorization**:
  - `OVERDUE`: Active request with elapsed time exceeding SLA threshold.
  - `APPROACHING`: Active request with $\text{elapsed} \ge 0.75 \times \text{threshold}$.
  - `ON_TRACK`: Active request with $\text{elapsed} < 0.75 \times \text{threshold}$.
- **Cancelled Requests**: Excluded from active SLA queues to prevent false alarms.

#### 12.5 Report Export & OWASP Formula Injection Protection

- Formatted as RFC-4180 standard CSV (`Content-Type: text/csv`).
- **Formula Injection Defense**: Any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prefixed with a single quote (`'`), neutralizing spreadsheet execution while preserving display fidelity.
- Sensitive credentials (passwords, JWTs, OAuth tokens, internal DB connection strings) are strictly excluded from all export projections.

#### 12.6 Real-Time WebSocket Synchronization & REST Fallback

- Manager portal joins `role:manager` room upon authenticated socket handshake.
- Debounced refresh (1,200ms) on `request:created`, `request:assigned`, `request:accepted`, `request:started`, `request:completed`, `request:confirmed`, and `request:cancelled` ensures live dashboard synchronization without overwhelming database pipelines.
- Seamless REST fallback guarantees full operational reporting even if WebSocket connectivity is interrupted.
