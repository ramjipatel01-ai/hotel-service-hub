# Product Requirements Document (PRD)
## HOTEL SERVICE HUB — Smart Hotel Guest Service Request Management Platform

---

### 1. Document Control & Metadata
- **Product Name**: Hotel Service Hub
- **Tagline**: Smart Hotel Guest Service Request Management Platform
- **Version**: 1.0.0-PROD-SPEC
- **Status**: Approved for Architecture & Implementation
- **Target Audience**: Hotel Guests, Operations Staff, Department Leads, Hotel Management & System Administrators

---

### 2. Executive Summary & Problem Statement

#### 2.1 The Problem
In traditional hospitality operations, guest service requests are fragmented across analog phone calls to the front desk, walk-ins, ad-hoc WhatsApp messaging, and verbal communications with roaming staff. This legacy operational mode induces critical points of failure:
- **Lost & Dropped Requests**: No centralized log; verbal requests are forgotten during shift handovers.
- **Delayed SLA Response Times**: Unbalanced staff distribution without visibility into pending queues.
- **Department Misrouting**: Front desk manually triages technical, housekeeping, and culinary requests, frequently assigning tasks to incorrect personnel.
- **Zero Visibility & Guest Anxiety**: Guests have no mechanism to track whether their request has been received, who is handling it, or when it will be fulfilled.
- **Absence of Accountability & Audit Trails**: Lack of historical logs makes it impossible to investigate complaints or evaluate operational bottlenecks.
- **No Data-Driven Performance Analytics**: Hotel leadership lacks quantitative data on staff turnaround time, department workloads, recurring maintenance issues, and guest satisfaction metrics.

#### 2.2 The Solution
**Hotel Service Hub** is a multi-tenant-ready, full-stack, real-time hotel service request orchestration platform. It standardizes the lifecycle of every guest request into an audited, trackable, and automated pipeline connecting **Guests**, **Specialized Departments**, **Field Staff**, and **Executive Management**.

---

### 3. Core Request Lifecycle & Business Rules

#### 3.1 Controlled State Machine
Requests strictly adhere to a deterministic 7-state lifecycle:

```
[ GUEST CREATION ]
       │
       ▼
   (PENDING) ────────► [ Auto/Admin Assignment ]
       │
       ▼
   (ASSIGNED) ────────► [ Staff Acknowledgment ]
       │
       ▼
   (ACCEPTED) ────────► [ Work Commenced ]
       │
       ▼
  (IN_PROGRESS) ──────► [ Physical Execution Finished ]
       │
       ▼
   (COMPLETED) ───────► [ Guest Verification ]
       │
       ▼
   (CONFIRMED) ───► [ Guest Feedback & Rating ]

  * CANCELLED: Can transition from PENDING or ASSIGNED by Guest or Admin.
```

#### 3.2 State Definitions & Permissions Matrix
| Status | Allowed Next State(s) | Authorized Roles | Trigger Event / Description |
| :--- | :--- | :--- | :--- |
| `PENDING` | `ASSIGNED`, `CANCELLED` | System, Admin, Guest (cancel only) | Request created by guest. Department auto-assigned. Awaiting staff allocation. |
| `ASSIGNED` | `ACCEPTED`, `ASSIGNED` (reassign), `CANCELLED` | Staff, Admin, Guest (cancel only) | Staff member allocated (via smart workload algorithm or admin dispatch). |
| `ACCEPTED` | `IN_PROGRESS`, `ASSIGNED` (reject/reassign) | Assigned Staff, Admin | Staff member acknowledges ticket receipt and queue priority. |
| `IN_PROGRESS` | `COMPLETED` | Assigned Staff, Admin | Staff actively performing service; work notes can be appended. |
| `COMPLETED` | `CONFIRMED`, `IN_PROGRESS` (reopened by Admin) | Assigned Staff, Admin | Physical delivery completed. Awaiting guest verification. |
| `CONFIRMED` | *Terminal State* | Guest, Admin (auto-confirm fallback) | Guest validates delivery of service; unlocks feedback & rating. |
| `CANCELLED` | *Terminal State* | Guest, Admin | Aborted prior to physical work commencing with cancellation reason. |

