# Assignment Grading 모듈 설계 계획

## 개요
- `src/features/instructor-grading/backend/schema.ts`: 제출 채점/피드백 요청·응답 Zod 스키마 및 검증 로직 정의.
- `src/features/instructor-grading/backend/repository.ts`: `assignment_submissions` 조회/업데이트, 과제·코스 소유권 확인 Supabase 래퍼.
- `src/features/instructor-grading/backend/service.ts`: 점수 범위 검증, 상태 전환(`submitted` ↔ `graded`/`resubmission_required`) 비즈니스 로직.
- `src/features/instructor-grading/backend/route.ts`: `PATCH /api/instructor/assignments/:assignmentId/submissions/:submissionId/grade` 엔드포인트 등록.
- `src/backend/hono/app.ts`: Instructor 채점 라우트 등록.
- `src/features/instructor-grading/lib/dto.ts`: 프런트에서 사용하는 제출 상세/채점 응답 DTO.
- `src/features/instructor-grading/lib/validators.ts`: 채점 폼 Zod 스키마(점수 0~100, 피드백 길이 등).
- `src/features/instructor-grading/hooks/useSubmissionDetail.ts`: 제출 상세 조회 훅(필요 시 기존 데이터 소스 공유).
- `src/features/instructor-grading/hooks/useGradeSubmission.ts`: 채점/재제출 요청 mutation 훅.
- `src/features/instructor-grading/components/grading-panel.tsx`: 점수 입력, 피드백, 재제출 토글을 제공하는 폼 컴포넌트.
- `src/features/instructor-grading/components/grading-result-banner.tsx`: 채점 성공/오류/재제출 안내 UI.
- `src/app/(protected)/instructor/courses/[courseId]/assignments/[assignmentId]/submissions/[submissionId]/page.tsx`: 제출 채점 상세 페이지.

## Diagram
```mermaid
graph TD
  Instructor[Instructor] --> GradingPage[app/(protected)/instructor/courses/[courseId]/assignments/[assignmentId]/submissions/[submissionId]/page.tsx]
  GradingPage --> SubmissionDetailHook[hooks/useSubmissionDetail]
  GradingPage --> GradeMutationHook[hooks/useGradeSubmission]
  SubmissionDetailHook --> ApiClient[/@/lib/remote/api-client\]
  GradeMutationHook --> ApiClient
  ApiClient --> GradingRoute[backend/route]
  GradingRoute --> GradingService[backend/service]
  GradingService --> GradingRepo[backend/repository]
  GradingRepo --> Database[(Supabase)]
  GradingService --> GradingSchema[backend/schema]
  GradingPage --> GradingPanel[components/grading-panel]
  GradingPage --> GradingResult[components/grading-result-banner]
  GradingPanel --> Validators[lib/validators]
  SubmissionDetailHook --> GradingDTO[lib/dto]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `GradeSubmissionRequest`: `{ score: number, feedbackText?: string, requireResubmission?: boolean }` with score 0~100, feedback optional but required if `requireResubmission` true.
   - `GradeSubmissionResponse`: 갱신된 상태(`graded` 또는 `resubmission_required`), 점수, 피드백, `gradedAt`, `late` 유지 여부.
   - **Unit Test**: 범위를 벗어난 점수, 재제출 요청 시 피드백 누락, 정상 케이스 검증.

2. `repository.ts`
   - `getSubmissionForInstructor(submissionId, instructorId)`: 과제/코스 소유 여부와 현재 상태 포함.
   - `updateSubmissionGrade(submissionId, payload)`: 점수, 피드백, 상태, `graded_at` 업데이트.
   - **Unit Test**: Supabase 쿼리 조건(조인/필드 선택) 검토 및 오류 처리.

3. `service.ts`
   - 소유자 검증: 제출 → 과제 → 코스 instructor 매핑.
   - 현재 상태가 `submitted` 또는 `resubmission_required`인지 확인.
   - 점수 범위, 재제출 요청 시 피드백 필수 검증.
   - `requireResubmission` true → `status='resubmission_required'`, false → `status='graded'`.
   - `graded_at` 설정, `feedback_updated_at` 갱신.
   - **Unit Test**:
     - 권한 없음 → 403.
     - 상태 부적합(이미 graded) → 409.
     - 점수 범위 초과 → 422.
     - 재제출 요청 + 피드백 없음 → 422.
     - 정상 채점/재제출 → 기대 응답.

4. `route.ts`
   - 세션 instructor ID 추출.
   - 요청 바디 Zod 파싱, 서비스 호출, `success/failure` 응답 사용.
   - **Unit Test**: 성공, 검증 실패, 권한 오류, 서버 오류 케이스.

5. `src/backend/hono/app.ts`
   - `registerInstructorGradingRoutes(app)` 추가 위치 명시.

### Frontend
6. `lib/validators.ts`
   - 채점 폼 Zod 스키마: score number(0~100), feedback optional but required if 재제출 체크 true.
   - **Unit Test**: 점수 범위, 재제출 시 피드백 누락 등 검증.

7. `lib/dto.ts`
   - 제출 상세 및 채점 응답 타입(`SubmissionDetail`, `GradingResult`).
   - 응답 파싱 실패 시 예외.

8. `hooks/useSubmissionDetail.ts`
   - `/api/instructor/assignments/:assignmentId/submissions/:submissionId` GET (필요 시 기존 API 계획과 통합).
   - 제출 텍스트, 링크, late, 현재 상태 등 반환.

9. `hooks/useGradeSubmission.ts`
   - `useMutation`으로 PATCH API 호출.
   - 성공 시 제출 상세/채점 큐/성적 관련 캐시 무효화.
   - 오류 시 코드별 메시지 매핑(`SCORE_OUT_OF_RANGE`, `ALREADY_GRADED` 등).
   - **Unit Test**: 성공/권한 실패/검증 실패/500 케이스.

10. `components/grading-panel.tsx`
    - `react-hook-form` + zodResolver.
    - 점수 입력, 피드백 textarea, 재제출 체크박스, 제출 버튼.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 점수 95, 피드백 입력 | 성공 메시지 |
      | 점수 120 | 폼 검증 오류 |
      | 재제출 체크 + 피드백 없음 | 오류 메시지 |

11. `components/grading-result-banner.tsx`
    - 채점 성공/재제출 요청/오류 상태를 사용자에게 안내.
    - 재시도 버튼(에러 시), Learner에게 전송된 상태 요약.

12. `src/app/(protected)/instructor/courses/[courseId]/assignments/[assignmentId]/submissions/[submissionId]/page.tsx`
    - 인증/권한 가드.
    - `useSubmissionDetail`로 데이터 로딩, `GradingPanel` 렌더링.
    - 로딩 스켈레톤, 권한 없음/404/에러 처리.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 제출 상세 로딩 성공 | 제출 정보 + 그레이딩 폼 표시 |
      | 권한 없음 | 접근 불가 안내 |
      | 채점 성공 | 성공 배너 + 목록 갱신 안내 |

### 공통/환경
13. 테스트 인프라
    - `tests/instructor-grading` 디렉터리에 서비스/헬퍼/훅 단위 테스트 배치.

14. 문서/QA 공유
    - QA 시나리오를 `docs/010/spec.md` 참고 자료로 공유.

15. 후속 TODO
    - 채점 완료 후 Learner 통지(이메일/알림) 연계.
    - 채점 기록 감사 로그 추가.
