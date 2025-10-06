-- Seed sample learner, assignments, and submissions for assignment/grade flows (idempotent)
DO $$
BEGIN
    -- Sample learner profile
    INSERT INTO public.users AS u (
        id,
        auth_user_id,
        email,
        role,
        name,
        phone_number
    )
    VALUES (
        '00000000-0000-0000-0000-000000000501',
        '10000000-0000-0000-0000-000000000501',
        'learner@example.com',
        'learner',
        '이서연',
        '010-5555-0001'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        phone_number = EXCLUDED.phone_number;

    -- Ensure learner enrollment for primary sample course
    INSERT INTO public.enrollments AS e (
        id,
        learner_id,
        course_id,
        status
    )
    VALUES (
        '00000000-0000-0000-0000-000000000601',
        '00000000-0000-0000-0000-000000000501',
        '00000000-0000-0000-0000-000000000401',
        'active'
    )
    ON CONFLICT (learner_id, course_id) DO UPDATE
    SET status = EXCLUDED.status;

    -- Sample assignments for published course
    INSERT INTO public.assignments AS a (
        id,
        course_id,
        title,
        description,
        due_at,
        score_weight,
        instructions,
        submission_requirements,
        late_submission_allowed,
        status
    )
    VALUES
        (
            '00000000-0000-0000-0000-000000000701',
            '00000000-0000-0000-0000-000000000401',
            '스프린트 킥오프 계획',
            '팀 목표, 업무 분장, 위험 요소를 정리한 킥오프 문서를 작성합니다.',
            '2025-03-10T14:59:59Z',
            30.0,
            E'1. 프로젝트 배경과 목표 정리\n2. 역할 및 일정 테이블 포함\n3. 리스크 및 대응 전략 제시',
            E'텍스트(필수) + 참고 링크(선택) 제출',
            true,
            'published'
        ),
        (
            '00000000-0000-0000-0000-000000000702',
            '00000000-0000-0000-0000-000000000401',
            '중간 점검 회의록',
            '중간 점검 미팅 결과를 토대로 개선 과제를 정리합니다.',
            '2025-02-15T14:59:59Z',
            40.0,
            E'1. 진행 현황 요약\n2. 문제점과 해결 아이디어 제안\n3. 다음 액션 아이템 명시',
            E'회의록 문서 업로드 또는 링크, 핵심 결정사항 3가지 이상 기재',
            false,
            'closed'
        ),
        (
            '00000000-0000-0000-0000-000000000703',
            '00000000-0000-0000-0000-000000000401',
            '최종 발표 자료',
            '학습 결과를 종합한 발표 자료와 데모를 준비합니다.',
            '2025-04-05T14:59:59Z',
            30.0,
            E'1. 문제 정의와 해결 전략\n2. 핵심 기능 시연 영상 또는 링크 포함\n3. 향후 개선 계획 정리',
            E'슬라이드 링크 + 데모 영상 링크 제출, 발표 요약 본문 포함',
            true,
            'draft'
        )
    ON CONFLICT (id) DO UPDATE
    SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        due_at = EXCLUDED.due_at,
        score_weight = EXCLUDED.score_weight,
        instructions = EXCLUDED.instructions,
        submission_requirements = EXCLUDED.submission_requirements,
        late_submission_allowed = EXCLUDED.late_submission_allowed,
        status = EXCLUDED.status;

    -- Sample submissions for learner
    INSERT INTO public.assignment_submissions AS s (
        id,
        assignment_id,
        learner_id,
        submission_text,
        submission_link,
        status,
        late,
        score,
        feedback_text,
        submitted_at,
        graded_at,
        feedback_updated_at
    )
    VALUES
        (
            '00000000-0000-0000-0000-000000000801',
            '00000000-0000-0000-0000-000000000701',
            '00000000-0000-0000-0000-000000000501',
            '초기 목표, 일정, 리스크 대응 전략을 표 형태로 정리했습니다.',
            'https://example.com/kickoff-plan',
            'submitted',
            false,
            NULL,
            NULL,
            '2025-02-20T09:00:00Z',
            NULL,
            NULL
        ),
        (
            '00000000-0000-0000-0000-000000000802',
            '00000000-0000-0000-0000-000000000702',
            '00000000-0000-0000-0000-000000000501',
            '중간 점검 회의에서 나온 문제점과 해결 아이디어를 정리했습니다.',
            'https://example.com/retro-notes',
            'graded',
            false,
            92.5,
            '데이터 근거가 명확하고 후속 액션이 분명합니다. 훌륭합니다!',
            '2025-02-12T11:30:00Z',
            '2025-02-14T08:15:00Z',
            '2025-02-14T08:15:00Z'
        )
    ON CONFLICT (assignment_id, learner_id) DO UPDATE
    SET
        submission_text = EXCLUDED.submission_text,
        submission_link = EXCLUDED.submission_link,
        status = EXCLUDED.status,
        late = EXCLUDED.late,
        score = EXCLUDED.score,
        feedback_text = EXCLUDED.feedback_text,
        submitted_at = EXCLUDED.submitted_at,
        graded_at = EXCLUDED.graded_at,
        feedback_updated_at = EXCLUDED.feedback_updated_at;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to seed sample assignments: %', SQLERRM;
        RAISE;
END $$;