---

### 4. User Personas & Role-Based Capabilities

#### 4.1 Guest
- **Authentication & Profile**: Register/Login via Room Number + Access Token / Credentials, view assigned room details, view active stay dates.
- **Service Catalog Navigation**: Browse categorized catalog (Housekeeping, Maintenance, Room Service, Transportation, Front Desk).
- **Request Submission**:
  - Select service item, specify quantity (if applicable).
  - Set priority (Low, Normal, High, Urgent).
  - Enter description, special instructions, and preferred delivery time.
  - Optional image attachment (e.g., photo of leaking faucet or stained linen).
- **Live Tracking**: Real-time progress bar/stepper showing current state, assigned department, and assigned staff name/avatar.
- **Resolution & Feedback**: One-click confirmation of completed requests, followed by 1–5 star rating and textual review.
- **History**: Historical list of past requests filtered by status and date.

#### 4.2 Staff
- **Secure Access**: Department-scoped login with active duty toggle.
- **Department Queue**: Real-time dashboard showing incoming requests for their designated department.
- **Request Acceptance & Execution**: Accept assigned jobs, change status to `IN_PROGRESS`, add operational notes (e.g., "Replaced valve, waiting for water pressure check").
- **Resolution**: Mark job as `COMPLETED`.
- **Workload & Personal History**: View current active tasks vs. completed tasks, personal turnaround metrics.

#### 4.3 Administrator
- **Central Control Room**: Complete oversight of all hotel departments, rooms, requests, and staff.
- **Catalog Management (CRUD)**: Create, update, toggle, and delete departments and individual service items with pricing/SLA configurations.
- **Staff & User Management**: Manage accounts, assign staff to departments, view staff status and availability.
- **Room Management**: Room registry with room types, floor numbers, and guest occupancy status.
- **Manual Dispatch & Reassignment**: Override automatic department or staff routing; elevate or de-escalate priorities.
- **SLA & Escalation Monitoring**: Highlight overdue or pending requests that exceed expected completion times.

#### 4.4 Manager
- **Executive Analytics Dashboard**: Macro-level KPIs (Total requests, volume by status, departmental distribution).
- **SLA & Performance Metrics**: Average response time (Created → Accepted), average completion time (Accepted → Completed).
- **Staff Workload & Efficiency**: Requests completed per staff member, average guest rating per staff/department.
- **Trends & Hotspots**: Most requested services, high-failure rooms/floors (e.g., frequent AC repairs in Room 304).

---

### 5. Service Catalog & Department Taxonomy

The platform delivers an extensible taxonomy where services map to departments:

```
├── HOUSEKEEPING
│   ├── Extra towels (Quantity enabled, Normal priority)
│   ├── Extra pillow (Quantity enabled, Low priority)
│   ├── Blanket (Quantity enabled, Low priority)
│   ├── Bedsheet change (Normal priority)
│   ├── Room cleaning (Normal priority)
│   ├── Toiletries replenishment (Normal priority)
│   └── Water bottles (Quantity enabled, Normal priority)
│
├── MAINTENANCE
│   ├── AC issue (High/Urgent priority)
│   ├── TV issue (Normal/High priority)
│   ├── Wi-Fi connectivity issue (High priority)
│   ├── Electricity / Power outlet failure (Urgent priority)
│   ├── Plumbing & water leakage (Urgent priority)
│   ├── Bathroom amenities issue (Normal priority)
│   └── Furniture defect (Low/Normal priority)
│
├── ROOM SERVICE
│   ├── Food order (Kitchen dispatch, Normal priority)
│   ├── Beverage order (Bar/Pantry dispatch, Normal priority)
│   ├── Breakfast package (Scheduled preferred time, Normal priority)
│   ├── Dinner package (Scheduled preferred time, Normal priority)
│   └── Special dietary / Allergy request (High priority)
│
├── TRANSPORTATION
│   ├── Airport pickup (Flight number & time, Normal priority)
│   ├── Airport drop-off (Terminal & time, Normal priority)
│   ├── On-demand Taxi hailing (Immediate, Normal priority)
│   ├── Local sightseeing shuttle (Scheduled, Low priority)
│   └── Rental car coordination (Scheduled, Low priority)
│
└── FRONT DESK
    ├── Room change request (Urgent/High priority)
    ├── Extra key card (High priority)
    ├── Early check-in / Late check-out assistance (Normal priority)
    ├── Luggage assistance / Bell desk (Normal priority)
    └── General concierge inquiry (Low priority)
```

