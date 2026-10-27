# HOTEL SERVICE HUB — DEPLOYMENT & OPERATIONS GUIDE

This document provides complete instructions for verifying, staging, and deploying **Hotel Service Hub** to production hosting platforms (e.g., Render, Railway, AWS ECS, DigitalOcean, Heroku, or self-hosted Linux VPS).

---

## 1. Prerequisites

Before deploying the application, ensure the host environment meets the following baseline requirements:

| Component | Minimum Requirement | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | `>= 18.x` | `20.x LTS` or `24.x LTS` | Tested and verified on Node.js v24 |
| **Package Manager** | `npm 9+` or `pnpm 8+` | `npm` | Use `npm ci` for deterministic production installs |
| **Database** | MongoDB Atlas v6.0+ | MongoDB Atlas M0/M10+ | Requires replica set / Atlas cluster for transactions |
| **WebSockets** | Supported | Supported | Platform must support persistent WebSocket upgrades |
| **SSL / TLS** | HTTPS / WSS | HTTPS / WSS | Required for production security, cookies, and tokens |

---

## 2. Environment Variables Configuration

Both the frontend client and backend server rely on strict, non-colliding environment configurations. **Never commit `.env` files into source control.**

### Backend (`server/.env`)

| Variable | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `production` | Enables production optimizations, disables verbose stack traces |
| `PORT` | Number | `5000` | Port on which Express and Socket.IO bind (assigned by host) |
| `MONGODB_URI` | URI | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | MongoDB Atlas connection string with write replica parameters |
| `JWT_SECRET` | String | *High-entropy 64+ char string* | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Token expiration duration (e.g., `7d`, `24h`) |
| `CLIENT_URL` | URL | `https://hotel.yourdomain.com` | Allowed CORS origin for frontend requests & WebSockets |
| `ADMIN_EMAIL` | Email | `admin@hotelhub.com` | Superadmin bootstrap email |
| `GOOGLE_CLIENT_ID` | String | `260274094...apps.googleusercontent.com` | Optional: Google OAuth Client ID for Google login |
| `ALLOW_SEED_PURGE` | Boolean | `false` | Production guard: prevents database wiping during seeding |

### Frontend (`client/.env`)

| Variable | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | URL | `https://api.yourdomain.com` | Base URL for Express REST API & Socket.IO endpoint |

---

## 3. Local Verification & Staging Workflow

Execute the following commands to confirm stability prior to committing or deploying:

```bash
# 1. Install dependencies deterministically
cd server && npm ci
cd ../client && npm ci

# 2. Run the complete test suite
cd ../server
node scripts/verify-models.js
node scripts/verify-auth.js
node scripts/verify-requests.js
node scripts/verify-guest-portal.js
node scripts/verify-staff-portal.js
node scripts/verify-admin-portal.js
node scripts/verify-analytics.js
node scripts/verify-sockets.js
node scripts/verify-phase11-e2e.js

# 3. Test frontend production bundle build
cd ../client
npm run build

# 4. Verify backend startup & health check
cd ../server
npm start # or node server.js
curl -s http://localhost:5000/api/health
```

Expected health check response:

```json
{
  "success": true,
  "message": "Hotel Service Hub API is running",
  "environment": "production",
  "database": "connected",
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

---

## 4. Production Deployment Architectures

Hotel Service Hub supports two standard deployment topologies:

### Topology A: Decoupled Services (Recommended for Scale)

- **Frontend**: Hosted on CDN / static edge (e.g., Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront).
  - Build command: `cd client && npm run build`
  - Output directory: `client/dist`
  - Environment variable: `VITE_API_URL=https://api.yourdomain.com`
- **Backend API**: Hosted on PaaS or container service (e.g., Render, Railway, AWS App Runner, ECS, Fly.io).
  - Working directory: `server`
  - Start command: `node server.js`
  - Environment variables: `NODE_ENV=production`, `PORT=5000`, `CLIENT_URL=https://hotel.yourdomain.com`, etc.

### Topology B: Monolithic Reverse-Proxy (Single VPS / Docker)

- Node.js server runs on port 5000 with Nginx as reverse proxy.
- Nginx handles TLS termination, serves `client/dist` statically for `/`, and proxies `/api` and `/socket.io` to `http://127.0.0.1:5000`.

