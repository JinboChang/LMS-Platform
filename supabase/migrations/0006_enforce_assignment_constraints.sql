-- Ensure assignment titles remain unique per course to prevent duplicate drafts
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS assignments_course_id_title_idx
        ON public.assignments (course_id, title);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create assignments_course_id_title_idx: %', SQLERRM;
        RAISE;
END $$;
