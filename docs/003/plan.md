# Learner Dashboard 모듈 설계 계획

## 개요
- `src/features/dashboard/backend/schema.ts`: 대시보드 개요 API 요청/응답 및 내부 계산에 필요한 Zod 스키마 정의.
- `src/features/dashboard/backend/repository.ts`: `enrollments`, `courses`, `assignments`, `assignment_submissions` 조회 전용 Supabase 래퍼.
- `src/features/dashboard/backend/service.ts`: 데이터 취합·진행률 계산·임박 과제/최근 피드백 선별 비즈니스 로직.
- `src/features/dashboard/backend/route.ts`: `GET /api/dashboard/overview` 엔드포인트 등록.
- `src/backend/hono/app.ts`: `registerDashboardRoutes` 추가.
- `src/features/dashboard/lib/dto.ts`: 프런트에서 사용하는 타입/파서(코스 요약, 진행률, 임박 과제, 피드백 항목).
- `src/features/dashboard/lib/mappers.ts`: 백엔드 응답을 프런트 표현 모델로 변환하는 헬퍼.
- `src/features/dashboard/hooks/useDashboardOverview.ts`: React Query 기반 대시보드 데이터 Fetch 훅.
- `src/features/dashboard/components/dashboard-summary.tsx`: 대시보드 상단 요약 영역(총 코스 수, 평균 진행률 등).
- `src/features/dashboard/components/course-progress-grid.tsx`: 코스 카드 목록 및 진행률 표시.
- `src/features/dashboard/components/upcoming-assignments.tsx`: 임박 과제 리스트.
- `src/features/dashboard/components/recent-feedback.tsx`: 최근 피드백 타임라인.
- `src/features/dashboard/components/dashboard-empty-state.tsx`: 수강 코스가 없을 때의 안내 UI.
- `src/app/(protected)/dashboard/page.tsx`: 기존 페이지를 실제 대시보드 구성요소로 교체.
- `src/features/dashboard/lib/formatters.ts`: 진행률/남은 시간 등 표시용 포맷터(재사용 가능).

