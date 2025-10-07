-- Add published_at and closed_at tracking columns for assignments (idempotent)
DO $$
BEGIN
    ALTER TABLE public.assignments
        ADD COLUMN IF NOT EXISTS published_at timestamptz,
        ADD COLUMN IF NOT EXISTS closed_at timestamptz;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to alter assignments table for status timestamps: %', SQLERRM;
        RAISE;
END $$;

-- Backfill published_at for already published or closed assignments when missing
DO $$
BEGIN
    UPDATE public.assignments
    SET published_at = COALESCE(published_at, updated_at, now())
    WHERE status IN ('published', 'closed')
      AND published_at IS NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to backfill assignments.published_at: %', SQLERRM;
        RAISE;
END $$;

-- Backfill closed_at for already closed assignments when missing
DO $$
BEGIN
    UPDATE public.assignments
    SET closed_at = COALESCE(closed_at, updated_at, now())
    WHERE status = 'closed'
      AND closed_at IS NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to backfill assignments.closed_at: %', SQLERRM;
        RAISE;
END $$;

