# Assignment Submission 모듈 설계 계획

## 개요
- `src/features/assignments/backend/submission-schema.ts`: 제출/재제출 요청 및 응답 Zod 스키마 정의.
- `src/features/assignments/backend/submission-repository.ts`: `assignments`, `enrollments`, `assignment_submissions`에 대한 Supabase 액세스 래퍼.
- `src/features/assignments/backend/submission-service.ts`: 제출 가능 여부 검증, late 처리, UPSERT 로직.
- `src/features/assignments/backend/submission-route.ts`: `POST /api/assignments/:assignmentId/submissions` 라우트 등록.
- `src/backend/hono/app.ts`: 제출 라우트 등록.
- `src/features/assignments/lib/submission-dto.ts`: 프런트에서 사용하는 제출 응답 DTO.
- `src/features/assignments/lib/submission-validators.ts`: 제출 폼 검증용 Zod 스키마 및 URL 유효성 체크.
- `src/features/assignments/hooks/useSubmitAssignment.ts`: React Query mutation 훅.
- `src/features/assignments/components/assignment-submit-form.tsx`: 텍스트/링크 입력 UI + 버튼.
- `src/features/assignments/components/assignment-submit-status.tsx`: 현재 제출 상태/late 여부 표시.
- `src/features/assignments/components/assignment-submit-result.tsx`: 성공/실패 메시지와 재시도/재제출 안내.
- `src/features/assignments/lib/submission-status-helpers.ts`: 제출 상태 라벨/late 안내 헬퍼.

## Diagram
```mermaid
graph TD
  User[사용자] --> SubmitForm[components/assignment-submit-form]
  SubmitForm --> SubmitMutation[hooks/useSubmitAssignment]
  SubmitMutation --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> SubmissionRoute[backend/submission-route]
  SubmissionRoute --> SubmissionService[backend/submission-service]
  SubmissionService --> SubmissionRepo[backend/submission-repository]
  SubmissionRepo --> Database[(Supabase)]
  SubmissionService --> SubmissionSchema[backend/submission-schema]
  SubmitMutation --> SubmissionDTO[lib/submission-dto]
  SubmitForm --> Validators[lib/submission-validators]
  SubmitForm --> SubmitStatus[components/assignment-submit-status]
  SubmitResult[components/assignment-submit-result] --> SubmitMutation
```

## Implementation Plan
### Backend
1. `submission-schema.ts`
   - 요청 바디: `textSubmission`, `linkSubmission` (하나 이상 필수), 세션의 `learnerId`는 컨텍스트에서 추출.
   - 응답: `status`, `late`, `submittedAt`, `message` 등 정의.
   - **Unit Test**: 비어 있는 값/잘못된 URL/정상 데이터 파싱 테스트.

2. `submission-repository.ts`
   - `getEnrollment(learnerId, courseId)` → `status` 확인.
   - `getAssignment(assignmentId)` → `status`, `dueAt`, `late_submission_allowed`.
   - `getLatestSubmission(assignmentId, learnerId)`.
   - `upsertSubmission(payload)` → 최신 제출로 저장.
   - **Unit Test**: Supabase 호출 파라미터/조건 검증.

3. `submission-service.ts`
   - 흐름: enrollment 확인 → assignment 확인 → 마감 및 late 정책 검사 → existing submission 업데이트.
   - late 허용 시 `late=true`, 마감 이후 late 허용 false이면 403 반환.
   - `submission_text`/`submission_link` 저장, 이전 제출 있을 경우 덮어쓰기.
   - **Unit Test**:
     - 활성 수강 아님 → 403.
     - 과제 unpublished/closed → 403/409.
     - 마감 이후 late 허용 false → 403.
     - late 허용 true → `late=true` 응답.
     - 기존 제출 업데이트 → submittedAt 갱신.

4. `submission-route.ts`
   - `POST` 라우트 등록, 세션에서 `learnerId` 추출.
   - 요청 바디 Zod 검증, 서비스 호출 후 `respond`로 반환.
   - **Unit Test**: 성공/403/409/500 시나리오 확인(Hono `app.request`).

5. `src/backend/hono/app.ts`
   - `registerAssignmentSubmissionRoutes(app)` 추가 위치 명시.

### Frontend
6. `lib/submission-validators.ts`
   - 제출 폼 전용 Zod 스키마(텍스트 1자 이상, URL 형식 검증).
   - **Unit Test**: 빈 입력/잘못된 URL/정상 케이스.

7. `lib/submission-dto.ts`
   - 백엔드 응답을 `AssignmentSubmissionResponse` 타입으로 정의.
   - 응답 파싱 실패 시 예외.

8. `lib/submission-status-helpers.ts`
   - `buildSubmitSuccessMessage`, `isLateSubmission`, `submissionStateBadge` 등 헬퍼 함수.
   - **Unit Test**: 상태 조합에 따른 메시지 검증.

9. `hooks/useSubmitAssignment.ts`
   - `useMutation`으로 `/api/assignments/:assignmentId/submissions` POST.
   - 성공 시 과제 상세/대시보드 캐시 무효화.
   - 에러 코드별 사용자 메시지 매핑(`DUPLICATE_SUBMISSION`, `LATE_NOT_ALLOWED`).
   - **Unit Test**: MSW 모킹으로 성공/403/500 처리.

10. `components/assignment-submit-form.tsx`
    - `react-hook-form` + zodResolver로 폼 구성.
    - 제출 중 로딩, 성공 시 리셋, 에러 메시지 노출.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 텍스트만 제출 | 성공 메시지 |
      | URL만 제출(정상) | 성공 |
      | URL 형식 오류 | 제출 차단 + 오류 표시 |
      | 제출 중 로딩 | 버튼 로딩 상태 |

11. `components/assignment-submit-status.tsx`
    - 최근 제출 시간, late 여부, 제출 상태 표시.
    - 미제출이면 "제출 기록 없음" 노출.
    - **QA Sheet**: 신규 제출/late 제출/재제출 모두 확인.

12. `components/assignment-submit-result.tsx`
    - 성공/실패 메시지, 재시도 버튼, late 안내.

13. 과제 상세 페이지 연동
    - `assignment-detail-panel`과 통합: 제출 form, status, result 컴포넌트 배치.
    - 제출 성공 시 상태 섹션 갱신.

14. 접근 제어
    - 비수강/403 응답 시 `assignment-not-found` 또는 전용 안내 메시지 표시.

### 공통/환경
15. 테스트 인프라
    - 기존 `vitest` 설정 활용, `tests/assignments/submission` 디렉터리에 테스트 추가.

16. 문서/QA 공유
    - QA 시나리오를 `docs/005/spec.md`와 연동하여 테스터와 공유.

17. 후속 TODO
    - Instructor 채점 로직과 제출 상태 연동.
    - 파일 업로드 확장 가능성 검토 및 구조 마련.