Sample Nginx Configuration:

```nginx
server {
    listen 80;
    server_name hotel.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hotel.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/hotel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hotel.yourdomain.com/privkey.pem;

    root /var/www/hotel-service-hub/client/dist;
    index index.html;

    # Static frontend with SPA client-side routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend Express REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Real-Time WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Security & Hardening Checklist

Prior to launching in a public production environment, confirm all items below:

1. **MongoDB Atlas IP Access List**:
   - Do NOT use `0.0.0.0/0` in production.
   - Restrict Network Access in MongoDB Atlas to the specific static egress IP addresses of your backend servers or use VPC Peering / PrivateLink.
2. **Secrets Hygiene**:
   - Ensure `JWT_SECRET` is at least 64 characters generated with a cryptographically secure random generator (e.g. `openssl rand -hex 32`).
   - Confirm `.env` files are not present in git tracked files (`git status --ignored`).
3. **CORS Origin Restriction**:
   - `CLIENT_URL` must match the exact production domain (e.g., `https://hotel.yourdomain.com`). Never set `CLIENT_URL=*` when credentials are enabled.
4. **Data Destruction Guards**:
   - Database seeder `scripts/seed.js` includes an explicit purge guard: requires `--force` and refuses execution when `NODE_ENV=production`.
5. **CSV Formula Injection Defense**:
   - All manager reports exported via `/api/analytics/export` sanitize cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prepending a single quote (`'`).
6. **Information Disclosure Prevention**:
   - `X-Powered-By` Express header is disabled.
   - Production error handler suppresses database error messages and stack traces.

---

## 6. Post-Deployment Smoke Test Protocol

Perform the following manual and automated sanity checks immediately after deployment:

1. **Health Verification**:
   - Visit `GET https://api.yourdomain.com/api/health` — must return status 200 with `"database": "connected"`.
2. **Authentication Flow**:
   - Navigate to frontend and log in as Guest, Staff, Admin, and Manager. Verify JWT tokens are stored securely and navigation guards redirect to the appropriate portal.
3. **End-to-End Request Flow**:
   - Guest creates a Housekeeping request.
   - Verify request appears in Staff department queue and/or auto-assigns.
   - Staff accepts ticket (`ASSIGNED` $\to$ `ACCEPTED`).
   - Staff starts work (`ACCEPTED` $\to$ `IN_PROGRESS`).
   - Staff completes work (`IN_PROGRESS` $\to$ `COMPLETED`).
   - Guest confirms completion (`COMPLETED` $\to$ `CONFIRMED`).
   - Guest submits feedback with rating 1–5.
4. **Real-time WebSockets**:
   - Open two browser tabs (Guest and Staff). Verify status changes trigger instant toast notifications and card movements without requiring a manual page refresh.
5. **Manager Analytics**:
   - Open Manager portal. Verify Overview KPIs, Request Trends, Department Summary, and CSV export functionality.

---

## 7. Troubleshooting & FAQ

### Issue 1: "MongooseServerSelectionError: connect ECONNREFUSED"

- **Cause**: Server cannot reach MongoDB Atlas.
- **Fix**: Verify your Atlas cluster is active, credentials in `MONGODB_URI` are correct, and the hosting provider's IP is added to the Atlas IP Access List.

### Issue 2: "CORS error: No 'Access-Control-Allow-Origin' header is present"

- **Cause**: Mismatch between client domain and `CLIENT_URL` configured on the backend.
- **Fix**: Ensure `CLIENT_URL` in `server/.env` exactly matches the URL in the browser address bar (including protocol `https://` and excluding trailing slashes).

### Issue 3: "WebSocket connection to 'wss://.../socket.io/' failed"

- **Cause**: Host proxy or load balancer does not support or proxy HTTP Upgrade headers.
- **Fix**: Verify Nginx or cloud load balancer has WebSocket support enabled (see Nginx configuration above). The client includes automatic REST fallback if WebSockets are unreachable.

### Issue 4: "JWT_SECRET configuration is missing on server"

- **Cause**: Backend started without required environment variables.
- **Fix**: Verify host platform environment dashboard contains `JWT_SECRET`.
