# Assignment Detail 모듈 설계 계획

## 개요
- `src/features/assignments/backend/schema.ts`: 과제 상세/제출 상태 조회 요청·응답 Zod 스키마 정의.
- `src/features/assignments/backend/repository.ts`: `assignments`, `enrollments`, `assignment_submissions`에 대한 Supabase 조회 래퍼.
- `src/features/assignments/backend/service.ts`: 접근 권한 검증, 과제 상태 확인, 제출 상태 조합 로직.
- `src/features/assignments/backend/route.ts`: `GET /api/courses/:courseId/assignments/:assignmentId` 엔드포인트 등록.
- `src/backend/hono/app.ts`: `registerAssignmentRoutes` 호출 추가.
- `src/features/assignments/lib/dto.ts`: 프런트에서 사용하는 DTO 및 파서(Zod 기반).
- `src/features/assignments/lib/status-helpers.ts`: 제출 가능 여부, 마감 상태 등을 계산하는 헬퍼.
- `src/features/assignments/hooks/useAssignmentDetail.ts`: React Query 기반 상세 조회 훅.
- `src/features/assignments/components/assignment-detail-panel.tsx`: 과제 상세 UI(설명, 마감, 제출 상태).
- `src/features/assignments/components/assignment-actions.tsx`: 제출 버튼/비활성 안내 영역.
- `src/app/courses/[courseId]/assignments/[assignmentId]/page.tsx`: 과제 상세 페이지 셸.
- `src/features/assignments/components/assignment-not-found.tsx`: 접근 권한/404 등의 안내 UI.

## Diagram
```mermaid
graph TD
  User[사용자] --> AssignmentPage[app/courses/[courseId]/assignments/[assignmentId]/page.tsx]
  AssignmentPage --> DetailHook[hooks/useAssignmentDetail]
  DetailHook --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> AssignmentRoute[backend/route]
  AssignmentRoute --> AssignmentService[backend/service]
  AssignmentService --> AssignmentRepo[backend/repository]
  AssignmentRepo --> Database[(Supabase)]
  AssignmentService --> AssignmentSchema[backend/schema]
  DetailHook --> AssignmentDTO[lib/dto]
  AssignmentPage --> DetailPanel[components/assignment-detail-panel]
  AssignmentPage --> ActionPanel[components/assignment-actions]
  AssignmentPage --> NotFound[components/assignment-not-found]
  DetailPanel --> StatusHelpers[lib/status-helpers]
  ActionPanel --> StatusHelpers
```

## Implementation Plan
### Backend
1. `schema.ts`
   - 요청 파라미터(`courseId`, `assignmentId`, `learnerId`)와 응답(`assignment`, `submission`, `canSubmit`, `isLate`) 스키마 정의.
   - 과제 데이터: 제목, 설명, 마감일, 점수 비중, 제출 지침, late 허용 여부.
   - 제출 데이터: 최근 제출 상태, 제출 시간, 피드백 여부.
   - **Unit Test**: 유효 데이터 파싱, 잘못된 상태 코드/마감일 형식 오류 검증.

2. `repository.ts`
   - 함수: `getEnrollment(learnerId, courseId)`, `getAssignment(courseId, assignmentId)`, `getSubmission(learnerId, assignmentId)`.
   - 각 함수는 필요한 컬럼만 반환하고 `status` 필터 포함(`assignments.status='published'`).
   - **Unit Test**: Supabase 모킹으로 올바른 테이블/조건이 호출되는지 확인.

3. `service.ts`
   - 순서: enrollment 확인 → assignment 확인 → submission 조회.
   - 과제 상태가 `closed`이면 `canSubmit=false` 설정.
   - 마감일과 late 허용 여부에 따라 `canSubmit`/`isLate` 계산.
   - 반환 구조: 과제 DTO + 제출 상태 DTO + UI 표시용 플래그.
   - **Unit Test**:
     - 등록되지 않은 Learner → 403 오류.
     - unpublished 과제 → 404 처리.
     - closed 과제 → `canSubmit=false`, 안내 문구 데이터 포함.
     - late 허용 여부 시나리오(허용 true/false) 검증.

