# Assignment Lifecycle 모듈 설계 계획

## 개요
- `src/features/instructor-assignments/backend/status-schema.ts`: 과제 상태 전환 요청·응답 Zod 스키마 정의.
- `src/features/instructor-assignments/backend/status-service.ts`: 게시/마감 조건 검증 및 상태 업데이트 비즈니스 로직.
- `src/features/instructor-assignments/backend/status-route.ts`: `PATCH /api/instructor/courses/:courseId/assignments/:assignmentId/status` 엔드포인트 등록.
- `src/backend/hono/app.ts`: 상태 전환 라우트 등록.
- `src/features/instructor-assignments/lib/status-dto.ts`: 프런트 상태 전환 응답 DTO.
- `src/features/instructor-assignments/hooks/useAssignmentStatusMutation.ts`: 게시/마감 mutation 훅.
- `src/features/instructor-assignments/components/assignment-status-dialog.tsx`: 상태 전환 확인/경고 UI.
- `src/features/instructor-assignments/components/assignment-status-badge.tsx`: 현재 상태 표시 및 전환 가능한 액션 표시.
- 기존 `src/features/instructor-assignments/components/assignment-list.tsx`: 상태 전환 컨트롤과 통합.

## Diagram
```mermaid
graph TD
  Instructor[Instructor] --> AssignmentList[components/assignment-list]
  AssignmentList --> StatusDialog[components/assignment-status-dialog]
  StatusDialog --> StatusMutationHook[hooks/useAssignmentStatusMutation]
  StatusMutationHook --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> StatusRoute[backend/status-route]
  StatusRoute --> StatusService[backend/status-service]
  StatusService --> AssignmentRepo[backend/repository]
  AssignmentRepo --> Database[(Supabase)]
  StatusService --> StatusSchema[backend/status-schema]
  StatusMutationHook --> StatusDTO[lib/status-dto]
  AssignmentList --> StatusBadge[components/assignment-status-badge]
```

## Implementation Plan
### Backend
1. `status-schema.ts`
   - `ChangeAssignmentStatusRequest` `{ nextStatus: 'published' | 'closed' }`.
   - `AssignmentStatusResponse` `{ status, publishedAt?, closedAt? }`.
   - **Unit Test**: 허용되지 않은 상태 값, 정상 케이스.

2. `status-service.ts`
   - 과제/코스 소유자 확인.
   - 현재 상태 기반 전환 규칙:
     - `draft -> published`: 필수 필드(설명, 마감일, scoreWeight, submissionRequirements, late flag) 모두 존재해야 함.
     - `published -> closed`: 마감 로직, 이미 closed면 409.
   - 게시 시 `published_at` 설정, 마감 시 `closed_at` 설정, `updated_at` 갱신.
   - **Unit Test**:
     - 소유자 아님 → 403.
     - 필수값 누락 → 409/422.
     - 이미 published 상태에서 다시 published → 409.
     - 성공 시 예상 필드 업데이트.

3. `status-route.ts`
   - `PATCH /instructor/courses/:courseId/assignments/:assignmentId/status`.
   - 세션 instructor ID 추출, 스키마 검증, 서비스 호출 후 `respond`.
   - **Unit Test**: 성공, 권한 없음, 검증 실패, 서비스 오류.

4. `src/backend/hono/app.ts`
   - `registerInstructorAssignmentStatusRoutes(app)` 호출 추가.

### Frontend
5. `lib/status-dto.ts`
   - `AssignmentStatusPayload` 타입 정의, 응답 파싱.
   - **Unit Test**: 잘못된 status/타임스탬프 처리.

6. `hooks/useAssignmentStatusMutation.ts`
   - `useMutation`으로 PATCH 요청.
   - 성공 시 과제 목록/상세 캐시 무효화.
   - 오류 코드에 따라 사용자 메시지 분기(`MISSING_REQUIRED_FIELDS`, `ALREADY_CLOSED`).
   - **Unit Test**: MSW 모킹으로 성공/검증 실패/권한 오류 처리.

7. `components/assignment-status-dialog.tsx`
   - 상태 전환 확인 모달, 필요한 경우 부족한 필드 안내.
   - 게시/마감 각각 별도 메시지.
   - **QA Sheet**:
     | 시나리오 | 기대 결과 |
     | --- | --- |
     | 게시 요청 | 필수 정보 체크 + 확인 다이얼로그 |
     | 마감 요청 | 제출 차단 안내 |

8. `components/assignment-status-badge.tsx`
   - 현재 상태( Draft / Published / Closed ) 뱃지, 전환 가능 액션 버튼 노출.

9. 기존 `assignment-list.tsx`
   - `assignment-status-dialog`과 통합, 전환 버튼 클릭 시 모달 열기.
   - 상태 업데이트 성공 후 목록 갱신.
   - **QA Sheet (페이지 통합)**:
     | 시나리오 | 기대 결과 |
     | --- | --- |
     | Draft 과제 게시 성공 | 상태 Published로 변경 |
     | 필수 정보 누락 | 오류 안내 |
     | Published 마감 | 상태 Closed, 제출 버튼 비활성화 |

### 공통/환경
10. 테스트 인프라
    - `tests/instructor-assignments/status` 디렉터리 추가, 서비스/훅 테스트 배치.

11. 문서/QA 공유
    - QA 시나리오를 `docs/011/spec.md`와 연결.

12. 후속 TODO
    - 자동 마감 배치 작업 설계(마감 시간에 맞춰 상태 전환).
    - 상태 전환 이벤트 시 Learner에게 알림 연동.
