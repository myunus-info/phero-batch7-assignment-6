# Prisma Setup and Migration Guide

This project uses Prisma with PostgreSQL and a modular Express backend. The Prisma schema is split across multiple files in `prisma/schema/`, and the generated client is configured to live in `src/generated/prisma`.

## Project Prisma Overview

The Prisma configuration for this repository is defined in `prisma7.config.ts`:

```ts
import { config } from './src/app/config/index';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: config.database_url,
  },
});
```

This tells Prisma:

- the schema directory is `prisma/schema`
- migrations are stored in `prisma/migrations`
- the datasource URL comes from `config.database_url` in the app config

---

## Prisma Schema Structure

This repo does not keep all models in one file. Instead, the schema is split by domain:

- `prisma/schema/schema.prisma` – root Prisma config and generator setup
- `prisma/schema/user.prisma` – User model
- `prisma/schema/recruiter.prisma` – Recruiter profile model
- `prisma/schema/candidate.prisma` – Candidate profile model
- `prisma/schema/problem.prisma` – Problem model
- `prisma/schema/assessment.prisma` – Assessment and related models
- `prisma/schema/submission.prisma` – Submission model
- `prisma/schema/payment.prisma` – Payment model
- `prisma/schema/auditlog.prisma` – Audit log model
- `prisma/schema/enums.prisma` – Shared enums

Root file:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

This setup generates Prisma artifacts inside `src/generated/prisma`, and the runtime client is then imported from:

```ts
import { PrismaClient } from '../../generated/prisma/client';
```

---

## Database Connection

The app connects to PostgreSQL using the `DATABASE_URL` environment variable loaded in `src/app/config/index.ts`:

```ts
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  // ...
};
```

The Prisma client is initialized in `src/app/lib/prisma.ts`:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { config } from '../config';

const connectionString = `${config.database_url}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
```

This means the project is using Prisma with the PostgreSQL adapter (`@prisma/adapter-pg`).

---

## Required Environment Variables

Create a `.env` file in the root of the project:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/devjudge_db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CLIENT_URL="http://localhost:3000"
```

If the database URL is missing, Prisma commands and app startup will fail because the app depends on it for runtime database access.

---

## Common Prisma Commands

From the project root:

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration from schema updates
npx prisma migrate dev --name <migration_name>

# Apply pending migrations
npx prisma migrate deploy

# View current migration status
npx prisma migrate status

# Open Prisma Studio
npx prisma studio

# Validate the schema
npx prisma validate
```

For this repository specifically, the normal dev workflow is:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

---

## Migrations

Migrations live in:

```text
prisma/migrations/
```

This repo already includes an initial migration folder and a migration lock file. When you change the schema, generate a new migration instead of editing the SQL manually unless a custom migration is absolutely required.

Example:

```bash
npx prisma migrate dev --name add_new_assessment_field
```

This will:

- update the Prisma schema state
- create a migration file under `prisma/migrations`
- apply the migration to the local database

---

## Important Schema Design Notes

### Enums

The project uses several enums in `prisma/schema/enums.prisma`, including:

- `UserRole`
- `UserStatus`
- `DifficultyLevel`
- `ProblemType`
- `AssessmentStatus`
- `CandidateAssessmentStatus`
- `SubmissionStatus`
- `PaymentStatus`

These enums drive access control, candidate states, problem difficulty, and payment outcomes.

### Core Models

The main entities are:

- `User`
- `RecruiterProfile`
- `CandidateProfile`
- `Problem`
- `Assessment`
- `AssessmentProblem`
- `AssessmentCandidate`
- `Submission`
- `Payment`
- `AuditLog`

These models form the assessment/recruitment platform domain and are critical to the backend workflow.

---

## Generated Client

Because the schema uses a custom output directory:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../src/generated/prisma"
}
```

new generated files are created under:

```text
src/generated/prisma/
```

This generated folder is part of the app’s runtime and is used by TypeScript imports in the service and utility layers.

---

## Seeding and Data Setup

The project includes a seed script in `src/app/utils/seed.ts`. It is designed to create demo content for:

- admin account
- recruiter account
- candidate account
- sample problems
- one published assessment
- sample submissions

The seed script is run during server startup. That allows the app to be demo-ready without manual database setup beyond migrations.

---

## Troubleshooting

### Prisma client not found

If you see errors about missing generated Prisma client files:

```bash
npx prisma generate
```

### Database connection errors

Check the `.env` file and confirm the connection string is valid:

```bash
npx prisma db ping
```

### Migration drift

If the database and schema drift out of sync:

```bash
npx prisma migrate status
npx prisma migrate dev
```

### Need to reset a local database

For local development only:

```bash
npx prisma migrate reset
```

---

## Recommended Workflow for This Project

Use this sequence whenever the schema or data model changes:

1. Update the Prisma schema in `prisma/schema/*.prisma`
2. Run `npx prisma generate`
3. If the schema changed structurally, run `npx prisma migrate dev --name <change>`
4. Verify with `npx prisma validate`
5. Start the app with `npm run dev`

This keeps the code, database, and generated Prisma client aligned.

---

## Summary

This project uses standard Prisma v7-style schema management with a PostgreSQL datasource and a generated client directory inside `src/generated/prisma`. The key files to remember are:

- `prisma7.config.ts`
- `prisma/schema/schema.prisma`
- `prisma/schema/*.prisma`
- `src/app/lib/prisma.ts`
- `src/app/utils/seed.ts`

The repository is set up for a real backend assessment platform and uses Prisma as the source of truth for all app data.
