-- Core LMS schema rebuild with idempotent guards
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
DO $$
BEGIN
    CREATE TYPE public.user_role AS ENUM ('learner', 'instructor', 'operator');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create user_role enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create course_status enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.enrollment_status AS ENUM ('active', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create enrollment_status enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.assignment_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create assignment_status enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.submission_status AS ENUM ('submitted', 'graded', 'resubmission_required');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create submission_status enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.report_target_type AS ENUM ('course', 'assignment', 'submission');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create report_target_type enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.report_status AS ENUM ('received', 'investigating', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create report_status enum: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TYPE public.report_action_type AS ENUM ('warning', 'submission_invalidation', 'account_suspension');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create report_action_type enum: %', SQLERRM;
        RAISE;
END
$$;

-- Tables
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE,
    email text NOT NULL,
    role public.user_role NOT NULL,
    name text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.difficulty_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES public.users(id),
    title text NOT NULL,
    description text NOT NULL,
    category_id uuid NOT NULL REFERENCES public.course_categories(id),
    difficulty_id uuid NOT NULL REFERENCES public.difficulty_levels(id),
    curriculum text NOT NULL,
    status public.course_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.users(id),
    course_id uuid NOT NULL REFERENCES public.courses(id),
    status public.enrollment_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id),
    title text NOT NULL,
    description text NOT NULL,
    due_at timestamptz NOT NULL,
    score_weight numeric(5,2) NOT NULL,
    instructions text NOT NULL,
    submission_requirements text NOT NULL,
    late_submission_allowed boolean NOT NULL DEFAULT false,
    status public.assignment_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    learner_id uuid NOT NULL REFERENCES public.users(id),
    submission_text text NOT NULL,
    submission_link text,
    status public.submission_status NOT NULL DEFAULT 'submitted',
    late boolean NOT NULL DEFAULT false,
    score numeric(5,2),
    feedback_text text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    graded_at timestamptz,
    feedback_updated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by uuid NOT NULL REFERENCES public.users(id),
    target_type public.report_target_type NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status public.report_status NOT NULL DEFAULT 'received',
    reported_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    action_type public.report_action_type NOT NULL,
    action_details text,
    actioned_by uuid NOT NULL REFERENCES public.users(id),
    actioned_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure audit columns exist for reruns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.course_categories ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.course_categories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.difficulty_levels ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.difficulty_levels ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.report_actions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.report_actions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Unique constraints
DO $$
BEGIN
    ALTER TABLE public.enrollments
        ADD CONSTRAINT enrollments_unique_learner_course UNIQUE (learner_id, course_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to ensure enrollments unique constraint: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.assignment_submissions
        ADD CONSTRAINT assignment_submissions_unique_assignment_learner UNIQUE (assignment_id, learner_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to ensure assignment submissions unique constraint: %', SQLERRM;
        RAISE;
END
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_users_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create users updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_course_categories_updated_at
        BEFORE UPDATE ON public.course_categories
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create course_categories updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_difficulty_levels_updated_at
        BEFORE UPDATE ON public.difficulty_levels
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create difficulty_levels updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_courses_updated_at
        BEFORE UPDATE ON public.courses
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create courses updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_enrollments_updated_at
        BEFORE UPDATE ON public.enrollments
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create enrollments updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_assignments_updated_at
        BEFORE UPDATE ON public.assignments
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create assignments updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_assignment_submissions_updated_at
        BEFORE UPDATE ON public.assignment_submissions
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create assignment_submissions updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_reports_updated_at
        BEFORE UPDATE ON public.reports
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create reports updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

DO $$
BEGIN
    CREATE TRIGGER set_timestamp_report_actions_updated_at
        BEFORE UPDATE ON public.report_actions
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        RAISE NOTICE 'Failed to create report_actions updated_at trigger: %', SQLERRM;
        RAISE;
END
$$;

-- Disable RLS explicitly
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.difficulty_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_actions DISABLE ROW LEVEL SECURITY;
