# RIZE OS

**AI-Powered HRMS with Blockchain Activity Logging**

An enterprise workforce management platform featuring AI productivity scoring, LLM-driven skill gap detection, trend prediction, and immutable on-chain task verification via Ethereum Sepolia.

---
### Official Deliveribles
- **Product Demo** (15-20 min): [Insert Loom/YouTube Link Here](https://youtube.com)
- **Frontend**: [https://mini-ai-hrms-lyart.vercel.app/](https://mini-ai-hrms-lyart.vercel.app/)
- **Backend API**: [https://mini-ai-hrms-human-resource-management.onrender.com](https://mini-ai-hrms-human-resource-management.onrender.com)
- **Smart Contract (Sepolia)**: 0xF82Fa39323c68F13125B3F8278028614C13fF537
---

## 🗺️ Project Navigation Hub (Reviewer Guide)
To make reviewing this assessment as explicitly clear as possible, here is a central map to the requested deliverables within this repository:
- **🚀 Running the App:** Detailed instructions (both Docker Compose and Local) are in the [Quick Start](#quick-start) section below.
- **⛓️ Smart Contracts (Web3):** The Solidity smart contract (`WorkforceLogger.sol`) used for Sepolia testnet logging lives strictly in the `contracts/` directory.
- **🧠 AI Logic & Services:** 
  - LLM Integration & Deterministic Fallback: `backend/src/services/insightGenerator.js`
  - Mathematical Scoring Engine: `backend/src/services/scoringEngine.js`
  - *Read the [AI Workforce Intelligence](#-ai-workforce-intelligence) section below for a summary of the AI features and their logic.*
- **📈 GTM Strategy:** My Go-To-Market and premium enterprise monetization plans are located in `PITCH.md`.
- **🎬 Demo Script:** The precise, verbatim script used for the video presentation is saved in `DEMO_SCRIPT.md`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL (JSONB for dynamic skills) |
| Frontend | React 18, Vite, Tailwind CSS |
| AI | Groq (Llama-3.3-70b) / OpenAI API (with deterministic fallback) |
| Web3 | Solidity, Hardhat, Ethereum Sepolia (Etherscan), ethers.js |
| Infra | Docker Compose |

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local development)

### 1. Clone & Configure
```bash
git clone [https://github.com/RGK1305/Mini-AI-HRMS-Human-Resource-Management-System-](https://github.com/RGK1305/Mini-AI-HRMS-Human-Resource-Management-System-)
cd RIZE_OS
cp .env.example .env
# Edit .env with your keys (optional — app works without them)
```

### 2. Run with Docker
```bash
docker compose up --build
```
This starts PostgreSQL, the Express API (port 5000), and the React frontend (port 5173).

### 3. Run Locally (without Docker)
```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed        # Seeds 5 employees & 31 tasks across 5 months
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 4. Access the App locally
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/health
- **Admin login**: `admin@acmetech.com` / `password123`
- **Employee login**: `alice@acmetech.com` / `password123`


---

## Features

### 🏢 HRMS Core
- JWT authentication with admin/employee role separation
- Organization management with **multi-tenant data isolation**
- Employee profiles with dynamic skills (JSONB)
- Full CRUD for employees and tasks

### 📋 Task Kanban Board
- Drag-and-drop task management (Assigned → In Progress → Completed)
- Task creation with deadline, complexity, and AI-assisted employee assignment
- **Search & filter bar** — filter by title/description/assignee (debounced), complexity level, and employee (admin only)
- Active filter count badge with one-click clear
- Completed column is locked (tasks cannot be moved back)
- **Task detail modal with full audit reference (DB UUID + keccak256 on-chain hash)**

### 🧠 AI Workforce Intelligence
- **Productivity Score**: `(Completion Rate × 0.5) + (Speed vs Deadline × 0.3) + (Avg Complexity × 0.2)`
  - Speed scoring is **binary**: finishing on or before the deadline = 100. Early finish (< 50% of allotted time) = 110 bonus. Late = proportional penalty.
  - Deadline comparison uses **end-of-day (23:59:59)** to prevent midnight false-lates.
- **Trend Predictor**: calculates month-over-month score trajectory (Improving / Stable / Declining) — requires ≥ 5 completed tasks across ≥ 2 months
- **Skill Gap Detection (Powered by Groq/Llama-3)**: Fast, free LLM inference analyzes employee roles and completed tasks to suggest missing technical skills, prioritizing high-ROI learning paths without compromising application speed.
- **Performance Narrative**: Synthesizes the raw productivity score and completion rate into a 2-3 sentence performance review suitable for HR dashboards.
- **AI Smart Assignment**: ranks employees by productivity score(x0.5), availability(x0.4), and complexity fit(x0.1) when creating or reassigning a task
- **Dashboard Analytics**: department averages, top performers, org-wide metrics
- **Graceful Fallback**: mock insights when no API key is configured

### ⛓️ Web3 Activity Logger
- Solidity `WorkforceLogger` contract on **Ethereum Sepolia** testnet
- MetaMask integration for signing task completions
- keccak256 hashing of task UUIDs for on-chain privacy
- Transaction hash stored in PostgreSQL (`onChainTxHash`) as proof-of-work
- Direct links to **Sepolia Etherscan** explorer
- Task detail modal shows both DB UUID and on-chain bytes32 hash with copy buttons

**Multi-Tenant Web3 Security & Privacy:**
To ensure absolute data privacy across different organizations (tenants), **no plain-text employee or task data is ever pushed to the public blockchain**. 
1. The backend combines the `Task ID`, `Employee ID`, the `Organization Name`, and a secret server-side `SALT`.
2. This string is hashed using `keccak256` before it ever leaves the backend.
3. The frontend only receives the `bytes32` hash, which the user subsequently logs on-chain via MetaMask.
4. This ensures immutable proof-of-work while guaranteeing that competitor organizations cannot reverse-engineer employee identities, task descriptions, or workload volumes from the public ledger.

---

## Scoring Engine Details

```
Score = (completionRate × 0.5) + (speedScore × 0.3) + (complexityScore × 0.2)
```

| Component | Calculation |
|---|---|
| `completionRate` | `(COMPLETED tasks / total tasks) × 100` |
| `speedScore` | Binary: 100 if on-time, 110 if early (<50% of window), 0–100 penalty if late |
| `complexityScore` | `(avgComplexity / 5) × 100` — higher difficulty = higher score |

The `completedAt` timestamp is recorded in PostgreSQL whenever a task transitions to `COMPLETED` (both Web3 and non-Web3 paths). Deadlines are evaluated at **23:59:59** of the due date.

---

## Project Structure
```
RIZE_OS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Organization, Employee, Task models
│   │   └── seed.js          # 5 employees, 31 tasks across 5 months
│   ├── src/
│   │   ├── middleware/       # JWT auth
│   │   ├── routes/           # auth, employees, tasks, ai
│   │   └── services/
│   │       ├── scoringEngine.js     # Productivity score calculation
│   │       ├── insightGenerator.js  # LLM skill gap & narrative
│   │       └── trendPredictor.js    # Month-over-month trend analysis
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Navbar, StatsCard
│   │   ├── context/      # AuthContext
│   │   ├── lib/          # API client (api.js), Web3 utils (web3.js)
│   │   └── pages/        # Login, Register, Dashboard, KanbanBoard, Profile
│   └── Dockerfile
├── contracts/
│   ├── WorkforceLogger.sol
│   ├── hardhat.config.js
│   └── scripts/deploy.js
├── docker-compose.yml
├── PITCH.md              # SaaS GTM strategy
└── DEMO_SCRIPT.md        # 15-min demo walkthrough
```

## Smart Contract Deployment

```bash
cd contracts
npm install
# Set DEPLOYER_PRIVATE_KEY and SEPOLIA_RPC_URL in .env
npx hardhat run scripts/deploy.js --network sepolia
# Copy the deployed address to VITE_CONTRACT_ADDRESS in frontend/.env
```

---

## License
MIT
