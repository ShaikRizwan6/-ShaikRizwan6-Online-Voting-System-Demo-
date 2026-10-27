# Online Voting System (Demo)

A production-ready, secure, and responsive web application designed for academic evaluation, final year capstone demonstrations, and technical placement interviews. Built using **Node.js LTS**, **Express.js (CommonJS)**, **MySQL 8**, **Bootstrap 5**, **Chart.js**, and **Vanilla JavaScript**.

---

## Key Features

1. **Role-Based Access Control (RBAC):**
   - **Administrator:** Full administrative dashboard, election lifecycle management (Draft, Published, Closed), candidate roster curation, voter state monitoring and activation toggling.
   - **Voter:** Transparent voter dashboard, active election overview, real-time balloting, one-vote guarantee, and live results inspection.

2. **ACID Transactional Voting Engine:**
   - Every cast ballot is protected by a MySQL transaction (`START TRANSACTION ... COMMIT`).
   - Strict database-enforced integrity via composite unique constraint `(election_id, voter_id)`.
   - Double-voting attempts trigger immediate rollback and return an HTTP `409 Conflict`.
   - Server-side time window validation prevents early or late voting.

3. **Enterprise-Grade Security:**
   - Passwords hashed using `bcrypt` (10 rounds).
   - Stateful session management using `express-session` with `express-mysql-session` storage.
   - HTTP-only, SameSite lax cookies.
   - Brute-force rate limiting on authentication routes.
   - CSRF protection for all state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
   - HTTP security headers with `helmet`.
   - Centralized error handler preventing stack trace leakage.

4. **Interactive Visualizations:**
   - Dynamic bar and doughnut charts powered by **Chart.js** displaying live candidate standings and percentages.

---

## Project Structure

```
online-voting-system/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── server.js
├── config/
│   └── db.js
├── database/
│   ├── schema.sql
│   └── seed.sql
├── middleware/
│   ├── admin.js
│   ├── auth.js
│   ├── csrf.js
│   └── errorHandler.js
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── candidateController.js
│   ├── electionController.js
│   └── voteController.js
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── candidateRoutes.js
│   ├── electionRoutes.js
│   └── voteRoutes.js
├── public/
│   ├── about.html
│   ├── admin-dashboard.html
│   ├── election-details.html
│   ├── index.html
│   ├── login.html
│   ├── manage-candidates.html
│   ├── manage-elections.html
│   ├── manage-voters.html
│   ├── register.html
│   ├── results.html
│   ├── vote-confirmation.html
│   ├── voter-dashboard.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── admin.js
│       ├── api.js
│       ├── auth.js
│       ├── elections.js
│       ├── main.js
│       ├── results.js
│       ├── voter.js
│       └── voting.js
└── tests/
    ├── auth.test.js
    ├── elections.test.js
    └── voting.test.js
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL Server**: v8.0 or higher
- **npm**: v9.0.0 or higher

### Step 1: Clone or Navigate to the Workspace
```bash
cd online-voting-system
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and configure your MySQL credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=online_voting_system
SESSION_SECRET=your_custom_long_random_session_secret
```

### Step 4: Initialize the Database
Open MySQL CLI or your preferred database client (e.g., MySQL Workbench, phpMyAdmin) and run:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p online_voting_system < database/seed.sql
```

### Step 5: Start the Application
- **Production mode:**
  ```bash
  npm start
  ```
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Default Seed Demo Credentials

| Role | Full Name | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **System Administrator** | System Administrator | `admin@voting.local` | `AdminPassword123!` |
| **Registered Voter 1** | Alice Johnson | `alice@voting.local` | `VoterPass123!` |
| **Registered Voter 2** | Bob Smith | `bob@voting.local` | `VoterPass123!` |
| **Registered Voter 3** | Carol Williams | `carol@voting.local` | `VoterPass123!` |
| **Registered Voter 4** | David Brown | `david@voting.local` | `VoterPass123!` |
| **Registered Voter 5** | Eva Martinez | `eva@voting.local` | `VoterPass123!` |

*(Note: The login page includes quick-fill convenience buttons for quick demonstration during placement presentations.)*

---

## REST API Reference

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register voter account (`role` strictly set to `voter`) |
| `POST` | `/api/auth/login` | Public | Authenticate user & regenerate session |
| `POST` | `/api/auth/logout` | Authenticated | Destroy session & clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user session metadata |
| `GET` | `/api/auth/csrf` | Public | Fetch CSRF token for request signing |
| `GET` | `/api/elections` | Authenticated | List elections (filtered by user role) |
| `GET` | `/api/elections/:id` | Authenticated | Fetch election details and candidate list |
| `POST` | `/api/elections` | Admin | Create a new election |
| `PUT` | `/api/elections/:id` | Admin | Update election details |
| `PATCH` | `/api/elections/:id/status` | Admin | Update status (`draft`, `published`, `closed`) |
| `DELETE` | `/api/elections/:id` | Admin | Delete an election |
| `GET` | `/api/elections/:id/candidates` | Authenticated | List candidates for an election |
| `POST` | `/api/elections/:id/candidates` | Admin | Add a candidate to an election |
| `PUT` | `/api/candidates/:id` | Admin | Update candidate information |
| `DELETE` | `/api/candidates/:id` | Admin | Remove a candidate |
| `POST` | `/api/elections/:id/vote` | Voter | Cast ballot (transaction protected) |
| `GET` | `/api/elections/:id/my-status` | Voter | Check voting status for an election |
| `GET` | `/api/elections/:id/results` | Authenticated | Fetch vote count, standings, and percentages |
| `GET` | `/api/admin/dashboard` | Admin | Overview statistics (voters, elections, votes) |
| `GET` | `/api/admin/voters` | Admin | List registered voters |
| `PATCH` | `/api/admin/voters/:id/status` | Admin | Toggle voter active state (`is_active`) |

---

## Running the Automated Test Suite

The project includes unit and integration tests covering authentication, role-based protection, and transactional voting integrity using the native Node.js test runner (`node:test`) and `supertest`:

```bash
npm test
```
