# RIZE OS — Demo Script (15 Minutes)

## Setup (Before Recording)
1. Run `docker compose up --build` and confirm all 3 containers are healthy
2. Seed the database: `docker compose exec backend npx prisma db seed`
   - This creates 1 org, 5 employees, and 31 tasks spread across 5 months
3. Open browser to `http://localhost:5173`
4. Have MetaMask installed with **Ethereum Sepolia** testnet configured (optional for Web3 section)

---

## Demo Flow

### Intro (0:00 – 1:30)
- Show the **landing/login page** — highlight the glassmorphic dark theme
- Briefly explain: "RIZE OS is an AI-powered HRMS with blockchain-verified work records"
- Point out the admin/employee role separation

### Admin Login & Dashboard (1:30 – 4:00)
- Log in as **admin@acmetech.com** / **password123**
- Walk through the 4 stats cards: Total Employees, Completed Tasks, In Progress, Avg AI Score
- Show the **employee table** — click into an employee profile
- Show the **department breakdown** with progress bars
- Highlight the **Top Performers** panel

### AI Scoring Deep Dive (4:00 – 7:00)
- On an employee profile, click **"Generate Insights"**
- Watch the score circle animate and the breakdown bars fill
- Explain the formula: `Score = (Completion × 0.5) + (Speed × 0.3) + (Complexity × 0.2)`
- **Call out the speed scoring**: "We grade whether the deadline was hit, not how much time was left over — completing a 10-day task on day 9 is a 100%, not 10%"
- Show the **Trend Predictor** — Improving / Stable / Declining based on month-over-month scores
- Show the **AI Insights panel** — performance tier, narrative summary, suggested skills
- Note the "Demo Mode" badge (mock fallback when no API key is set)
- Mention: "With a real API key, this calls Claude/OpenAI for personalized insights per employee"

### Task Kanban Board (7:00 – 10:30)
- Navigate to the **Task Board**
- Show the three columns: Assigned, In Progress, Completed — with live task counts
- **Demonstrate filters**: type in the search bar to filter tasks by title or assignee; use the complexity dropdown; use the employee dropdown (admin only)
  - Show the active filter count badge and "Clear" button
- **Drag a task** from "Assigned" to "In Progress" — notice the smooth animation
- **Click a task card** to open the detail modal:
  - Shows deadline, complexity, assigned employee
  - **AI Smart Assignment panel** — recommend the best-fit employee by score, availability, and complexity
  - **Audit Reference section** — shows DB UUID and on-chain keccak256 hash with copy buttons
- **Create a new task**: fill title, description, deadline, complexity, use "AI Recommend" to pick assignee
- Explain: "Employees only see their own tasks; admins see everything"

### Web3 Blockchain Logging (10:30 – 13:00)
- Explain: "When a task is marked complete, we hash the UUID and log it on Ethereum Sepolia"
- **Drag a task to "Completed"**
- (If MetaMask is set up) Show the MetaMask signing popup → confirm the transaction
- Watch the status banner: Connecting wallet → Signing → Saving to database
- Show the ✅ **"On-chain verified"** badge appear on the task card
- Click the task → show the **Blockchain Proof** panel with TX hash and Etherscan link
- Open Sepolia Etherscan to validate the on-chain record
- (If no MetaMask) Walk through the Solidity contract and explain the fallback path

### Architecture & Codebase (13:00 – 14:30)
- Quick terminal tour:
  - `docker compose ps` — show all 3 containers running
  - Show **`schema.prisma`** — Organization, Employee, Task models (including `completedAt DateTime?`)
  - Point out the **three composite indices** on Task (`organizationId`, `employeeId`, `status`) — "these are what keep queries fast as data grows"
  - Show **`scoringEngine.js`** — binary deadline check, end-of-day fix, early-finish bonus
  - Show **`trendPredictor.js`** — month-over-month bucketing with linear regression
  - Show **`WorkforceLogger.sol`** — minimal, gas-efficient contract (events not storage)

### Scalability Thinking (14:30 – 16:00)
Explain how RIZE OS is designed to scale to **100K employees / 1M task logs**:

**Database Layer**
- PostgreSQL with **indexed foreign keys** on every hot query path (`employeeId`, `organizationId`, `status`) — the schema already has `@@index` directives
- Multi-tenant isolation is by `organizationId` on every table — easy to shard by org when needed
- `completedAt` and `createdAt` are indexed implicitly via Prisma, enabling range-based archival of old task logs without touching live data

**Backend Layer**
- Stateless Express API — scales horizontally behind a load balancer (e.g., AWS ALB) by adding more container replicas; no shared in-process state
- AI scoring is computed on-demand per request and is O(n tasks per employee) — can be pre-computed on a nightly cron and cached in the `aiScore` column (already in schema)
- Trend prediction uses simple arithmetic (linear regression) — negligible CPU cost even for 1,000 tasks per employee

**Blockchain Layer**
- `WorkforceLogger.sol` emits **events, not storage** — event data lives in Ethereum's bloom filter logs, costing ~1,500–3,000 gas per log vs. ~20,000+ gas for `SSTORE`. At 1M task completions, total gas cost stays manageable.
- Contract is org-indexed: `orgId` is an indexed Solidity event parameter, so any org can filter their own logs directly from an RPC node without a centralised database query

**Infrastructure**
- Docker Compose today → swap for **Kubernetes** (EKS/GKE) when multi-region is needed
- PostgreSQL → **Aurora PostgreSQL** for auto-scaling read replicas
- AI insight calls are rate-limited and cached; swap to a queue (BullMQ, already used in Bob's seed tasks) for async processing under load

### Closing (16:00 – 17:00)
- Recap: "Full-stack HRMS with deterministic AI scoring, LLM skill gap detection, trend prediction, and a blockchain audit trail — built to scale"
- Highlight key differentiators: explainable scoring formula, verifiable proof-of-work per employee, architecture ready for enterprise load
- Mention the **SaaS pricing model** in PITCH.md
- Call to action: "Star the repo and try the live demo"

