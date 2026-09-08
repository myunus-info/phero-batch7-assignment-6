# DevJudge API

A TypeScript-based Express backend for a recruitment and assessment platform that allows recruiters to create coding and multiple-choice problems, invite candidates to assessments, capture submissions, manage user accounts, and process credits for candidate invites via Stripe-compatible flows.

This project is designed around a role-based model with three primary user types:

- Admin
- Recruiter
- Candidate

The app uses PostgreSQL with Prisma ORM, JWT-based authentication, cookie-based session handling, and a modular Express architecture.

---

## Table of Contents

- [DevJudge API](#devjudge-api)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Authentication and User Management](#authentication-and-user-management)
    - [Recruiter Tools](#recruiter-tools)
    - [Candidate Experience](#candidate-experience)
    - [Administration](#administration)
    - [Data and Platform Features](#data-and-platform-features)
  - [Technology Stack](#technology-stack)
  - [Project Architecture](#project-architecture)
  - [Folder Structure](#folder-structure)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation and Setup](#installation-and-setup)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
  - [Available Scripts](#available-scripts)
  - [Seeded Demo Accounts](#seeded-demo-accounts)
    - [Admin](#admin)
    - [Recruiter](#recruiter)
    - [Candidate](#candidate)
  - [Core Domain Models](#core-domain-models)
    - [User](#user)
    - [Problem](#problem)
    - [Assessment](#assessment)
    - [AssessmentCandidate](#assessmentcandidate)
    - [Submission](#submission)
    - [Payment](#payment)
    - [RecruiterProfile / CandidateProfile](#recruiterprofile--candidateprofile)
  - [API Endpoints](#api-endpoints)
    - [Authentication Routes](#authentication-routes)
      - [Register a new user](#register-a-new-user)
      - [Login](#login)
      - [Google login](#google-login)
      - [Refresh token](#refresh-token)
      - [Logout](#logout)
    - [User Routes](#user-routes)
    - [Problem Routes](#problem-routes)
    - [Assessment Routes](#assessment-routes)
    - [Candidate Attempt Routes](#candidate-attempt-routes)
    - [Payment Routes](#payment-routes)
    - [Admin Routes](#admin-routes)
  - [Authentication and Authorization](#authentication-and-authorization)
  - [Payment Flow](#payment-flow)
    - [Credit plans](#credit-plans)
    - [Payment behavior](#payment-behavior)
  - [Security and Middleware](#security-and-middleware)
  - [Known Notes and Limitations](#known-notes-and-limitations)
  - [License](#license)
  - [Summary](#summary)
  - [Quick Start Example](#quick-start-example)

---

## Overview

DevJudge API is a backend service built for developer assessment workflows. Recruiters can:

- create and manage coding or MCQ problems
- organize them into assessments
- invite candidates by email
- purchase candidate invitation credits
- review assessment results and payment logs

Candidates can:

- log in or authenticate with Google
- view assigned assessments
- start an assessment attempt
- submit answers or code for each problem
- finish the assessment and view results

Admins can:

- manage users and roles
- review platform statistics
- inspect audit logs
- block or reactivate accounts

---

## Features

### Authentication and User Management

- Email/password registration
- Google social login
- JWT access and refresh tokens
- Cookie-based authentication
- Role-based access control for admin, recruiter, and candidate routes
- User blocking and soft deletion support

### Recruiter Tools

- Create, update, and soft-delete problems
- Create and manage assessments
- Add problems to assessments with custom scoring
- Invite candidates to assessments
- Track assessment status and results
- Purchase recruiter credits for candidate invites

### Candidate Experience

- View assigned assessments
- Start and complete assessment attempts
- Submit code or multiple-choice answers
- Receive scoring feedback and final result summaries

### Administration

- Dashboard stats for users, problems, assessments, and attempts
- User management and role updates
- Audit log reviews
- Payment history visibility for admins and recruiters

### Data and Platform Features

- Prisma ORM with PostgreSQL
- Schema-driven models and enum-based status handling
- Seed data for demo users and sample assessment content
- Global error handling and validation middleware
- Rate limiting and HTTP security headers

---

## Technology Stack

- Node.js + TypeScript
- Express.js v5
- PostgreSQL
- Prisma ORM v7
- Zod validation
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- Google OAuth verification with `google-auth-library`
- Stripe payment integration
- Helmet, CORS, cookie-parser, express-rate-limit, morgan
- Biome for linting and formatting

---

## Project Architecture

The project follows a modular backend structure with route modules, services, controllers, validation, and middleware. The server bootstraps Express, loads configuration, and connects to PostgreSQL through Prisma.

Main architectural flow:

1. Client sends request to Express server
2. Middleware validates request data and auth state
3. Route module dispatches to controller
4. Controller calls service layer
5. Service interacts with Prisma and business logic
6. Response is sent using a standard success envelope
7. Audit logs capture important actions

This architecture is organized around business domains such as:

- `auth`
- `user`
- `problem`
- `assessment`
- `attempt`
- `payment`
- `admin`

---

## Folder Structure

```text
assignment-6/
├── prisma/
│   ├── migrations/
│   └── schema/
│       ├── assessment.prisma
│       ├── auditlog.prisma
│       ├── candidate.prisma
│       ├── enums.prisma
│       ├── payment.prisma
│       ├── problem.prisma
│       ├── recruiter.prisma
│       ├── schema.prisma
│       ├── submission.prisma
│       └── user.prisma
├── src/
│   ├── app/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── generated/
│   ├── app.ts
│   └── server.ts
├── package.json
├── tsconfig.json
├── prisma-next.md
├── prisma7.config.ts
├── README.md
└── .env
```

Key source folders:

- `src/app/config` – runtime configuration and env loading
- `src/app/middleware` – auth, validation, global error, rate limiting, not-found middleware
- `src/app/modules` – domain-specific controllers, services, routes, and validation
- `src/app/utils` – JWT helpers, audit logger, response helper, code evaluator, seed script
- `src/app/lib/prisma.ts` – Prisma client initialization

---

## Prerequisites

Before running this project, ensure you have:

- Node.js 18+ or 20+
- npm
- PostgreSQL database server
- Access to a Stripe account if you want real payment session creation
- Optional: a Google OAuth client ID for social login

---

## Environment Configuration

Create a `.env` file in the project root with the following values:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/devjudge_db"

BCRYPT_SALT_ROUNDS=12

JWT_SECRET="super-secret-access-token-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="super-secret-refresh-token-key"
JWT_REFRESH_EXPIRES_IN="30d"

GOOGLE_CLIENT_ID="your-google-client-id"

STRIPE_SECRET_KEY="sk_test_...or_sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CLIENT_URL="http://localhost:3000"
```

Notes:

- `DATABASE_URL` is required for Prisma and PostgreSQL connectivity.
- `JWT_*` values should be changed for production environments.
- `STRIPE_*` values are optional for local demo flows; payment creation falls back to mock logic when Stripe keys are not configured properly.

---

## Installation and Setup

```bash
npm install
```

If Prisma client artifacts are not generated yet, run:

```bash
npx prisma generate
```

---

## Database Setup

This project expects PostgreSQL. After setting `DATABASE_URL`, initialize the database schema:

```bash
npx prisma migrate dev --name init
```

If you want to reinitialize the schema from scratch in a development environment:

```bash
npx prisma migrate reset
```

The Prisma schema is split across several files in `prisma/schema/` and consolidated by Prisma for the app runtime.

---

## Running the Application

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

The app starts on `PORT` (default: `5000`) and exposes the API at:

```text
http://localhost:5000
```

Root health endpoint:

```http
GET /
```

Example response:

```json
{
  "success": true,
  "message": "Welcome to DevJudge API - Developer Assessment & Coding Platform",
  "version": "1.0.0",
  "documentation": "/api/v1/docs",
  "timestamp": "2026-09-08T00:00:00.000Z"
}
```

> Note: the `documentation` field points to a route that is referenced by the app, but no dedicated docs endpoint is implemented in the current codebase.

---

## Available Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/src/server.js",
    "format:check": "npx @biomejs/biome format ./src",
    "format:fix": "npx @biomejs/biome format --write ./src",
    "lint:check": "npx @biomejs/biome lint ./src",
    "lint:fix": "npx @biomejs/biome lint --write ./src",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## Seeded Demo Accounts

The app includes seeding logic via `src/app/utils/seed.ts` and runs automatically on startup. It creates demo accounts for the platform:

### Admin

- Email: `admin@devjudge.com`
- Password: `Admin@123456`

### Recruiter

- Email: `recruiter@techcorp.com`
- Password: `Recruiter@123456`

### Candidate

- Email: `candidate@devjudge.com`
- Password: `Candidate@123456`

Seed data also creates demo problems, a published assessment, and a sample completed candidate submission.

---

## Core Domain Models

### User

Represents a platform account and includes:

- `id`
- `name`
- `email`
- `password`
- `role`
- `status`
- `avatar`
- `googleId`
- `isDeleted`
- `createdAt`, `updatedAt`

Roles:

- `ADMIN`
- `RECRUITER`
- `CANDIDATE`

Statuses:

- `ACTIVE`
- `BLOCKED`

### Problem

Stores coding, MCQ, or single-choice problems.

Fields include:

- `title`
- `slug`
- `description`
- `difficulty`
- `problemType`
- `creatorId`
- `points`
- `timeLimitSeconds`
- `starterCode`
- `mcqOptions`
- `correctAnswers`
- `testCases`

### Assessment

Represents a recruiter-generated evaluation session.

Fields include:

- `title`
- `description`
- `recruiterId`
- `durationMinutes`
- `totalMarks`
- `passingMarks`
- `scheduleStart`, `scheduleEnd`
- `status`

### AssessmentCandidate

Tracks candidate invitations and progress for each assessment.

Tracks:

- invitation token
- status (`INVITED`, `IN_PROGRESS`, `COMPLETED`, `EXPIRED`)
- candidate email
- score and pass/fail state
- started/submitted timestamps

### Submission

Stores candidate answers for each assessment problem.

Includes:

- `submittedCode`
- `selectedOptions`
- `executionResult`
- `scoreAwarded`
- `status`
- `executionTimeMs`

### Payment

Tracks Stripe-related or mock payment events.

Includes:

- `userId`
- `stripeSessionId`
- `stripePaymentIntentId`
- `amount`
- `currency`
- `creditsPurchased`
- `planName`
- `status`

### RecruiterProfile / CandidateProfile

Profile extensions for recruiter data and candidate data like company info, skills, and portfolio links.

---

## API Endpoints

All routes are mounted under the base path:

```text
/api/v1
```

### Authentication Routes

#### Register a new user

```http
POST /api/v1/auth/register
```

Body example:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "CANDIDATE"
}
```

#### Login

```http
POST /api/v1/auth/login
```

#### Google login

```http
POST /api/v1/auth/google
```

#### Refresh token

```http
POST /api/v1/auth/refresh-token
```

#### Logout

```http
POST /api/v1/auth/logout
```

### User Routes

```http
GET /api/v1/users/me
PATCH /api/v1/users/me
```

### Problem Routes

```http
POST /api/v1/problems/
GET /api/v1/problems/
GET /api/v1/problems/:id
PATCH /api/v1/problems/:id
DELETE /api/v1/problems/:id
```

### Assessment Routes

```http
POST /api/v1/assessments/
GET /api/v1/assessments/
GET /api/v1/assessments/:id
PATCH /api/v1/assessments/:id
DELETE /api/v1/assessments/:id
POST /api/v1/assessments/:id/invite
```

### Candidate Attempt Routes

```http
GET /api/v1/attempts/my-assessments
POST /api/v1/attempts/:assessmentId/start
POST /api/v1/attempts/:assessmentId/submit-problem
POST /api/v1/attempts/:assessmentId/finish
GET /api/v1/attempts/:assessmentId/result
```

### Payment Routes

```http
POST /api/v1/payments/create-checkout-session
POST /api/v1/payments/webhook
GET /api/v1/payments/my-history
```

### Admin Routes

```http
GET /api/v1/admin/users
PATCH /api/v1/admin/users/:id/status
GET /api/v1/admin/dashboard-stats
GET /api/v1/admin/audit-logs
```

---

## Authentication and Authorization

The app uses JWT tokens for authorization. Access tokens are typically sent in the `Authorization` header as a Bearer token, or they can be stored as cookies under `accessToken` and `refreshToken`.

The auth middleware checks:

- token presence
- token validity
- whether the user still exists
- whether the user is soft deleted
- whether the user is blocked
- whether the user has the required role

Role-based protections are enforced by passing allowed roles to the middleware, for example:

```ts
auth(UserRole.ADMIN, UserRole.RECRUITER);
```

Roles are defined in Prisma enums from `UserRole`.

---

## Payment Flow

The payment module is built around recruiter credit packs. Recruiters can purchase bundles of candidate invite credits, and the app stores a pending payment record before fulfillment.

### Credit plans

Defined in `src/app/modules/payment/payment.interface.ts`:

- `STARTER_PACK`: 25 credits, $29
- `PRO_PACK`: 75 credits, $79
- `ENTERPRISE_PACK`: 250 credits, $199

### Payment behavior

- `POST /api/v1/payments/create-checkout-session` creates a Stripe checkout session or a mock fallback session
- `POST /api/v1/payments/webhook` processes payment completion events
- On successful completion, recruiter credits are incremented and a payment record is marked as completed

This design allows local development without a fully configured Stripe secret, while still supporting production Stripe workflows.

---

## Security and Middleware

The server config includes:

- `helmet()` for secure HTTP headers
- `cors()` with allowed frontend origins
- `cookie-parser()` for token cookies
- JSON and URL-encoded body parsing
- global rate limiting
- morgan logging in development mode
- centralized global error handler
- not-found fallback middleware
- validation using Zod

These safeguards aid both security and maintainability.

---

## Known Notes and Limitations

This project is a strong backend foundation, but it has a few important implementation realities to be aware of:

1. The code evaluator is intentionally simplified and does not execute arbitrary user code in a sandboxed environment.
   - It checks for obvious syntax/logic conditions and awards partial or full points based on provided test data.
   - It is suitable for demo and training workflows, not production-grade code execution.

2. Payment checkout falls back to mock behavior when real Stripe credentials are not configured.
   - This is helpful for local development but should not be treated as production-grade handling on its own.

3. The API includes a root endpoint documentation hint, but no dedicated Swagger/OpenAPI docs are implemented in the current project.

4. The project is a backend service only; it does not include a frontend application by itself.

---

## License

This project is licensed under the ISC license.

---

## Summary

DevJudge API provides a comprehensive recruitment assessment platform backend with authentication, role-based access, candidate invite management, problem and assessment authoring, submission evaluation, audit logs, and recruiter payments. It is well suited as a starter backend for assessment-driven hiring systems, coding challenge portals, or internal technical screening platforms.

If you are developing around this codebase, the most important starting points are:

- `src/app.ts` – app bootstrap
- `src/server.ts` – server startup and graceful shutdown
- `src/app/routes/index.ts` – API route registration
- `prisma/schema/` – data model definitions
- `src/app/modules/*` – business logic domains
- `src/app/utils/seed.ts` – demo platform content

---

## Quick Start Example

```bash
npm install
# create a .env file with your PostgreSQL, JWT, and Stripe values
npx prisma migrate dev
npm run dev
```

Then open:

```text
http://localhost:5000/
```

and start interacting with the API under `/api/v1`.