## Diagram
```mermaid
graph TD
  User[사용자] --> DashboardPage[app/(protected)/dashboard/page.tsx]
  DashboardPage --> DashboardHook[hooks/useDashboardOverview]
  DashboardHook --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> DashboardRoute[backend/route]
  DashboardRoute --> DashboardService[backend/service]
  DashboardService --> DashboardRepo[backend/repository]
  DashboardRepo --> Database[(Supabase)]
  DashboardService --> DashboardSchema[backend/schema]
  DashboardHook --> DashboardDTO[lib/dto]
  DashboardPage --> SummaryComp[components/dashboard-summary]
  DashboardPage --> ProgressGrid[components/course-progress-grid]
  DashboardPage --> UpcomingComp[components/upcoming-assignments]
  DashboardPage --> FeedbackComp[components/recent-feedback]
  DashboardPage --> EmptyState[components/dashboard-empty-state]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `DashboardOverviewResponse`(코스 배열, 임박 과제, 최근 피드백, 통계 등) 정의.
   - 코스 항목은 진행률 `0-100` 범위, 임박 과제는 마감 타임스탬프 필수, 피드백 항목은 `feedbackUpdatedAt` 포함.
   - **Unit Test**: 정상 응답 파싱, 진행률 범위 벗어난 값/잘못된 날짜 등의 실패 케이스 검증.

2. `repository.ts`
   - 함수: `getActiveEnrollments(learnerId)`, `getAssignmentsByCourse(courseIds)`, `getSubmissionsByCourse(courseIds)`.
   - Supabase 쿼리 시 필요한 컬럼만 반환, `status` 필터 포함.
   - **Unit Test**: Supabase 클라이언트를 모킹하여 올바른 테이블/필터가 호출되는지 확인.

3. `service.ts`
   - 레포지토리 결과를 조합하여 코스별 진행률(`submitted/total`), 임박 과제(마감 <= 48시간), 최근 피드백(최신 3건) 계산.
   - 전체 진행률 평균, 총 활성 코스 수 등 통계 포함.
   - 권한 체크: 요청자 ID와 Supabase 세션 ID 비교.
   - **Unit Test**:
     - 코스/과제/제출 3가지 조합으로 진행률 계산 검증.
     - 임박 과제 필터(48시간 경계) 테스트.
     - 피드백 정렬 및 상위 3건 제한 테스트.
     - 코스 없음 시 빈 구조 반환 확인.

4. `route.ts`
   - `GET /dashboard/overview` 등록, 세션에서 사용자 ID 추출.
   - 스키마 검증 후 `respond` 사용, 오류 코드에 따라 401/500 등 처리.
   - **Unit Test**: Hono `app.request`로 인증 여부, 빈 결과, 일반 성공 케이스 확인.

5. `src/backend/hono/app.ts`
   - `registerDashboardRoutes(app)` 호출 추가.
   - 기존 라우트와 충돌 없는지 확인.

### Frontend
6. `lib/dto.ts`
   - 백엔드 응답 스키마를 그대로 재사용해 `DashboardOverview`, `DashboardCourse`, `UpcomingAssignment`, `RecentFeedback` 타입 정의.
   - **Unit Test**: 응답 파싱이 실패할 때(잘못된 필드) 에러가 발생하는지 확인.

7. `lib/mappers.ts`
   - API 응답을 UI 표시 모델로 변환(예: 진행률 → 퍼센트 문자열, 마감까지 남은 시간 계산 등).
   - **Unit Test**: 변환 함수가 예상 문자열/상태를 반환하는지 검증.

8. `lib/formatters.ts`
   - 남은 시간(`dueAt` → `D일 HH:MM`), 진행률 텍스트 등 포맷터 구성.
   - 다른 모듈과 공유 가능하도록 순수 함수로 구현.

9. `hooks/useDashboardOverview.ts`
   - React Query `useQuery`로 `/api/dashboard/overview` 호출.
   - 캐시 키: `['dashboard','overview']`, 60초 `staleTime`.
   - 오류 시 `extractApiErrorMessage` 활용.
   - **Unit Test**: MSW 모킹으로 성공/401/500 응답 처리, 빈 데이터 UI 표시 여부.

10. `components/dashboard-summary.tsx`
    - 총 코스 수, 평균 진행률, 임박 과제 수 등의 하이라이트 카드 표시.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 활성 코스 3개, 평균 70% | 카드에 정확히 3/70% 표시 |
      | 활성 코스 0개 | Empty 상태 메시지 표시 |

11. `components/course-progress-grid.tsx`
    - 각 코스 카드(제목, 진행률, CTA 링크).
    - 진행률 원형/바 차트(간단한 Tailwind 조합).
    - **QA Sheet**: 진행률 경계값(0%, 100%), 클릭 시 라우팅 확인.

12. `components/upcoming-assignments.tsx`
    - 임박 과제 리스트, 마감까지 남은 시간 표시, 없는 경우 안내 문구.
    - **QA Sheet**: 48시간 경계 처리, 빈 상태.

13. `components/recent-feedback.tsx`
    - 최근 피드백 카드/타임라인 형식, 점수/상태 표시.
    - **QA Sheet**: 3건 제한, 피드백 없음 시 안내.

14. `components/dashboard-empty-state.tsx`
    - 수강 코스 없을 때 CTA(코스 검색 페이지 이동) 제공.

15. `src/app/(protected)/dashboard/page.tsx`
    - 인증 가드(`useCurrentUser`), `useDashboardOverview` 호출.
    - 로딩 스켈레톤, 에러 상태(재시도 버튼), 빈 상태 컴포넌트 사용.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 정상 응답 | 요약/코스/임박/피드백 섹션 노출 |
      | 빈 데이터 | empty-state 및 CTA 노출 |
      | 401 응답 | 로그인 페이지 리다이렉션 |
      | 500 응답 | 오류 경고 + 재시도 버튼 |

16. 시각적 검증
    - Tailwind 활용, light/theme 영향 확인.
    - 스크린 리더 접근성(섹션 제목, progressbar `aria` 속성) 고려.

### 공통/환경
17. 테스트 인프라
    - 기존 `vitest` 설정을 활용, 필요 시 `tests/dashboard` 디렉터리에 단위 테스트 추가.

18. 문서/QA 공유
    - QA 시나리오를 `docs/003/spec.md`와 연동하여 팀 공유.

19. 후속 연동 고려
    - 코스 검색 모듈과 캐시 공유(수강신청 후 대시보드 자동 갱신) TODO 주석으로 남김.
