# Instructor Course Management 모듈 설계 계획

## 개요
- `src/features/instructor-courses/backend/schema.ts`: 코스 생성/수정/상태 전환 요청·응답 Zod 스키마 정의.
- `src/features/instructor-courses/backend/repository.ts`: `courses` 테이블 CRUD 및 메타데이터 조회 래퍼.
- `src/features/instructor-courses/backend/service.ts`: 소유자 검증, 필수 필드 검증, 상태 전환 규칙 처리.
- `src/features/instructor-courses/backend/route.ts`: `POST/PUT/PATCH /api/instructor/courses` 엔드포인트 등록.
- `src/backend/hono/app.ts`: Instructor 코스 라우트 등록.
- `src/features/instructor-courses/lib/dto.ts`: 프런트 DTO 및 파서.
- `src/features/instructor-courses/lib/validators.ts`: 생성/수정 폼 Zod 스키마.
- `src/features/instructor-courses/hooks/useCreateCourse.ts`: React Query mutation 훅.
- `src/features/instructor-courses/hooks/useUpdateCourse.ts`: 코스 수정 mutation 훅.
- `src/features/instructor-courses/hooks/useCourseList.ts`: Instructor 코스 목록 조회 훅.
- `src/features/instructor-courses/components/course-form.tsx`: 새 코스/수정 폼 컴포넌트.
- `src/features/instructor-courses/components/course-list.tsx`: 코스 목록/상태 표시 UI.
- `src/features/instructor-courses/components/course-status-toggle.tsx`: 상태 전환 컨트롤.
- `src/app/(protected)/instructor/courses/page.tsx`: 코스 관리 페이지 셸.

## Diagram
```mermaid
graph TD
  User[Instructor] --> CoursesPage[app/(protected)/instructor/courses/page.tsx]
  CoursesPage --> CourseListHook[hooks/useCourseList]
  CoursesPage --> CreateCourseHook[hooks/useCreateCourse]
  CoursesPage --> UpdateCourseHook[hooks/useUpdateCourse]
  CourseListHook --> ApiClient[/@/lib/remote/api-client\]
  CreateCourseHook --> ApiClient
  UpdateCourseHook --> ApiClient
  ApiClient --> CourseRoute[backend/route]
  CourseRoute --> CourseService[backend/service]
  CourseService --> CourseRepo[backend/repository]
  CourseRepo --> Database[(Supabase)]
  CourseService --> CourseSchema[backend/schema]
  CoursesPage --> CourseForm[components/course-form]
  CoursesPage --> CourseList[components/course-list]
  CourseList --> StatusToggle[components/course-status-toggle]
  CourseForm --> Validator[lib/validators]
  CourseListHook --> CourseDTO[lib/dto]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `CreateCourseRequest`(title, description, categoryId, difficultyId, curriculum, status optional)
   - `UpdateCourseRequest`(partial update 허용)
   - `ChangeStatusRequest`(`nextStatus`)
   - `CourseResponse`
   - **Unit Test**: 누락 필드/잘못된 status 값/정상 케이스 검증.

2. `repository.ts`
   - `createCourse(payload)` → `status='draft'` 기본값
   - `updateCourse(courseId, payload)`
   - `getCourseById(courseId)`
   - `listCoursesByInstructor(instructorId)`
   - **Unit Test**: Supabase 호출 파라미터 확인, 에러 시 처리.

3. `service.ts`
   - 흐름: 소유자 확인 → 입력 검증 → 상태 전환 규칙 적용(`draft->published`, `published->archived`)
   - 생성 시 필수 필드 검증, 상태 전환 시 필수 필드 채움 여부 확인.
   - **Unit Test**:
     - 타인 코스 수정 → 403.
     - 필수 필드 누락 → 422.
     - 상태 전환 규칙 위반 → 409.
     - 정상 생성/수정/전환 → 성공 응답.

4. `route.ts`
   - `POST /instructor/courses`(생성)
   - `PATCH /instructor/courses/:id`(수정)
   - `PATCH /instructor/courses/:id/status`(상태 전환)
   - 세션 instructor ID 추출, 서비스 호출, `respond` 반환.
   - **Unit Test**: 성공, 권한 없음, 검증 실패, 서버 오류.

5. `src/backend/hono/app.ts`
   - `registerInstructorCourseRoutes(app)` 추가.

### Frontend
6. `lib/validators.ts`
   - 폼용 Zod 스키마(제목/소개/카테고리/난이도/커리큘럼 필수).
   - **Unit Test**: 폼 검증 성공/실패 케이스.

7. `lib/dto.ts`
   - `InstructorCourse`, `CourseStatusCounts` 타입 정의.
   - 응답 파싱 실패 시 예외.

8. `hooks/useCourseList.ts`
   - React Query `useQuery`로 `/api/instructor/courses` GET(목록 엔드포인트 필요하면 추가).
   - 캐시 키: `['instructor','courses']`.

9. `hooks/useCreateCourse.ts`
   - `useMutation`으로 POST `/api/instructor/courses`.
   - 성공 시 리스트 캐시 무효화, 성공 토스트 표시.

10. `hooks/useUpdateCourse.ts`
    - `useMutation`으로 PATCH `/api/instructor/courses/:id`.
    - 상태 전환도 mutation 내에서 처리.

11. `components/course-form.tsx`
    - `react-hook-form` + zodResolver.
    - 생성/수정 모드 지원.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 필수 필드 입력 후 제출 | 성공 메시지 |
      | 필수 필드 누락 | 필드별 오류 표시 |

12. `components/course-list.tsx`
    - 코스 테이블/카드, 상태/수정 버튼.
    - `CourseStatusToggle` 포함.
    - **QA Sheet**: 상태별 표시, 수정 버튼 클릭 동작.

13. `components/course-status-toggle.tsx`
    - 상태 전환 버튼, 확인 다이얼로그.
    - 규칙 위반 시 경고 메시지.

14. `src/app/(protected)/instructor/courses/page.tsx`
    - `useCurrentUser`로 instructor 권한 확인.
    - 코스 목록 조회, 생성/수정 모달 관리.
    - 로딩/에러/empty 상태 처리.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 코스 생성 성공 | 목록 갱신 |
      | 상태 전환 `draft->published` | 성공 메시지 |
      | 빈 목록 | empty-state 메시지 |

15. 접근성/UX
    - 폼 라벨, 모달 포커스 관리, 상태 전환 확인 다이얼로그.

### 공통/환경
16. 테스트 인프라
    - `tests/instructor-courses` 디렉터리에 서비스/헬퍼/훅 테스트 추가.

17. 문서/QA 공유
    - QA 시트 항목을 `docs/008/spec.md`와 연결.

18. 후속 TODO
    - 코스 삭제 기능 필요 시 확장.
    - 메타데이터(카테고리/난이도) 관리 모듈과 연동.
