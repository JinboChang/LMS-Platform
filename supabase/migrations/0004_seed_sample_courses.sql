-- Seed sample instructor, categories, difficulty levels, and courses (idempotent)
DO $$
BEGIN
    -- Sample instructor profile for demo data
    INSERT INTO public.users AS u (
        id,
        auth_user_id,
        email,
        role,
        name,
        phone_number
    )
    VALUES (
        '00000000-0000-0000-0000-000000000101',
        '10000000-0000-0000-0000-000000000101',
        'instructor@example.com',
        'instructor',
        '김민지',
        '010-1234-5678'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        phone_number = EXCLUDED.phone_number;

    -- Sample course categories
    INSERT INTO public.course_categories AS c (id, name, is_active)
    VALUES
        ('00000000-0000-0000-0000-000000000201', '웹 개발', true),
        ('00000000-0000-0000-0000-000000000202', '데이터 분석', true),
        ('00000000-0000-0000-0000-000000000203', '프로덕트 전략', true)
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;

    -- Sample difficulty levels
    INSERT INTO public.difficulty_levels AS d (id, label, is_active)
    VALUES
        ('00000000-0000-0000-0000-000000000301', '입문', true),
        ('00000000-0000-0000-0000-000000000302', '중급', true),
        ('00000000-0000-0000-0000-000000000303', '고급', true)
    ON CONFLICT (id) DO UPDATE
    SET
        label = EXCLUDED.label,
        is_active = EXCLUDED.is_active;

    -- Sample courses owned by the demo instructor
    INSERT INTO public.courses AS courses (
        id,
        instructor_id,
        title,
        description,
        category_id,
        difficulty_id,
        curriculum,
        status
    )
    VALUES
        (
            '00000000-0000-0000-0000-000000000401',
            '00000000-0000-0000-0000-000000000101',
            'Next.js 기반 LMS 구축',
            'App Router와 Supabase를 활용해 대시보드, 과제, 성적 열람 기능을 완성합니다.',
            '00000000-0000-0000-0000-000000000201',
            '00000000-0000-0000-0000-000000000301',
            E'1. 요구사항 분석\n2. UI 구성 및 라우팅\n3. 인증과 권한 처리\n4. 배포 체크리스트',
            'published'
        ),
        (
            '00000000-0000-0000-0000-000000000402',
            '00000000-0000-0000-0000-000000000101',
            '데이터 분석 입문 with Python',
            'Pandas와 시각화 도구를 이용해 데이터 전처리부터 인사이트 도출까지 실습합니다.',
            '00000000-0000-0000-0000-000000000202',
            '00000000-0000-0000-0000-000000000302',
            E'1. 데이터 로딩과 정제\n2. 탐색적 데이터 분석\n3. 시각화 기법\n4. 리포트 작성',
            'published'
        ),
        (
            '00000000-0000-0000-0000-000000000403',
            '00000000-0000-0000-0000-000000000101',
            '프로덕트 전략 실습',
            '핵심 지표 정의부터 로드맵 수립까지 팀 단위 프로젝트를 진행합니다.',
            '00000000-0000-0000-0000-000000000203',
            '00000000-0000-0000-0000-000000000303',
            E'1. 미션 및 KPI 설정\n2. 사용자 리서치 설계\n3. 우선순위 매트릭스\n4. 실행 계획 수립',
            'published'
        )
    ON CONFLICT (id) DO UPDATE
    SET
        instructor_id = EXCLUDED.instructor_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        difficulty_id = EXCLUDED.difficulty_id,
        curriculum = EXCLUDED.curriculum,
        status = EXCLUDED.status;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to seed sample courses: %', SQLERRM;
        RAISE;
END $$;