---

### 6. Intelligent Backend Automation

#### 6.1 Automatic Department Resolution
When a guest initiates a request for a known service, the backend automatically looks up the service's associated `departmentId` and links it to the request during creation. No manual front-desk routing is needed for standard catalog services.

#### 6.2 Smart Staff Workload Allocation Strategy
To prevent single-staff burnout and optimize task distribution:
1. Identify all active, on-duty staff members assigned to the targeted department.
2. Calculate active ticket load for each staff member:
   $$\text{ActiveLoad} = \text{Count}(\text{status} \in [\text{'ASSIGNED'}, \text{'ACCEPTED'}, \text{'IN\_PROGRESS'}])$$
3. Allocate ticket to staff member with $\min(\text{ActiveLoad})$.
4. In case of a tie, allocate to the staff member with the earliest last-assigned timestamp.
5. If no staff member is available or on-duty, flag ticket as `UNASSIGNED` within the department queue and trigger an escalation alert to Admin.

---

### 7. Non-Functional & Operational Requirements

#### 7.1 Real-Time Performance & SLAs
- Real-time updates delivered via WebSockets (Socket.IO) within $\le 300\text{ms}$ of database persistence.
- Standard requests must receive staff assignment within 5 minutes.
- Urgent requests must trigger sound alerts and visual badges on Admin and Staff portals immediately.

#### 7.2 Security & Compliance
- **Zero Exposure**: No database credentials, JWT secrets, or sensitive configuration in client code or repositories.
- **Access Control (RBAC)**: Strict role guards on all REST endpoints and WebSocket events.
- **File Upload Protection**: Image uploads validated for MIME types (`image/jpeg`, `image/png`, `image/webp`), capped at 5MB, and sanitized against path traversal attacks.
- **Passwords**: Hashed with bcrypt (minimum cost factor 10).
- **Token Security**: JWT signed with HMAC-SHA256, expired within controlled TTLs.

#### 7.3 Multi-Device Responsiveness
- **Guest Portal**: Mobile-first design optimized for mobile viewport (320px–480px) and tablet/desktop webview.
- **Staff / Admin / Manager Portals**: Responsive dashboard grids optimized for tablets and desktop displays (1024px+).

---

### 8. Acceptance Criteria Matrix
| Feature | Acceptance Criteria |
| :--- | :--- |
| **Guest Request Creation** | Guest selects service, priority, quantity, description, uploads optional photo; request receives unique code (`REQ-YYYYMMDD-XXXX`), status becomes `PENDING`, department is assigned automatically. |
| **Audit Trail** | Every status update, reassignment, or work note logs an immutable history entry with user ID, role, previous status, new status, and timestamp. |
| **Staff Claim & Progression** | Department staff receives real-time notification, clicks accept, status moves to `ACCEPTED`, then `IN_PROGRESS`, then `COMPLETED` with work notes. |
| **Guest Confirmation & Review** | When marked `COMPLETED`, guest UI displays confirmation prompt and star rating + review input. Confirmation moves request to `CONFIRMED`. |
| **Live Notifications** | Socket.IO emits events to target rooms (`user:<id>`, `dept:<id>`, `role:admin`), updating UI badges and toast alerts without full-page reloads. |
| **Admin Overrides** | Admin can reassign any request, modify priority, add/edit departments and services, and monitor overdue requests. |
| **Manager Analytics** | Interactive charts render real-time request counts by status, department, priority, average response time, and staff workload distribution. |
