# Database Blueprint

## Data Flow Summary

1. Account selection & onboarding (Userflow 1)
   - Inputs: email, phone number, selected role, name.
   - Database actions: Supabase returns `auth_user_id`; insert row in `users` with the chosen role and contact fields.
   - Outputs: route learners to the course catalog or instructors to their dashboard.

2. Course discovery and enrollment (Userflow 2)
   - Inputs: search phrase, category filter, difficulty filter, sort option, enroll/cancel action.
   - Reads: query `courses` joined with `course_categories` and `difficulty_levels`, constrained to `status='published'`.
   - Writes: create or reactivate `enrollments` records as `status='active'`; cancellations flip `status` to `cancelled` while preserving history.

3. Learner dashboard (Userflow 3)
   - Inputs: learner dashboard visit.
   - Reads: combine `enrollments` (active rows), linked `courses`, published `assignments`, and the learner's `assignment_submissions` to show course list, progress ratios, upcoming deadlines, and recent feedback timestamps.

4. Assignment detail (Userflow 4)
   - Inputs: assignment selection within an enrolled course.
   - Reads: fetch `assignments` where `status='published'` and confirm `enrollments` for the learner-course pair remain `status='active'`.
   - Effects: when `assignments.status='closed'`, the client disables submission UI.

5. Assignment submission and resubmission (Userflow 5)
   - Inputs: submission text, optional URL, submit action.
   - Writes: upsert `assignment_submissions` for the learner-assignment pair with `status='submitted'`, `submitted_at`, and `late=true` when `now() > due_at` and `assignments.late_submission_allowed` is true; otherwise reject late attempts.
   - Validations: enforce URL format when provided and check submission requirements.

6. Grades and feedback viewing (Userflow 6)
   - Inputs: learner grade view request.
   - Reads: restrict to the learner's own `assignment_submissions`, exposing `score`, `feedback_text`, `late`, and computing per-course totals from assignment weights.

7. Instructor dashboard (Userflow 7)
   - Inputs: instructor dashboard visit.
   - Reads: list owned `courses` filtered by `status`, highlight `assignment_submissions` with `status IN ('submitted','resubmission_required')`, and surface recent submissions by `graded_at` or `submitted_at`.

8. Course management (Userflow 8)
   - Inputs: course create/update payload, status transitions.
   - Writes: insert or update `courses` with title, description, category, difficulty, curriculum, and `status`. `status` transitions govern learner visibility (`published`) and new enrollment blocking (`archived`).

9. Assignment management (Userflow 9)
   - Inputs: assignment create/update payload, status transitions.
   - Writes: insert or update `assignments` with title, description, due date, score weight, instructions, submission requirements, `late_submission_allowed`, and `status`. Automatic processes set `status='closed'` when due dates pass.
   - Reads: instructors reference submission counts per status for progress tracking.

10. Submission grading and feedback (Userflow 10)
    - Inputs: score (0-100), feedback text, optional resubmission request.
    - Writes: update `assignment_submissions` with bounded `score`, `feedback_text`, `graded_at`, and set `status='graded'` or `status='resubmission_required'` accordingly.
    - Outputs: trigger learner-facing notifications and dashboard refresh.

11. Assignment publish/close (Userflow 11)
    - Inputs: publish or close actions.
    - Writes: flip `assignments.status` between `draft`, `published`, and `closed`; when closed, block learner submissions while allowing grading.

12. Operations (Userflow 12)
    - Inputs: reports describing target entity, reason, and details; metadata maintenance actions.
    - Writes: insert into `reports` with `target_type`, `target_id`, `status`, and timestamps; update status through `investigating` to `resolved`. Persist follow-up actions in `report_actions` as warnings, submission invalidations, or account restrictions. Toggle `course_categories.is_active` or `difficulty_levels.is_active` as part of metadata management.

## Schema Overview

- `users`: Supabase-linked identities with role and contact data.
- `course_categories`: Managed list of course categories with active flag.
- `difficulty_levels`: Managed list of difficulty labels with active flag.
- `courses`: Instructor-owned courses with metadata and publication status.
- `enrollments`: Learner-course relationships tracking active or cancelled enrollment.
- `assignments`: Course assignments with scheduling, weighting, and lifecycle state.
- `assignment_submissions`: Learner submissions, scoring, feedback, and timing flags.
- `reports`: Operator-managed reports about courses, assignments, or submissions.
- `report_actions`: Follow-up actions taken in response to reports.

## Enumerated Types

