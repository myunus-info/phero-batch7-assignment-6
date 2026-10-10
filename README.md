# DevJudge API — Developer Assessment & Live Coding Platform Backend

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.x-lightgrey.svg?logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.x-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

**DevJudge API** is an enterprise-grade backend service built for automated technical recruitment, developer assessment, and live coding challenges. It provides a full lifecycle workflow: recruiters author algorithmic coding challenges and multiple-choice questions, build timed assessments with custom grading thresholds, purchase candidate invitation credit packs via Stripe, and review candidate performance. Candidates take secure assessments with a sandboxed Node.js test execution runner, while platform administrators maintain governance, inspect real-time audit logs, and oversee system metrics.

---

## Table of Contents

- [DevJudge API — Developer Assessment & Live Coding Platform Backend](#devjudge-api--developer-assessment--live-coding-platform-backend)
  - [Table of Contents](#table-of-contents)
  - [Architecture & System Flow](#architecture--system-flow)
  - [Core Features](#core-features)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Tech Stack & Dependencies](#tech-stack--dependencies)
  - [Data Model & Prisma Schema](#data-model--prisma-schema)
  - [Code Evaluation & Execution Engine](#code-evaluation--execution-engine)
  - [Project Structure](#project-structure)
  - [Environment Variables](#environment-variables)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Database Setup & Migration](#database-setup--migration)
    - [Running the App](#running-the-app)
  - [Pre-Seeded Demo Accounts](#pre-seeded-demo-accounts)
  - [API Reference](#api-reference)
    - [1. Authentication Module (`/api/v1/auth`)](#1-authentication-module-apiv1auth)
    - [2. User Module (`/api/v1/users`)](#2-user-module-apiv1users)
    - [3. Problem Management Module (`/api/v1/problems`)](#3-problem-management-module-apiv1problems)
    - [4. Assessment Module (`/api/v1/assessments`)](#4-assessment-module-apiv1assessments)
    - [5. Candidate Attempt & Evaluation Module (`/api/v1/attempts`)](#5-candidate-attempt--evaluation-module-apiv1attempts)
    - [6. Payment & Recruiter Credits Module (`/api/v1/payments`)](#6-payment--recruiter-credits-module-apiv1payments)
    - [7. Admin Governance Module (`/api/v1/admin`)](#7-admin-governance-module-apiv1admin)
  - [Security & Architectural Highlights](#security--architectural-highlights)
  - [Available NPM Scripts](#available-npm-scripts)
  - [Troubleshooting & FAQ](#troubleshooting--faq)
  - [License](#license)

---

## Architecture & System Flow

The system employs a layered, domain-driven Express + TypeScript architecture. Cross-cutting concerns like JWT authorization, Zod schema validation, audit logging, and rate limiting surround modular business services.

```mermaid
flowchart TD
    Client["Client Applications\n(Web / Assessment Portal / Admin UI)"]
    
    subgraph Gateway ["Express 5 Application Gateway"]
        Security["Helmet & CORS & Cookie Parser"]
        RateLimit["Rate Limiting\n(Global & Auth Limiter)"]
        Router["Module Router\n(/api/v1)"]
        AuthMiddleware["Auth Middleware\n(JWT & Role Verification)"]
        ZodValidation["Zod Request Validator"]
    end

    subgraph Modules ["Domain Service Modules"]
        AuthModule["Auth Service\n(Bcrypt / Google OAuth / JWT)"]
        ProblemModule["Problem Service\n(MCQ & Coding Problems)"]
        AssessmentModule["Assessment Service\n(Scheduling & Credits)"]
        AttemptModule["Attempt Service\n(Submissions & Scoring)"]
        PaymentModule["Payment Service\n(Stripe Checkout & Webhooks)"]
        AdminModule["Admin Service\n(Metrics & Audit Logs)"]
    end

    subgraph Runtime ["Execution Engine"]
        Runner["Node.js Subprocess Runner\n(spawnSync / Sandbox / Stdin Caching)"]
    end

    subgraph Persistence ["Persistence Layer"]
        PrismaClient["Prisma ORM v7 (@prisma/adapter-pg)"]
        Postgres[(PostgreSQL Database)]
        AuditLogStore[(Audit Logs)]
    end

    Client --> Security --> RateLimit --> Router --> AuthMiddleware --> ZodValidation
    ZodValidation --> AuthModule
    ZodValidation --> ProblemModule
    ZodValidation --> AssessmentModule
    ZodValidation --> AttemptModule
    ZodValidation --> PaymentModule
    ZodValidation --> AdminModule

    AttemptModule --> Runner
    
    AuthModule --> PrismaClient
    ProblemModule --> PrismaClient
    AssessmentModule --> PrismaClient
    AttemptModule --> PrismaClient
    PaymentModule --> PrismaClient
    AdminModule --> PrismaClient

    PrismaClient --> Postgres
    PrismaClient --> AuditLogStore
```

---

## Core Features

- **Multi-Role Authentication**: Email/Password registration, bcrypt hashing (12 rounds), Google OAuth 2.0 social sign-in, JWT access (7d) & refresh (30d) tokens, and HTTP-only cookie support.
- **Problem Bank Management**:
  - Support for `CODING`, `MCQ` (multiple selection), and `SINGLE_CHOICE` problems.
  - Difficulty grading: `EASY`, `MEDIUM`, `HARD`.
  - Rich problem schemas containing starter code, hidden/visible test cases, correct answers, and runtime time limits.
  - Role-aware privacy: Candidates viewing problems never see correct answers or hidden test cases.
- **Assessment Management**:
  - Custom multi-problem evaluation sessions with configurable duration, total marks, and passing score thresholds.
  - Granular problem ordering (`orderIndex`) and custom problem weights (`customPoints`).
  - Scheduling constraints with `scheduleStart` and `scheduleEnd` time windows.
  - Candidate invitation system deducting 1 recruiter credit per invitation token.
- **Interactive Code Evaluator**:
  - Dynamic JavaScript/Node.js solution evaluation using isolated child processes (`spawnSync`).
  - Stdin interception and `fs.readFileSync(0, "utf-8")` caching to prevent multiple read consumption issues.
  - Support for both direct standard output logging (`console.log`) and returning values from `solution()` functions.
  - Time Limit Exceeded (TLE) protection (3000ms default per test case).
  - Normalization of carriage returns (`\r\n` vs `\n`) and trailing whitespace for resilient assertion checks.
- **Live Run vs. Final Submit**:
  - `POST /attempts/:id/run-code`: Test execution sandbox returning visible test case feedback without persisting submissions or penalizing attempts.
  - `POST /attempts/:id/submit-problem`: Formal grading against all test cases (both visible and hidden), calculating proportional points and recording database submission state.
  - `POST /attempts/:id/finish`: Automatic overall score aggregation and pass/fail determination.
- **Recruiter Credit System & Stripe Payments**:
  - Credit tiers: `STARTER_PACK` (25 credits, $29), `PRO_PACK` (75 credits, $79), and `ENTERPRISE_PACK` (250 credits, $199).
  - Stripe Checkout Session creation and webhook fulfillment (`checkout.session.completed`).
  - Fallback simulation mode enabling local testing even without active Stripe credentials.
- **Comprehensive Audit Logging**:
  - Automatic audit tracking for high-impact actions (`REGISTER_USER`, `LOGIN_USER`, `CREATE_PROBLEM`, `START_ASSESSMENT`, `SUBMIT_PROBLEM`, `FINISH_ASSESSMENT`, `INVITE_CANDIDATE`, `PAYMENT_COMPLETED`).
- **Administrative Governance**:
  - Platform-wide statistics: total users, candidates, recruiters, problems, assessments, attempts, pass rate percentage, and gross transaction revenue.
  - User role assignment and status control (blocking/reactivating accounts).
  - Detailed audit log filtering and inspection.

---

## Role-Based Access Control (RBAC)

The platform enforces strict role-based authorization:

| Resource / Endpoint | CANDIDATE | RECRUITER | ADMIN |
| :--- | :---: | :---: | :---: |
| Register / Login / Google Auth / Refresh | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Profile View & Update (`/users/me`) | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Browse Public Problems (`GET /problems`) | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| View Problem Details (Hides Secrets) | :white_check_mark: (Sanitized) | :white_check_mark: (Full) | :white_check_mark: (Full) |
| Create / Update / Delete Problems | :x: | :white_check_mark: (Own) | :white_check_mark: (All) |
| Create / Manage Assessments | :x: | :white_check_mark: (Own) | :white_check_mark: (All) |
| Invite Candidates (Requires Credits) | :x: | :white_check_mark: | :white_check_mark: |
| Candidate Assessments (`/attempts/my-assessments`) | :white_check_mark: | :x: | :x: |
| Start / Run / Submit / Finish Attempt | :white_check_mark: | :x: | :x: |
| View Final Attempt Result | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Buy Recruiter Credits (Stripe Checkout) | :x: | :white_check_mark: | :white_check_mark: |
| View Payment History | :x: | :white_check_mark: (Own) | :white_check_mark: (All) |
| Manage User Statuses & Roles | :x: | :x: | :white_check_mark: |
| Platform Analytics Dashboard | :x: | :x: | :white_check_mark: |
| View Audit Logs | :x: | :x: | :white_check_mark: |

---

## Tech Stack & Dependencies

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Language** | Node.js (v20+ recommended), TypeScript (v5.x), ES Modules |
| **Web Framework** | Express.js (v5.2.x) |
| **Database & ORM** | PostgreSQL, Prisma ORM (v7.10.x) with `@prisma/adapter-pg` driver adapter |
| **Authentication & Crypto**| JWT (`jsonwebtoken`), `bcryptjs`, `google-auth-library` |
| **Validation** | Zod (v4.x) |
| **Payments** | Stripe API (`stripe` v22.x) with Checkout Sessions & Webhooks |
| **Security & Utilities** | `helmet`, `cors`, `cookie-parser`, `express-rate-limit`, `morgan`, `http-status` |
| **Bundler & Tooling** | `tsup`, `tsx` (live reloader), Biome (`@biomejs/biome`) for linting & formatting |

---

## Data Model & Prisma Schema

The Prisma configuration is modularized into discrete schema files inside `prisma/schema/` and managed through `prisma7.config.ts`:

```mermaid
erDiagram
    User ||--o| RecruiterProfile : "has"
    User ||--o| CandidateProfile : "has"
    User ||--o{ Problem : "creates"
    User ||--o{ Assessment : "authors"
    User ||--o{ AssessmentCandidate : "assigned as candidate"
    User ||--o{ Submission : "submits"
    User ||--o{ Payment : "initiates"
    User ||--o{ AuditLog : "triggers"

    Assessment ||--o{ AssessmentProblem : "contains"
    Problem ||--o{ AssessmentProblem : "referenced by"
    
    Assessment ||--o{ AssessmentCandidate : "invites"
    AssessmentCandidate ||--o{ Submission : "records"
    Problem ||--o{ Submission : "evaluated against"

    User {
        string id PK
        string email UK
        string password
        UserRole role
        UserStatus status
        boolean isDeleted
        datetime createdAt
    }

    RecruiterProfile {
        string id PK
        string userId FK
        string companyName
        int credits
    }

    CandidateProfile {
        string id PK
        string userId FK
        string headline
        string[] skills
    }

    Problem {
        string id PK
        string title
        string slug UK
        DifficultyLevel difficulty
        ProblemType problemType
        int points
        json testCases
        json correctAnswers
        boolean isDeleted
    }

    Assessment {
        string id PK
        string title
        string recruiterId FK
        int durationMinutes
        int totalMarks
        int passingMarks
        AssessmentStatus status
        boolean isDeleted
    }

    AssessmentProblem {
        string id PK
        string assessmentId FK
        string problemId FK
        int orderIndex
        int customPoints
    }

    AssessmentCandidate {
        string id PK
        string assessmentId FK
        string candidateId FK
        string candidateEmail
        string invitationToken UK
        CandidateAssessmentStatus status
        int totalScore
        boolean isPassed
    }

    Submission {
        string id PK
        string assessmentCandidateId FK
        string problemId FK
        string candidateId FK
        string submittedCode
        json selectedOptions
        json executionResult
        int scoreAwarded
        SubmissionStatus status
    }

    Payment {
        string id PK
        string userId FK
        string stripeSessionId UK
        float amount
        int creditsPurchased
        PaymentStatus status
    }
```

---

## Code Evaluation & Execution Engine

Coding solutions are evaluated dynamically using a sandboxed Node.js runner located at [`src/app/utils/codeEvaluator.ts`](file:///e:/Programming/phero-batch7-course/assignments/assignment-6/src/app/utils/codeEvaluator.ts):

1. **Isolation**: When candidate code is evaluated, the system generates an ephemeral script in the operating system's temp directory (`os.tmpdir()`).
2. **Standard Input Hooking**: Intercepts `fs.readFileSync` for file descriptor `0` (`/dev/stdin`) to allow solutions to read inputs cleanly multiple times.
3. **Console Output Interception**: Wraps `console.log` to buffer output into an internal string stream, while also supporting function return values if candidate exports a `solution(...)` function.
4. **Child Process Execution**: Runs the generated script using Node.js child process `spawnSync`:
   - Configurable timeout (default: 3000 ms) preventing infinite loops.
   - Buffer limit cap (`1024 * 1024` bytes) preventing memory exhaustion.
5. **Output Normalization**: Strips Windows line breaks (`\r\n` $\rightarrow$ `\n`) and trims trailing whitespace across all lines before asserting against `tc.expectedOutput`.
6. **Graceful Cleanup**: The ephemeral script is safely unlinked (`fs.unlinkSync`) inside a `finally` block regardless of pass/fail/error outcome.

---

## Project Structure

```text
assignment-6/
├── prisma/
│   ├── migrations/                  # Database migration history
│   └── schema/                      # Modular Prisma schema definitions
│       ├── schema.prisma            # Root generator & datasource
│       ├── enums.prisma             # Enums: UserRole, ProblemType, etc.
│       ├── user.prisma              # User model
│       ├── recruiter.prisma         # RecruiterProfile model
│       ├── candidate.prisma         # CandidateProfile model
│       ├── problem.prisma           # Problem model
│       ├── assessment.prisma        # Assessment & AssessmentCandidate models
│       ├── submission.prisma        # Candidate Submission model
│       ├── payment.prisma           # Payment model
│       └── auditlog.prisma          # AuditLog model
├── src/
│   ├── app/
│   │   ├── config/                  # Environment variable configuration
│   │   ├── constants/               # Pagination & shared constants
│   │   ├── errors/                  # Custom ApiError, Zod & Prisma error handlers
│   │   ├── lib/                     # Prisma client initialization with pg adapter
│   │   ├── middleware/              # Auth, validation, rate limiting, error handlers
│   │   ├── modules/                 # Domain business modules
│   │   │   ├── admin/               # Admin routes, controller, service
│   │   │   ├── assessment/          # Assessment authoring & invitation
│   │   │   ├── attempt/             # Candidate assessment attempt & evaluation
│   │   │   ├── auth/                # Registration, login, Google auth, tokens
│   │   │   ├── payment/             # Stripe checkout, webhook, credit allocation
│   │   │   ├── problem/             # Problem creation, search, retrieval
│   │   │   └── user/                # Profile management
│   │   ├── routes/                  # Central API router aggregator (/api/v1)
│   │   └── utils/                   # Code evaluator, JWT, seed, audit logger
│   ├── generated/                   # Prisma Client generated artifacts
│   ├── app.ts                       # Express application bootstrap
│   └── server.ts                    # HTTP server startup & graceful shutdown
├── prisma7.config.ts                # Prisma ORM v7 configuration file
├── tsup.config.ts / package.json    # Build configuration & scripts
└── .env                             # Environment configuration
```

---

## Environment Variables

Create a `.env` file in the project root based on the following template:

```env
# Server Runtime
NODE_ENV=development
PORT=5000

# PostgreSQL Connection String (Prisma v7 requires pg adapter)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/devjudge_db?sslmode=prefer"

# Security & Password Hashing
BCRYPT_SALT_ROUNDS=12

# JWT Authentication
JWT_SECRET="super-secret-jwt-access-token-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="super-secret-jwt-refresh-token-key"
JWT_REFRESH_EXPIRES_IN="30d"

# Google Social Sign-In (OAuth Client ID)
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"

# Stripe Payments & Webhooks
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CLIENT_URL="http://localhost:3000"
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **PostgreSQL**: `v15.x` or higher
- **npm** or **pnpm** / **yarn**

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd assignment-6
npm install
```

### Database Setup & Migration

Generate the Prisma client artifacts:

```bash
npx prisma generate
```

Run migrations to apply the schema to your PostgreSQL database:

```bash
npx prisma migrate dev --name init
```

*(Optional)* If you ever need to reset and reapply migrations in development:

```bash
npx prisma migrate reset
```

### Running the App

Start in **development** mode with hot reload:

```bash
npm run dev
```

The server will automatically bootstrap, execute initial database seeds if empty, and listen at:

```text
http://localhost:5000
```

Verify system health:

```bash
curl http://localhost:5000/
```

**Production Build**:

```bash
npm run build
npm start
```

---

## Pre-Seeded Demo Accounts

When the application boots for the first time, `src/app/utils/seed.ts` automatically provisions demo accounts, problem challenges, and a published assessment:

| Role | Email | Password | Initial State / Credits |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@devjudge.com` | `Admin@123456` | Full platform access |
| **Recruiter** | `recruiter@techcorp.com` | `Recruiter@123456` | 50 Candidate Invite Credits, TechCorp Solutions Profile |
| **Candidate** | `candidate@devjudge.com` | `Candidate@123456` | Senior Full Stack Developer profile |

---

## API Reference

All endpoints are mounted under `/api/v1`. Standard API responses follow a uniform JSON structure:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation completed successfully!",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPage": 5
  },
  "data": { ... }
}
```

---

### 1. Authentication Module (`/api/v1/auth`)

#### Register User
`POST /api/v1/auth/register`
- **Rate Limit**: 10 req / 15 min
- **Request Body**:
```json
{
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "password": "Password@123",
  "role": "CANDIDATE",
  "headline": "Full Stack Engineer",
  "skills": ["TypeScript", "Node.js", "React"]
}
```
*(If `role` is `RECRUITER`, pass `companyName` and optional `companyWebsite`)*

#### Login
`POST /api/v1/auth/login`
- **Rate Limit**: 10 req / 15 min
- **Request Body**:
```json
{
  "email": "alex@example.com",
  "password": "Password@123"
}
```
- **Response**: Returns `accessToken`, `refreshToken`, user object, and sets secure HTTP-only cookies.

#### Google Social Login
`POST /api/v1/auth/google`
- **Request Body**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "role": "CANDIDATE"
}
```

#### Refresh Access Token
`POST /api/v1/auth/refresh-token`
- **Request Body / Cookie**: `{ "refreshToken": "<token>" }`

#### Logout
`POST /api/v1/auth/logout`
- Clears `accessToken` and `refreshToken` cookies.

---

### 2. User Module (`/api/v1/users`)

#### Get Current Profile
`GET /api/v1/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Returns authenticated user profile, associated role profile, and activity counts.

#### Update Current Profile
`PATCH /api/v1/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Alex Johnson",
  "avatar": "https://avatar.example.com/alex.png",
  "headline": "Lead Backend Architect",
  "skills": ["Node.js", "PostgreSQL", "Go"]
}
```

---

### 3. Problem Management Module (`/api/v1/problems`)

#### Create Problem
`POST /api/v1/problems`
- **Access**: `ADMIN`, `RECRUITER`
- **Request Body**:
```json
{
  "title": "Two Sum",
  "slug": "two-sum-problem",
  "description": "Given an array of integers nums and target, return indices...",
  "difficulty": "EASY",
  "problemType": "CODING",
  "points": 25,
  "timeLimitSeconds": 300,
  "isPublic": true,
  "starterCode": {
    "javascript": "function twoSum(nums, target) {\n  // Solution\n}"
  },
  "testCases": [
    { "input": "[2,7,11,15], 9", "expectedOutput": "[0,1]", "isHidden": false },
    { "input": "[3,3], 6", "expectedOutput": "[0,1]", "isHidden": true }
  ]
}
```

#### Get All Problems
`GET /api/v1/problems`
- **Query Params**: `searchTerm`, `difficulty`, `problemType`, `isPublic`, `page`, `limit`, `sortBy`, `sortOrder`

#### Get Problem by ID
`GET /api/v1/problems/:id`
- **Access**: Public / Authenticated. Candidates automatically receive sanitized test cases with `correctAnswers` and hidden test cases removed.

#### Update Problem
`PATCH /api/v1/problems/:id`
- **Access**: `ADMIN`, `RECRUITER` (Owner only)

#### Soft Delete Problem
`DELETE /api/v1/problems/:id`
- **Access**: `ADMIN`, `RECRUITER` (Owner only)

---

### 4. Assessment Module (`/api/v1/assessments`)

#### Create Assessment
`POST /api/v1/assessments`
- **Access**: `ADMIN`, `RECRUITER`
- **Request Body**:
```json
{
  "title": "Senior Backend Screening",
  "description": "Comprehensive screening on algorithms and indexing.",
  "durationMinutes": 60,
  "totalMarks": 100,
  "passingMarks": 65,
  "scheduleStart": "2026-10-15T09:00:00.000Z",
  "scheduleEnd": "2026-10-20T18:00:00.000Z",
  "status": "PUBLISHED",
  "problemIds": [
    { "problemId": "problem_cuid_1", "orderIndex": 1, "customPoints": 35 },
    { "problemId": "problem_cuid_2", "orderIndex": 2, "customPoints": 30 }
  ]
}
```

#### List Assessments
`GET /api/v1/assessments`
- **Access**: `ADMIN` (sees all), `RECRUITER` (sees own)
- **Query Params**: `searchTerm`, `status`, `page`, `limit`, `sortBy`, `sortOrder`

#### Get Assessment by ID
`GET /api/v1/assessments/:id`
- **Access**: `ADMIN`, `RECRUITER`, `CANDIDATE`. Candidates receive sanitized problems and cannot view other candidates' records.

#### Update Assessment
`PATCH /api/v1/assessments/:id`
- **Access**: `ADMIN`, `RECRUITER` (Owner only)

#### Soft Delete Assessment
`DELETE /api/v1/assessments/:id`
- **Access**: `ADMIN`, `RECRUITER` (Owner only)

#### Invite Candidate
`POST /api/v1/assessments/:id/invite`
- **Access**: `RECRUITER`
- **Deduction**: Decrements 1 credit from the recruiter's wallet.
- **Request Body**:
```json
{
  "email": "candidate@example.com"
}
```

---

### 5. Candidate Attempt & Evaluation Module (`/api/v1/attempts`)

#### List My Assessments
`GET /api/v1/attempts/my-assessments`
- **Access**: `CANDIDATE`
- Returns invitations and assessments assigned to the logged-in candidate.

#### Start Assessment Attempt
`POST /api/v1/attempts/:assessmentId/start`
- **Access**: `CANDIDATE`
- Enforces schedule window (`scheduleStart`, `scheduleEnd`), transitions attempt status to `IN_PROGRESS`, and starts timer.

#### Test Execution Sandbox (Run Code)
`POST /api/v1/attempts/:assessmentId/run-code`
- **Access**: `CANDIDATE`
- Executes code against visible test cases without persisting or affecting candidate score.
- **Request Body**:
```json
{
  "problemId": "problem_cuid_1",
  "submittedCode": "function twoSum(nums, target) { return [0, 1]; }"
}
```
- **Response**:
```json
{
  "problemId": "problem_cuid_1",
  "scoreAwarded": 25,
  "maxPoints": 25,
  "status": "PASSED",
  "testResults": [
    {
      "passed": true,
      "input": "[2,7,11,15], 9",
      "expectedOutput": "[0,1]",
      "actualOutput": "[0,1]",
      "isHidden": false
    }
  ],
  "executionTimeMs": 85
}
```

#### Submit Problem Solution
`POST /api/v1/attempts/:assessmentId/submit-problem`
- **Access**: `CANDIDATE`
- Evaluates code against **all** test cases (including hidden), saves/updates `Submission` record in the database, and records awarded score.
- **Request Body**:
```json
{
  "problemId": "problem_cuid_1",
  "submittedCode": "function twoSum(nums, target) { ... }"
}
```
*(For MCQ/Single Choice, send `"selectedOptions": ["A", "C"]`)*

#### Finish Assessment
`POST /api/v1/attempts/:assessmentId/finish`
- **Access**: `CANDIDATE`
- Aggregates all submission scores, compares against `passingMarks`, marks status as `COMPLETED`, sets `submittedAt`, and stores `isPassed`.

#### Get Assessment Result
`GET /api/v1/attempts/:assessmentId/result`
- **Access**: `CANDIDATE`, `RECRUITER`, `ADMIN`
- Returns full candidate score breakdown, individual problem submissions, and pass/fail status.

---

### 6. Payment & Recruiter Credits Module (`/api/v1/payments`)

#### Create Stripe Checkout Session
`POST /api/v1/payments/create-checkout-session`
- **Access**: `RECRUITER`, `ADMIN`
- **Request Body**:
```json
{
  "planName": "STARTER_PACK"
}
```
- **Available Plans**:
  - `STARTER_PACK`: 25 Credits — \$29
  - `PRO_PACK`: 75 Credits — \$79
  - `ENTERPRISE_PACK`: 250 Credits — \$199
- **Response**: Returns `checkoutUrl` to redirect recruiter to Stripe Checkout.

#### Verify Session (Client Return)
`POST /api/v1/payments/verify-session`
- **Access**: `RECRUITER`, `ADMIN`
- **Request Body**: `{ "sessionId": "cs_test_..." }`
- Verifies session with Stripe, marks payment as `COMPLETED`, and increments recruiter credits.

#### Stripe Webhook
`POST /api/v1/payments/webhook`
- **Access**: Stripe signature-verified endpoint (`Stripe-Signature` header).
- Automatically fulfills credits on `checkout.session.completed`.

#### Payment History
`GET /api/v1/payments/my-history`
- **Access**: `RECRUITER` (sees own payments), `ADMIN` (sees all payments).

---

### 7. Admin Governance Module (`/api/v1/admin`)

#### List Users
`GET /api/v1/admin/users`
- **Access**: `ADMIN`
- **Query Params**: `searchTerm`, `role`, `status`, `page`, `limit`, `sortBy`, `sortOrder`

#### Update User Status / Role
`PATCH /api/v1/admin/users/:id/status`
- **Access**: `ADMIN`
- **Request Body**:
```json
{
  "status": "BLOCKED",
  "role": "RECRUITER"
}
```
*(Prevents an admin from demoting their own admin account)*

#### Dashboard Analytics
`GET /api/v1/admin/dashboard-stats`
- **Access**: `ADMIN`
- **Response**:
```json
{
  "overview": {
    "totalUsers": 120,
    "totalCandidates": 95,
    "totalRecruiters": 22,
    "totalProblems": 40,
    "totalAssessments": 15,
    "totalAttempts": 84,
    "totalPassedAttempts": 58,
    "passRate": "69.05%"
  },
  "revenue": {
    "totalRevenueUSD": 3290,
    "successfulTransactions": 42
  }
}
```

#### Audit Logs
`GET /api/v1/admin/audit-logs`
- **Access**: `ADMIN`
- **Query Params**: `action`, `entityType`, `page`, `limit`, `sortBy`, `sortOrder`

---

## Security & Architectural Highlights

- **Prisma ORM v7 with `@prisma/adapter-pg`**: Uses PostgreSQL connection pooling via the official modern driver adapter.
- **Rate Limiting**:
  - Global limiter: 100 requests per 15-minute window per IP.
  - Auth limiter: 10 requests per 15-minute window for auth routes (`/register`, `/login`, `/google`).
- **Child Process Sandbox**: Code execution runs with a 3-second hard timeout, isolated execution buffer, and memory cap to prevent DOS vectors.
- **Audit Logging**: Sensitive mutations (`CREATE_ASSESSMENT`, `UPDATE_USER_STATUS_OR_ROLE`, `FINISH_ASSESSMENT`, etc.) create immutable audit log rows recording actor ID, IP address, and payload diffs.
- **Soft Deletion**: Problems and assessments feature non-destructive soft deletion (`isDeleted`, `deletedAt`).
- **Dual Authentication Modes**: Seamlessly supports `Authorization: Bearer <token>` headers as well as HTTP-only cookies (`accessToken`, `refreshToken`) for browser clients.

---

## Available NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch src/server.ts` | Runs the server in development mode with live reload |
| `npm run build` | `tsup` | Compiles the TypeScript application into production `dist/` |
| `npm start` | `node dist/src/server.js` | Runs the compiled production build |
| `npm run lint:check` | `npx @biomejs/biome lint ./src` | Runs Biome code linter across `src/` |
| `npm run lint:fix` | `npx @biomejs/biome lint --write ./src` | Automatically resolves fixable lint warnings |
| `npm run format:check` | `npx @biomejs/biome format ./src` | Checks formatting compliance with Biome |
| `npm run format:fix` | `npx @biomejs/biome format --write ./src` | Formats codebase using Biome formatter |

---

## Troubleshooting & FAQ

#### 1. Why does `npx prisma migrate dev` fail with driver adapter errors?
This project uses **Prisma ORM v7**. Ensure your `prisma7.config.ts` points to `prisma/schema` and your `DATABASE_URL` is set in `.env`. Run `npx prisma generate` after any schema edits.

#### 2. What happens if Stripe keys are not set?
Payment checkout automatically triggers local fallback mode: simulated session IDs (`cs_test_...`) and success redirects are returned, allowing development without a paid Stripe account.

#### 3. How does the code runner handle input formats?
Solutions can either read from standard input (`fs.readFileSync(0, "utf-8")`) or export/define a `solution(rawInput)` function. Both styles are supported.

---

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).
