# HOTEL SERVICE HUB

> **Smart Hotel Guest Service Request Management Platform**

A full-stack, enterprise-ready web platform that centralizes, automates, and orchestrates hotel service requests between guests, departments, field staff, and hotel management.

---

## 1. Problem Statement

In conventional hospitality environments, guest requests (such as room cleaning, extra towels, AC repair, plumbing, dining, or transportation) are handled haphazardly over phone calls, WhatsApp, or verbal desk walk-ins. This leads to:

- **Dropped or forgotten requests** during shift handovers.
- **Unacceptable SLA delays** with zero queue visibility.
- **Wrong department allocation** and miscommunication.
- **Lack of tracking** for guests, generating frustration and repeat inquiries.
- **No audit trail or analytics** to assess department bottlenecks or staff performance.

**Hotel Service Hub** centralizes the end-to-end request lifecycle:
$$\text{Guest Request} \longrightarrow \text{Auto-Department Triage} \longrightarrow \text{Smart Staff Allocation} \longrightarrow \text{Execution} \longrightarrow \text{Guest Confirmation} \longrightarrow \text{Rating/Feedback}$$

---

## 2. Technology Stack

### Frontend (`client/`)

- **React 18**: Declarative, component-driven user interface.
- **Vite 6**: Fast ESM build tooling and Hot Module Replacement (HMR).
- **Tailwind CSS 3**: Custom design token system and responsive layout engine.
- **React Router 7**: Client-side declarative routing and role protection guards.
- **Axios**: HTTP client with request/response interceptors for JWT injection.
- **Socket.IO Client**: Real-time event synchronization.
- **Recharts**: Data visualization for executive analytics.
- **Lucide React**: Modern iconography.

### Backend (`server/`)

- **Node.js LTS (v18+)**: Asynchronous non-blocking event-driven runtime.
- **Express.js 4**: Modular REST routing and middleware pipeline.
- **Mongoose 8**: Document schema modeling and business validations.
- **Socket.IO 4**: Room-partitioned WebSocket event bus.
- **JWT & bcryptjs**: Stateless authorization and salted password encryption.
- **Multer**: Safe file upload handler with MIME validation and storage bounds.

### Database

- **MongoDB Atlas**: Managed replica-set document database.

---

## 3. Repository & Directory Structure

```text
hotel-service-hub/
├── client/                      # React 18 + Vite Frontend
│   ├── public/                  # Favicon and static assets
│   ├── src/
│   │   ├── assets/              # Icons and imagery
│   │   ├── components/          # Reusable component library
│   │   ├── layouts/             # App shell, Navbar, Sidebar
│   │   ├── pages/               # Page views (Auth, Guest, Staff, Admin, Manager)
│   │   ├── routes/              # Protected routes & role guards
│   │   ├── services/            # Centralized API service (api.js)
│   │   ├── context/             # AuthContext, SocketContext
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Constants, formatters
│   │   ├── App.jsx              # App layout & router
│   │   ├── index.css            # Tailwind directives & tokens
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── config/              # database.js, constants.js
│   │   ├── controllers/         # REST request handlers (Auth, Request, Feedback, Catalog, Analytics)
│   │   ├── middleware/          # errorHandler.js, notFoundHandler.js, auth.js
│   │   ├── models/              # Mongoose schemas (User, Request, Feedback, etc.)
│   │   ├── routes/              # API router mounts
│   │   ├── services/            # request, assignment, audit, realtime, analytics
│   │   ├── sockets/             # Socket.IO handlers & rooms
│   │   ├── utils/               # Helpers and generators
│   │   ├── validators/          # Input schemas
│   │   └── app.js               # Express application configuration
│   ├── uploads/                 # Local directory for request attachments
│   ├── server.js                # Server entry point & listener
│   ├── package.json
│   └── .env.example
│
├── prd.md                       # Product Requirements Document
├── architecture.md              # Technical Architecture & API specs
├── rules.md                     # Engineering & Coding Standards
├── design.md                    # UI/UX Design System Specification
├── task.md                      # Implementation Roadmap & Task Tracker
├── memory.md                    # Context Memory & Architectural Decisions
├── DEPLOYMENT.md                # Production Deployment & Operations Guide
├── .gitignore                   # Git exclusion rules
├── README.md                    # Project documentation
└── package.json                 # Monorepo root script runner
```

---

## 4. Current Phase Status

> **STATUS: PHASE 11 COMPLETED — READY FOR DEPLOYMENT CONFIGURATION**
>
> All 11 phases have been completed and verified. The application includes production-grade JWT authentication, Role-Based Access Control (`GUEST`, `STAFF`, `ADMIN`, `MANAGER`), the complete 7-stage request lifecycle, real-time Socket.IO room synchronization, Manager analytics with RFC-4180 CSV export, zero security vulnerabilities, hardened seeder safety guards, and 299 passing automated test assertions.

---

## 5. Prerequisites

- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** account or local MongoDB instance

---

## 6. Installation & Setup Instructions

### 1. Clone & Install Dependencies

Run the unified installer from the workspace root:

```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

Alternatively, install each independently:

```bash
# Root dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..

# Frontend dependencies
cd client && npm install && cd ..
```

### 2. Environment Configuration

#### Backend Setup (`server/`)

Copy the environment template:

```bash
cp server/.env.example server/.env
```

Inspect `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://kuntipatel19_db_user:YOUR_DB_PASSWORD@project1.zopmlnq.mongodb.net/hotel_service_platform?retryWrites=true&w=majority&appName=project1
JWT_SECRET=hotel_service_hub_jwt_super_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

> **IMPORTANT MONGODB ATLAS NOTE**:
> Replace `YOUR_DB_PASSWORD` with your actual MongoDB Atlas database user password. The application includes safe diagnostic logging and will start in standby mode if the placeholder password is kept.

#### Frontend Setup (`client/`)

Copy the environment template:

```bash
cp client/.env.example client/.env
```

Inspect `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 7. Development Execution Commands

### Run Both Frontend & Backend Concurrently

From the project root:

```bash
npm run dev
```

### Run Services Independently

- **Backend only**:

  ```bash
  npm run dev:server
  # or: cd server && npm run dev
  ```

  Runs at: `http://localhost:5000`

- **Frontend only**:

  ```bash
  npm run dev:client
  # or: cd client && npm run dev
  ```

  Runs at: `http://localhost:5173`

### Database Seeding Command

To seed initial hotel taxonomy, rooms, and demo accounts in development:

```bash
# Protected by destructive purge guard — requires explicit --force flag
node server/scripts/seed.js --force
```

### Development Demo Accounts

The database seeder populates the following accounts (passwords securely hashed with bcrypt):

| Role | Email | Password | Assigned Context |
| :--- | :--- | :--- | :--- |
| **Guest** | `guest@hotelhub.com` | `guest123` | Room 201 (Deluxe, Floor 2) |
| **Staff (Housekeeping)** | `staff.hk@hotelhub.com` | `staff123` | Housekeeping Department |
| **Staff (Maintenance)** | `staff.maint@hotelhub.com` | `staff123` | Maintenance Department |
| **Staff (Room Service)** | `staff.dining@hotelhub.com` | `staff123` | Room Service Department |
| **Staff (Transportation)** | `staff.trans@hotelhub.com` | `staff123` | Transportation Department |
| **Staff (Front Desk)** | `staff.front@hotelhub.com` | `staff123` | Front Desk Department |
| **Admin** | `admin@hotelhub.com` | `admin123` | Full Hotel Operations Oversight |
| **Manager** | `manager@hotelhub.com` | `manager123` | Executive Analytics & SLA Metrics |

---

## 8. Automated Verification & Test Suites

The project contains 9 automated test suites spanning all modules and user roles (299+ passing test assertions):

```bash
cd server
node scripts/verify-models.js        # 8/8 models, schemas, and db utilities
node scripts/verify-auth.js          # Authentication, JWT, and RBAC
node scripts/verify-requests.js      # Request state machine & business logic
node scripts/verify-guest-portal.js  # Guest portal lifecycle, tracking, feedback
node scripts/verify-staff-portal.js  # Staff department queues & work actions
node scripts/verify-admin-portal.js  # Administrative management & dispatching
node scripts/verify-analytics.js     # Manager analytics & formula injection
node scripts/verify-sockets.js       # Real-time WebSocket room delivery
node scripts/verify-phase11-e2e.js   # Phase 11 final end-to-end integration
```

---

## 9. API Health Check Verification

The backend exposes a standardized public health check:

```http
GET http://localhost:5000/api/health
```

**Response**:

```json
{
  "success": true,
  "message": "Hotel Service Hub API is running",
  "environment": "development",
  "database": "connected",
  "timestamp": "2026-10-27T12:51:46.483Z"
}
```

---

## 10. Deployment & Operations

For complete staging, production configuration, and cloud deployment guides, see:

- [DEPLOYMENT.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/DEPLOYMENT.md) — Prerequisites, production variables, Nginx config, smoke tests, and troubleshooting.

---

## 11. Project Governance Documents

Before contributing, review the authoritative project guidelines:

- [prd.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/prd.md) — Product specifications, user roles, service catalog.
- [architecture.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/architecture.md) — Schemas, REST endpoints, Socket.IO contracts.
- [rules.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/rules.md) — Coding conventions, security rules, state machine constraints.
- [design.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/design.md) — Color tokens, typography, component guidelines.
- [task.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/task.md) — Roadmap milestones and task progress.
- [memory.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/memory.md) — Architecture decisions and session history.
- [DEPLOYMENT.md](file:///Users/ramji/Downloads/hotel-service-platform-spec/DEPLOYMENT.md) — Production deployment and operations guide.