- `user_role`: `learner`, `instructor`, `operator`
- `course_status`: `draft`, `published`, `archived`
- `enrollment_status`: `active`, `cancelled`
- `assignment_status`: `draft`, `published`, `closed`
- `submission_status`: `submitted`, `graded`, `resubmission_required`
- `report_target_type`: `course`, `assignment`, `submission`
- `report_status`: `received`, `investigating`, `resolved`
- `report_action_type`: `warning`, `submission_invalidation`, `account_suspension`

## Table Definitions

### users

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | Surrogate identifier |
| auth_user_id | uuid | UNIQUE NOT NULL | Supabase auth identifier |
| email | text | NOT NULL | Captured during onboarding |
| role | user_role | NOT NULL | Learner, instructor, or operator |
| name | text | NOT NULL | Display name |
| phone_number | text | NOT NULL | Stored as provided |
| created_at | timestamptz | DEFAULT now() | Audit timestamp |

### course_categories

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL UNIQUE | Category label |
| is_active | boolean | NOT NULL DEFAULT true | Operators can disable without deletion |
| created_at | timestamptz | DEFAULT now() | |

### difficulty_levels

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| label | text | NOT NULL UNIQUE | Difficulty name |
| is_active | boolean | NOT NULL DEFAULT true | Operators can disable entries |
| created_at | timestamptz | DEFAULT now() | |

### courses

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| instructor_id | uuid | NOT NULL REFERENCES users(id) | Ownership |
| title | text | NOT NULL | |
| description | text | NOT NULL | Course overview |
| category_id | uuid | NOT NULL REFERENCES course_categories(id) | |
| difficulty_id | uuid | NOT NULL REFERENCES difficulty_levels(id) | |
| curriculum | text | NOT NULL | Outline from userflow |
| status | course_status | NOT NULL DEFAULT 'draft' | Governs visibility |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | Update trigger recommended |

### enrollments

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| learner_id | uuid | NOT NULL REFERENCES users(id) | Must have role `learner` (enforced at application level) |
| course_id | uuid | NOT NULL REFERENCES courses(id) | |
| status | enrollment_status | NOT NULL DEFAULT 'active' | Active vs cancelled |
| created_at | timestamptz | DEFAULT now() | Enrollment time |
| updated_at | timestamptz | DEFAULT now() | Tracks cancellations |

Constraints:
- Unique (`learner_id`, `course_id`).

### assignments

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| course_id | uuid | NOT NULL REFERENCES courses(id) | |
| title | text | NOT NULL | |
| description | text | NOT NULL | |
| due_at | timestamptz | NOT NULL | Deadline |
| score_weight | numeric(5,2) | NOT NULL | Percentage weight |
| instructions | text | NOT NULL | Guidance content |
| submission_requirements | text | NOT NULL | Text + link expectations |
| late_submission_allowed | boolean | NOT NULL DEFAULT false | Enables late flag |
| status | assignment_status | NOT NULL DEFAULT 'draft' | Lifecycle state |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

### assignment_submissions

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| assignment_id | uuid | NOT NULL REFERENCES assignments(id) | |
| learner_id | uuid | NOT NULL REFERENCES users(id) | |
| submission_text | text | NOT NULL | Free-form response |
| submission_link | text |  | Optional URL, validated |
| status | submission_status | NOT NULL DEFAULT 'submitted' | Submission lifecycle |
| late | boolean | NOT NULL DEFAULT false | Late flag |
| score | numeric(5,2) |  | 0-100 inclusive |
| feedback_text | text |  | Instructor feedback |
| submitted_at | timestamptz | DEFAULT now() | Auto-set |
| graded_at | timestamptz |  | Set on grading |
| feedback_updated_at | timestamptz |  | Tracks latest feedback |

Constraints:
- Unique (`assignment_id`, `learner_id`).

### reports

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| reported_by | uuid | NOT NULL REFERENCES users(id) | Reporter |
| target_type | report_target_type | NOT NULL | Course, assignment, or submission |
| target_id | uuid | NOT NULL | References target primary key |
| reason | text | NOT NULL | Reason code/text |
| details | text |  | Additional description |
| status | report_status | NOT NULL DEFAULT 'received' | Workflow state |
| reported_at | timestamptz | DEFAULT now() | |
| resolved_at | timestamptz |  | Filled when status becomes `resolved` |

### report_actions

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| report_id | uuid | NOT NULL REFERENCES reports(id) ON DELETE CASCADE | |
| action_type | report_action_type | NOT NULL | Warning, invalidation, or suspension |
| action_details | text |  | Notes on the action |
| actioned_by | uuid | NOT NULL REFERENCES users(id) | Operator performing the action |
| actioned_at | timestamptz | DEFAULT now() | Timestamp |
