# Assignment Management 모듈 설계 계획

## 개요
- `src/features/instructor-assignments/backend/schema.ts`: 과제 생성/수정/상태 전환 요청·응답 Zod 스키마 정의.
- `src/features/instructor-assignments/backend/repository.ts`: `assignments` CRUD 및 제출 통계 조회 Supabase 래퍼.
- `src/features/instructor-assignments/backend/service.ts`: 소유자 검증, 필수값 검증, 상태 전환 규칙 적용.
- `src/features/instructor-assignments/backend/route.ts`: `POST/PATCH /api/instructor/courses/:courseId/assignments` 엔드포인트 등록.
- `src/backend/hono/app.ts`: Instructor 과제 라우트 등록.
- `src/features/instructor-assignments/lib/dto.ts`: 프런트 DTO 및 파서.
- `src/features/instructor-assignments/lib/validators.ts`: 과제 폼 Zod 스키마.
- `src/features/instructor-assignments/hooks/useAssignments.ts`: 과제 목록 조회 훅.
- `src/features/instructor-assignments/hooks/useCreateAssignment.ts`: 과제 생성 mutation 훅.
- `src/features/instructor-assignments/hooks/useUpdateAssignment.ts`: 과제 수정/상태 전환 mutation 훅.
- `src/features/instructor-assignments/components/assignment-form.tsx`: 생성/수정 폼 컴포넌트.
- `src/features/instructor-assignments/components/assignment-list.tsx`: 과제 목록/상태 표시 UI.
- `src/features/instructor-assignments/components/assignment-status-toggle.tsx`: 상태 전환 컨트롤.
- `src/app/(protected)/instructor/courses/[courseId]/assignments/page.tsx`: 과제 관리 페이지 셸.

## Diagram
```mermaid
graph TD
  User[Instructor] --> AssignmentsPage[app/(protected)/instructor/courses/[courseId]/assignments/page.tsx]
  AssignmentsPage --> AssignmentListHook[hooks/useAssignments]
  AssignmentsPage --> CreateAssignmentHook[hooks/useCreateAssignment]
  AssignmentsPage --> UpdateAssignmentHook[hooks/useUpdateAssignment]
  AssignmentListHook --> ApiClient[/@/lib/remote/api-client\]
  CreateAssignmentHook --> ApiClient
  UpdateAssignmentHook --> ApiClient
  ApiClient --> AssignmentRoute[backend/route]
  AssignmentRoute --> AssignmentService[backend/service]
  AssignmentService --> AssignmentRepo[backend/repository]
  AssignmentRepo --> Database[(Supabase)]
  AssignmentService --> AssignmentSchema[backend/schema]
  AssignmentsPage --> AssignmentForm[components/assignment-form]
  AssignmentsPage --> AssignmentList[components/assignment-list]
  AssignmentList --> StatusToggle[components/assignment-status-toggle]
  AssignmentForm --> Validators[lib/validators]
  AssignmentListHook --> AssignmentDTO[lib/dto]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `CreateAssignmentRequest`(title, description, dueAt, scoreWeight, instructions, submissionRequirements, lateSubmissionAllowed)
   - `UpdateAssignmentRequest`(partial update)
   - `ChangeAssignmentStatusRequest`(`nextStatus`)
   - `AssignmentResponse`
   - **Unit Test**: 필수값 누락, 잘못된 scoreWeight, 정상 케이스 검증.

2. `repository.ts`
   - `createAssignment(courseId, payload)` → 기본 `status='draft'`
   - `updateAssignment(assignmentId, payload)`
   - `getAssignment(assignmentId)`
   - `listAssignments(courseId)`
   - **Unit Test**: Supabase 호출 파라미터/조건 검증.

3. `service.ts`
   - 소유자 검증 → courseId와 instructor ID 매칭.
   - 생성/수정 시 필수값 확인, scoreWeight 범위(0-100).
   - 상태 전환 규칙: `draft->published`, `published->closed`.
   - **Unit Test**:
     - 타인 과제 접근 → 403.
     - 필수값 누락 → 422.
     - 상태 전환 조건 위반 → 409.
     - 정상 생성/수정/전환 → 성공 응답.

4. `route.ts`
   - `POST /instructor/courses/:courseId/assignments`
   - `PATCH /instructor/courses/:courseId/assignments/:assignmentId`
   - `PATCH /instructor/courses/:courseId/assignments/:assignmentId/status`
   - 세션 instructor ID 추출 → 서비스 호출.
   - **Unit Test**: 성공/권한 없음/검증 실패/서버 오류.

5. `src/backend/hono/app.ts`
   - `registerInstructorAssignmentRoutes(app)` 추가.

### Frontend
6. `lib/validators.ts`
   - 폼 검증 스키마: 제목, 설명, 마감일, 점수 비중, 지침, late 허용 등.
   - **Unit Test**: 필수값 누락/정상 케이스.

7. `lib/dto.ts`
   - `InstructorAssignment`, `AssignmentStatusCounts` 타입 정의.
   - 응답 파싱 실패 시 예외.

8. `hooks/useAssignments.ts`
   - 코스별 과제 목록 조회(`GET /api/instructor/courses/:courseId/assignments`).

9. `hooks/useCreateAssignment.ts`
   - `useMutation`으로 POST 요청, 성공 시 리스트 캐시 무효화.

10. `hooks/useUpdateAssignment.ts`
    - 수정/상태 전환 mutation.
    - 성공 후 리스트 갱신.

11. `components/assignment-form.tsx`
    - `react-hook-form` + zodResolver.
    - 생성/수정 모드 지원.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 필수값 입력 후 생성 | 성공 메시지 |
      | 마감일 과거 값 | 검증 오류 |

12. `components/assignment-list.tsx`
    - 과제 목록, 상태 표시, 수정/상태 변경 버튼.
    - Empty 상태 처리.
    - **QA Sheet**: 상태별 표시, 수정 버튼 동작.

13. `components/assignment-status-toggle.tsx`
    - 상태 전환 컨트롤, 확인 다이얼로그.
    - 규칙 위반 시 안내 메시지.

14. `src/app/(protected)/instructor/courses/[courseId]/assignments/page.tsx`
    - 목록 조회, 생성/수정 모달, 상태 토글 통합.
    - 로딩/에러/empty 상태 처리.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 과제 생성 성공 | 목록 갱신 |
      | 상태 전환 `draft->published` | 성공 메시지 |
      | empty 목록 | empty-state |

### 공통/환경
15. 테스트 인프라
    - `tests/instructor-assignments` 디렉터리에 서비스/헬퍼/훅 테스트 추가.

16. 문서/QA 공유
    - QA 시나리오를 `docs/009/spec.md`와 연결.

17. 후속 TODO
    - 과제 삭제/복제 기능 여부 검토.
    - Learner 제출 통계와 연동 예정.
