# Instructor Dashboard 모듈 설계 계획

## 개요
- `src/features/instructor-dashboard/backend/schema.ts`: 대시보드 요약/채점 대기/최근 제출 응답 Zod 스키마 정의.
- `src/features/instructor-dashboard/backend/repository.ts`: Instructor 코스, 제출 데이터 조회용 Supabase 래퍼.
- `src/features/instructor-dashboard/backend/service.ts`: 코스 상태별 집계, 채점 대기 필터, 최근 제출 정리 로직.
- `src/features/instructor-dashboard/backend/route.ts`: `GET /api/instructor/dashboard` 라우트 등록.
- `src/backend/hono/app.ts`: Instructor 대시보드 라우트 등록.
- `src/features/instructor-dashboard/lib/dto.ts`: 프런트에서 사용하는 DTO 및 파서.
- `src/features/instructor-dashboard/lib/mappers.ts`: 백엔드 응답을 UI 모델로 변환하는 헬퍼.
- `src/features/instructor-dashboard/hooks/useInstructorDashboard.ts`: React Query 훅.
- `src/features/instructor-dashboard/components/course-status-summary.tsx`: 코스 상태별 카드.
- `src/features/instructor-dashboard/components/grading-queue.tsx`: 채점 대기 목록 UI.
- `src/features/instructor-dashboard/components/recent-submissions.tsx`: 최근 제출 리스트.
- `src/features/instructor-dashboard/components/empty-state.tsx`: 코스 없음/데이터 없음 안내.
- `src/app/(protected)/instructor/dashboard/page.tsx`: Instructor 대시보드 페이지 셸.

## Diagram
```mermaid
graph TD
  User[Instructor] --> DashboardPage[app/(protected)/instructor/dashboard/page.tsx]
  DashboardPage --> DashboardHook[hooks/useInstructorDashboard]
  DashboardHook --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> DashboardRoute[backend/route]
  DashboardRoute --> DashboardService[backend/service]
  DashboardService --> DashboardRepo[backend/repository]
  DashboardRepo --> Database[(Supabase)]
  DashboardService --> DashboardSchema[backend/schema]
  DashboardHook --> DashboardDTO[lib/dto]
  DashboardPage --> CourseSummary[components/course-status-summary]
  DashboardPage --> GradingQueue[components/grading-queue]
  DashboardPage --> RecentSubmissions[components/recent-submissions]
  DashboardPage --> EmptyState[components/empty-state]
  CourseSummary --> Mappers[lib/mappers]
  GradingQueue --> Mappers
  RecentSubmissions --> Mappers
```

## Implementation Plan
### Backend
1. `schema.ts`
   - 응답 구조: `courses`(상태/카운트, published/draft/archived 목록), `pendingGrading`(과제 ID, 제목, 제출자, 제출 시간, 상태), `recentSubmissions`(최근 N건).
   - Instructor ID는 세션에서 추출.
   - **Unit Test**: Zod로 응답 파싱 성공/실패(상태 문자열, 날짜 포맷 등) 검증.

2. `repository.ts`
   - `getInstructorCourses(instructorId)` → 상태 포함.
   - `getPendingGradingSubmissions(instructorId)` → `status IN ('submitted','resubmission_required')` 필터.
   - `getRecentSubmissions(instructorId, limit)` → 제출 시간 역순.
   - **Unit Test**: Supabase 모킹으로 쿼리 조건/선택 컬럼 확인.

3. `service.ts`
   - 권한 검증: 세션 instructor ID 사용.
   - 코스 목록 상태별 그룹화.
   - 제출 데이터 조인 후 필요한 필드 매핑(제출자 이름, 코스, 과제 제목 등).
   - 최근 제출은 limit(예: 20) 적용.
   - **Unit Test**:
     - 코스 없음 → 빈 데이터 구조.
     - 채점 대기 없음 → 빈 리스트.
     - 데이터 정렬(최신 제출 순) 검증.
     - Instructor가 소유하지 않은 데이터 접근 방지.

4. `route.ts`
   - `GET /instructor/dashboard` 등록, 세션 instructor ID 없으면 401.
   - 서비스 호출 결과를 `respond`로 반환.
   - **Unit Test**: 성공, 401, 500 케이스.

5. `src/backend/hono/app.ts`
   - `registerInstructorDashboardRoutes(app)` 추가.

### Frontend
6. `lib/dto.ts`
   - `InstructorDashboardResponse`, `CourseSummary`, `PendingGradingItem`, `RecentSubmissionItem` 타입 정의.
   - **Unit Test**: DTO 파싱 실패 시 예외 발생 여부 확인.

7. `lib/mappers.ts`
   - UI 포맷(예: 상태별 카드 데이터, 제출자 표기) 변환 함수.
   - **Unit Test**: 예제 데이터 변환 결과 검증.

8. `hooks/useInstructorDashboard.ts`
   - React Query `useQuery`로 `/api/instructor/dashboard` 호출, staleTime 60초.
   - 에러 시 `extractApiErrorMessage` 활용.
   - **Unit Test**: MSW로 성공/401/500 응답 처리.

9. `components/course-status-summary.tsx`
   - Draft/Published/Archived 카드, 코스 수/CTA 버튼.
   - **QA Sheet**:
     | 시나리오 | 기대 결과 |
     | --- | --- |
     | Published 3, Draft 1 | 카드에 정확히 표시 |
     | 코스 없음 | Empty 안내 표시 |

10. `components/grading-queue.tsx`
    - 채점 대기 리스트, 제출자/코스/과제/제출 시간 표시, 채점 이동 CTA.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 채점 대기 2건 | 리스트에 2건 노출 |
      | 없음 | "채점 대기 없음" 안내 |

11. `components/recent-submissions.tsx`
    - 최근 제출 타임라인/테이블, late 여부, 상태 표시.
    - **QA Sheet**: 20건 제한, 없는 경우 안내.

12. `components/empty-state.tsx`
    - 코스 없음/데이터 없음 시 안내 메시지 및 코스 생성 CTA.

13. `src/app/(protected)/instructor/dashboard/page.tsx`
    - 인증 가드(`useCurrentUser`), `useInstructorDashboard` 호출.
    - 로딩 스켈레톤, 에러 메시지, empty state 분기.
    - 각 컴포넌트 배치 및 레이아웃.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 정상 응답 | 코스 카드 + 채점 대기 + 최근 제출 표시 |
      | 코스 없음 | empty-state 노출 |
      | 401 | 로그인 리다이렉션 |
      | 500 | 오류 경고 + 재시도 |

### 공통/환경
14. 테스트 인프라
    - `tests/instructor-dashboard` 디렉터리에 서비스/헬퍼/훅 테스트 추가.

15. 문서/QA 공유
    - QA 시트 항목을 `docs/007/spec.md`와 함께 전달.

16. 후속 TODO
    - 코스/과제 관리 모듈과 라우팅 통합.
    - 채점 완료 시 실시간 알림(웹소켓) 고려.
