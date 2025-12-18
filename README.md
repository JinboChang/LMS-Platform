# LMS

Role-based learning management system for learners, instructors, and operators.  
Built with Next.js App Router, Hono, and Supabase. UI and API are separated.

Temporary prototype link (It may fail to fetch database due to inactivity of Supabase): https://lms-platform-one-xi.vercel.app/

## What it does
- Learners: course catalog search/filter, enroll/cancel, assignment detail/submit/resubmit, dashboard, grade board
- Instructors: course status overview, course create/edit/status, assignment create/edit/status, grade submissions
- Operators: report queue, status updates, action logs, category/difficulty metadata management
- Onboarding: choose role and redirect to the right workspace
- Auth: Supabase Auth, protected routes redirect via middleware

## Key routes
- `/`, `/login`, `/signup`, `/onboarding`
- `/courses`, `/courses/[courseId]`
- `/courses/[courseId]/assignments/[assignmentId]` (submit assignments)
- `/dashboard`, `/grades`
- `/instructor/dashboard`
- `/instructor/courses`, `/instructor/courses/new`, `/instructor/courses/[courseId]/edit`
- `/instructor/courses/[courseId]/assignments`
- `/instructor/courses/[courseId]/assignments/[assignmentId]/submissions/[submissionId]` (grading)
- `/operator`

## Architecture
- Next.js 15 App Router (all UI is client components)
- Hono API: `src/app/api/[[...hono]]/route.ts` -> `src/backend/hono/app.ts`
- Middleware: error boundary, app context, Supabase service-role client per request
- React Query: QueryClientProvider in `src/app/providers.tsx`
- API client: `src/lib/remote/api-client.ts` (axios)
- Validation: Zod
- State: Zustand
- UI: shadcn-ui + Tailwind CSS

## Structure (core)
- `src/app`: routes and pages
- `src/backend`: Hono app, middleware, shared HTTP response helpers
- `src/features/<feature>`: components/hooks/backend/service/schema/lib
- `src/lib`: utilities, Supabase client, API client
- `supabase/migrations`: schema and seed SQL

## Data and DB
- Supabase PostgreSQL
- Main tables: `users`, `course_categories`, `difficulty_levels`, `courses`, `enrollments`, `assignments`, `assignment_submissions`, `reports`, `report_actions`
- Sample seed data: `supabase/migrations/0004_*`, `supabase/migrations/0005_*`
- Migrations live in `supabase/migrations` (do not run locally)

## Environment variables
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_API_BASE_URL= # optional, empty uses same origin
```

## Run locally
```bash
npm install
npm run dev
```

## Test and lint
```bash
npm run test
npm run lint
```

## Notes
- `src/app/example` is a UI/data example page
- `docs/` contains PRD, user flows, and DB notes
