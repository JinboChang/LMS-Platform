CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'operator');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'resubmission_required');
CREATE TYPE report_target_type AS ENUM ('course', 'assignment', 'submission');
CREATE TYPE report_status AS ENUM ('received', 'investigating', 'resolved');
CREATE TYPE report_action_type AS ENUM ('warning', 'submission_invalidation', 'account_suspension');

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE,
    email text NOT NULL,
    role user_role NOT NULL,
    name text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.difficulty_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES public.users(id),
    title text NOT NULL,
    description text NOT NULL,
    category_id uuid NOT NULL REFERENCES public.course_categories(id),
    difficulty_id uuid NOT NULL REFERENCES public.difficulty_levels(id),
    curriculum text NOT NULL,
    status course_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES public.users(id),
    course_id uuid NOT NULL REFERENCES public.courses(id),
    status enrollment_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollments
    ADD CONSTRAINT enrollments_unique_learner_course UNIQUE (learner_id, course_id);

CREATE TABLE public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id),
    title text NOT NULL,
    description text NOT NULL,
    due_at timestamptz NOT NULL,
    score_weight numeric(5,2) NOT NULL,
    instructions text NOT NULL,
    submission_requirements text NOT NULL,
    late_submission_allowed boolean NOT NULL DEFAULT false,
    status assignment_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assignment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    learner_id uuid NOT NULL REFERENCES public.users(id),
    submission_text text NOT NULL,
    submission_link text,
    status submission_status NOT NULL DEFAULT 'submitted',
    late boolean NOT NULL DEFAULT false,
    score numeric(5,2),
    feedback_text text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    graded_at timestamptz,
    feedback_updated_at timestamptz
);

ALTER TABLE public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_unique_assignment_learner UNIQUE (assignment_id, learner_id);

CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by uuid NOT NULL REFERENCES public.users(id),
    target_type report_target_type NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status report_status NOT NULL DEFAULT 'received',
    reported_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

CREATE TABLE public.report_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    action_type report_action_type NOT NULL,
    action_details text,
    actioned_by uuid NOT NULL REFERENCES public.users(id),
    actioned_at timestamptz NOT NULL DEFAULT now()
);
