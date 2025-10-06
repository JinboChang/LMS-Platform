# Course Catalog & Enrollment 모듈 설계 계획

## 개요
- `src/features/courses/backend/schema.ts`: 코스 검색/상세 및 수강신청/취소 요청·응답 Zod 스키마 정의.
- `src/features/courses/backend/error.ts`: 코스/수강신청 도메인 전용 에러 코드 및 타입 집합.
- `src/features/courses/backend/service.ts`: Supabase 읽기/쓰기를 통한 검색, 상세 조회, 신청, 취소 비즈니스 로직.
- `src/features/courses/backend/route.ts`: `/api/courses`(GET list/detail)와 `/api/enrollments`(POST/PATCH) 엔드포인트 등록.
- `src/backend/hono/app.ts`: 코스 관련 라우트 등록 추가.
- `src/features/courses/lib/dto.ts`: 프런트에서 사용하는 DTO 및 응답 파서(Zod).
- `src/features/courses/lib/query-keys.ts`: React Query 키 상수 정의.
- `src/features/courses/lib/filter-options.ts`: 카테고리/난이도/정렬 옵션 상수.
- `src/features/courses/hooks/useCourseSearch.ts`: 검색 요청을 수행하는 React Query 훅.
- `src/features/courses/hooks/useCourseDetail.ts`: 개별 코스 상세 조회 훅.
- `src/features/courses/hooks/useEnrollmentMutation.ts`: 신청/취소 처리 React Query mutation 훅.
- `src/features/courses/components/course-filters.tsx`: 검색어·필터 입력 UI.
- `src/features/courses/components/course-card.tsx`: 코스 카드 UI(신청 버튼 포함).
- `src/features/courses/components/course-list.tsx`: 검색 결과 리스트 컴포넌트.
- `src/features/courses/components/course-detail-dialog.tsx`: 코스 상세 & 신청/취소 UI.
- `src/app/courses/page.tsx`: 코스 카탈로그 페이지, 필터/리스트/상세 연동.
- `src/features/courses/hooks/useEnrollmentGuard.ts`: 신청 전 Learner 상태/역할 검증 공통 훅.
- `src/features/courses/lib/enrollment-status.ts`: 신청 상태 상수 및 헬퍼.
- `src/features/courses/components/enrollment-toast.tsx`: 신청/취소 결과 토스트 UI.
- `src/features/courses/backend/repository.ts`: Supabase 쿼리 전담 레이어(테스트 용이성 확보).