4. `route.ts`
   - Hono 라우트에서 세션 사용자 ID 추출, 파라미터 검증.
   - 서비스 호출 후 `respond`로 성공/오류 응답 반환.
   - **Unit Test**: Hono `app.request`로 성공, 403, 404, 500 케이스 확인.

5. `src/backend/hono/app.ts`
   - `registerAssignmentRoutes(app)` 추가, 기존 라우트와 순서 정리.

### Frontend
6. `lib/dto.ts`
   - 백엔드 응답을 `AssignmentDetail`, `AssignmentSubmissionState` 등으로 매핑.
   - 제출 가능 여부/late 여부 포함.
   - **Unit Test**: DTO 파싱 실패(필드 누락/형식 오류) 시 예외 발생 확인.

7. `lib/status-helpers.ts`
   - `buildSubmissionStatusLabel`, `canShowSubmitButton`, `lateBadge` 등 헬퍼 함수.
   - Timezone 고려는 UTC 기준으로 처리, 필요 시 `date-fns` 사용.
   - **Unit Test**: 마감/late 조합에 따른 결과 검증.

8. `hooks/useAssignmentDetail.ts`
   - React Query `useQuery`로 `/api/courses/:courseId/assignments/:assignmentId` 호출.
   - 세션 만료 시 401 응답을 감지하여 로그인 페이지 리다이렉션 처리.
   - **Unit Test**: MSW 모킹으로 성공/403/404/500 시나리오 테스트.

9. `components/assignment-detail-panel.tsx`
   - 과제 정보(제목, 설명, 마감, 점수 비중, 제출 지침) 렌더링.
   - late 허용 여부 및 close 상태 표시 뱃지.
   - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 과제 출제 중 | 마감일/제출 지침 표시 |
      | 과제 closed | 상단에 "제출 종료" 뱃지 |
      | late 허용 true | 안내 문구 표시 |

10. `components/assignment-actions.tsx`
    - 제출 버튼, 비활성 안내, 최근 제출 정보 표시.
    - `canSubmit`이 false이면 버튼 비활성화 및 이유 메시지.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 제출 가능 | 버튼 활성화, 클릭 시 제출 페이지 이동 |
      | 마감 후 late 허용 false | 버튼 비활성화 + 안내 |
      | 제출 기록 없음 | "제출 기록 없음" 표시 |

11. `components/assignment-not-found.tsx`
    - 접근 권한 없음/과제 미공개/서버 오류 시 공통 안내 UI.

12. `src/app/courses/[courseId]/assignments/[assignmentId]/page.tsx`
    - `useAssignmentDetail` 호출, 로딩 스켈레톤/에러/성공 UI 분기.
    - 성공 시 `AssignmentDetailPanel` + `AssignmentActions` 렌더링.
    - 403/404 시 `AssignmentNotFound` 사용, 500 시 재시도 버튼.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 정상 데이터 | 상세/액션 컴포넌트 표시 |
      | 403 응답 | 접근 불가 안내 |
      | 404 응답 | "과제를 찾을 수 없음" 메시지 |
      | 500 응답 | 오류 알림 + 재시도 |

13. 라우팅 통합
    - 과제 목록(기존 구현 시)에서 해당 페이지 링크(`/courses/{courseId}/assignments/{assignmentId}`) 사용.

### 공통/환경
14. 테스트 인프라
    - `tests/assignments` 디렉터리에 서비스/헬퍼/훅 테스트 배치.

15. 문서
    - QA 시나리오를 `docs/004/spec.md` 참고로 공유.

16. 후속 TODO
    - 제출 UI 연동(플로우 5번)과 연결될 수 있도록 CTA 링크 명확화.
    - Instructor용 과제 도구와 공통 DTO 사용 여부 검토.