## Diagram
```mermaid
graph TD
  User[사용자 입력] --> CoursesPage[app/courses/page.tsx]
  CoursesPage --> Filters[components/course-filters]
  CoursesPage --> CourseList[components/course-list]
  CourseList --> CourseCard[components/course-card]
  CourseCard --> DetailDialog[components/course-detail-dialog]
  Filters --> SearchHook[hooks/useCourseSearch]
  CourseList --> SearchHook
  DetailDialog --> DetailHook[hooks/useCourseDetail]
  DetailDialog --> EnrollmentMutation[hooks/useEnrollmentMutation]
  EnrollmentMutation --> ApiClient[/@/lib/remote/api-client\]
  DetailHook --> ApiClient
  ApiClient --> HonoRoute[backend/route]
  HonoRoute --> Service[backend/service]
  Service --> Repository[backend/repository]
  Repository --> Database
  Service --> EnrollmentStatus[lib/enrollment-status]
  CoursesPage --> QueryKeys[lib/query-keys]
  CoursesPage --> FilterOptions[lib/filter-options]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - 리스트 쿼리 파라미터(검색어, 카테고리 ID, 난이도 ID, 정렬키)와 응답(코스 메타, 페이징 옵션)을 Zod로 정의.
   - `CourseDetailResponse`, `EnrollmentRequest`, `EnrollmentResponse`, `CancelEnrollmentRequest` 등 통일된 스키마 제공.
   - **Unit Test**: 정상/비정상 파라미터, 응답 매핑을 `vitest`로 검증(예: 잘못된 정렬키, 누락된 필터 등이 오류).

2. `error.ts`
   - `courseErrorCodes` (`COURSE_NOT_FOUND`, `COURSE_UNPUBLISHED` 등)와 `enrollmentErrorCodes` (`DUPLICATE_ENROLLMENT`, `NOT_ENROLLED`) 분리 정의.
   - 서비스에서 사용할 타입 유니언(`CourseServiceError`, `EnrollmentServiceError`).

3. `repository.ts`
   - Supabase 클라이언트를 받아 `fetchCourses`, `fetchCourseById`, `insertEnrollment`, `updateEnrollmentStatus`, `getEnrollmentByCourse` 함수 구현.
   - 각 함수에서 SQL 조인/필터를 캡슐화하여 서비스가 비즈니스 로직에 집중.
   - **Unit Test**: Supabase 호출을 `vi.fn()`으로 모킹해 호출 파라미터 확인, 예상 결과 반환.

4. `service.ts`
   - 검색/상세 조회: 스키마 검증 후 레포지토리 호출, `status='published'` 필터 강제.
   - 신청: 중복 체크 → `insertEnrollment`, 성공 시 `success` 반환.
   - 취소: 존재 여부 및 현재 상태 확인 → `updateEnrollmentStatus('cancelled')`.
   - 에러 발생 시 `failure`로 매핑(에러 코드/메시지).
   - **Unit Test**:
     - 검색: 정상, 필터 오류, unpublished 코스 요청.
     - 신청: 중복, 성공, DB 오류 시 실패 코드 확인.
     - 취소: 이미 취소된 경우 멱등 응답, 미등록 코스 취소 시 오류.

5. `route.ts`
   - `GET /courses`: 리스트 반환.
   - `GET /courses/:id`: 상세 정보.
   - `POST /enrollments`: 신청 처리.
   - `PATCH /enrollments/:id`: 취소 처리.
   - 각 핸들러에서 Zod 결과 검사 후 `respond` 호출, 실패 시 400/409/500 대응.
   - **Unit Test**: Hono `app.request` 이용해 요청/응답 상태, 바디 구조 검증.

6. `app.ts`
   - `registerCourseRoutes(app)`를 추가.
   - 기존 example/onboarding 라우트와 충돌 없는지 확인.

### Frontend
7. `lib/dto.ts`
   - 백엔드 응답 스키마를 재사용하여 `CourseSummary`, `CourseDetail`, `EnrollmentPayload` 등의 타입을 구성.
   - **Unit Test**: DTO 파싱 실패 사례(예: 잘못된 날짜 포맷) 검증.

8. `lib/query-keys.ts`
   - `courses.list`, `courses.detail(courseId)`, `enrollments.byCourse(courseId)` 등 key 정의.

9. `lib/filter-options.ts`
   - 카테고리/난이도 옵션을 상수화, label/값 매핑.
   - 추후 Operator가 관리하는 메타데이터와 연동 가능하도록 TODO 코멘트.

10. `lib/enrollment-status.ts`
    - `ACTIVE`, `CANCELLED` 등 상태 문자열과 헬퍼 함수(`isActiveEnrollment`) 제공.

11. `hooks/useCourseSearch.ts`
    - 검색 파라미터를 받아 React Query `useQuery` 활용.
    - 쿼리 파라미터 직렬화, 오류 메시지 추출(`extractApiErrorMessage`).
    - **Unit Test**: `renderHook` + MSW로 성공/에러 시 메시지 확인.

12. `hooks/useCourseDetail.ts`
    - 코스 ID로 상세 조회, 캐시 공유.
    - 에러 발생 시 예외 처리(404 → 사용자 안내).

13. `hooks/useEnrollmentMutation.ts`
    - 신청/취소를 mutation으로 제공.
    - 성공 시 관련 쿼리 무효화(`courses.detail`, `courses.list`).
    - FE 에러 코드별 메시지 매핑.
    - **Unit Test**: mutation 성공/실패, 중복 신청 응답 처리.

14. `hooks/useEnrollmentGuard.ts`
    - `useCurrentUser`와 연동해 Learner 역할인지, 온보딩 완료인지 확인.
    - 미충족 시 로그인/온보딩 페이지로 안내(라우터 push).
    - **QA 확인**: 권한 미충족 시 가드 동작.

15. `components/course-filters.tsx`
    - `use client`; `react-hook-form` + `zodResolver`로 필터 폼 구현.
    - 검색/필터 제출 시 상위 컴포넌트 콜백으로 전달.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 검색어만 입력 후 검색 | 해당 검색어 기준 결과 표시 |
      | 필터 조합 적용 | 카테고리/난이도/정렬 반영 결과 |
      | 잘못된 값 입력 | 즉시 오류 메시지 표시 |

16. `components/course-card.tsx`
    - 코스 요약 정보, 신청/취소 버튼 포함.
    - 버튼 클릭 시 `useEnrollmentMutation` 호출.
    - 상태에 따라 CTA 문구/스타일 변경.
    - **QA Sheet**: 신청 중 로딩 표시, 성공/실패 메시지.

17. `components/course-list.tsx`
    - 리스트/그리드 뷰, 로딩/빈 상태 처리.
    - 아이템 클릭 시 상세 다이얼로그 오픈.

18. `components/course-detail-dialog.tsx`
    - 다이얼로그 UI, 상세 정보 표시.
    - 신청/취소 CTA, 가드 미충족 시 안내 문구.
    - **QA Sheet**: 상세 정보 정확도, 신청/취소 플로우.

19. `components/enrollment-toast.tsx`
    - 신청/취소 결과를 사용자에게 알리는 토스트 컴포넌트, `useToast` 기반.

20. `hooks/useCourseSearch` & components 연동을 `src/app/courses/page.tsx`에서 구성.
    - 페이지 수준 상태 관리(검색 파라미터, 선택 코스 ID).
    - 인증/역할 체크 후 비로그인/Instructor 접근 시 리다이렉션.
    - **QA Sheet**: 전체 플로우(검색→상세→신청/취소) 및 비로그인 접근 시나리오.

21. `useEnrollmentMutation` 호출 시 `enrollment-toast` 사용.

22. `useCourseDetail`/`useCourseSearch` 요청 실패 시 재시도 버튼 및 오류 안내.

### 공통/환경
23. `package.json`
    - 이미 `vitest` 추가되어 있다면 활용, 없으면 추가.
    - `test` 스크립트 업데이트(`vitest`).

24. `vitest.config.ts` & `setupTests.ts`
    - 온보딩 계획과 공용 설정 사용(React Testing Library, MSW 등).

25. 문서 업데이트
    - `docs/002/spec.md`와 연동해 QA 시나리오 체크리스트 공유.

26. 추후 연동 고려
    - Operator가 관리하는 카테고리/난이도 메타 데이터와 동기화 TODO.
    - Learner 대시보드 반영을 위해 `courses` feature와 `dashboard` feature 간 캐시/이벤트 통신 설계 고려.
