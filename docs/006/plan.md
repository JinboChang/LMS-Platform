# Learner Grades 모듈 설계 계획

## 개요
- `src/features/grades/backend/schema.ts`: 성적/피드백 조회 요청·응답 및 계산용 Zod 스키마 정의.
- `src/features/grades/backend/repository.ts`: `enrollments`, `assignments`, `assignment_submissions` 조회 전용 Supabase 래퍼.
- `src/features/grades/backend/service.ts`: 코스별 성적 계산, late 여부/피드백 정리, 권한 검증 비즈니스 로직.
- `src/features/grades/backend/route.ts`: `GET /api/grades/overview` 및 `GET /api/courses/:courseId/grades` 라우트 등록.
- `src/backend/hono/app.ts`: `registerGradeRoutes` 호출 추가.
- `src/features/grades/lib/dto.ts`: 프런트에서 사용하는 성적 DTO(Zod 기반 파서 포함).
- `src/features/grades/lib/calculations.ts`: 총점 계산, 가중치 검증, late 표시 헬퍼.
- `src/features/grades/hooks/useGradesOverview.ts`: 전체 성적 조회 React Query 훅.
- `src/features/grades/hooks/useCourseGrades.ts`: 특정 코스 성적 조회 훅.
- `src/features/grades/components/grades-summary.tsx`: 전체 통계(코스별 총점, 평균 등) UI.
- `src/features/grades/components/course-grade-table.tsx`: 과제별 점수/피드백 테이블.
- `src/features/grades/components/feedback-detail-dialog.tsx`: 피드백 상세 모달.
- `src/features/grades/components/grades-empty-state.tsx`: 제출 이력이 없을 때 안내 UI.
- `src/app/(protected)/grades/page.tsx`: 성적 페이지 셸, 훅/컴포넌트 연동.

## Diagram
```mermaid
graph TD
  User[사용자] --> GradesPage[app/(protected)/grades/page.tsx]
  GradesPage --> GradesOverviewHook[hooks/useGradesOverview]
  GradesPage --> CourseGradesHook[hooks/useCourseGrades]
  GradesOverviewHook --> ApiClient[/@/lib/remote/api-client\]
  CourseGradesHook --> ApiClient
  ApiClient --> GradeRoutes[backend/route]
  GradeRoutes --> GradeService[backend/service]
  GradeService --> GradeRepo[backend/repository]
  GradeRepo --> Database[(Supabase)]
  GradeService --> GradeSchema[backend/schema]
  GradesOverviewHook --> GradeDTO[lib/dto]
  GradesPage --> GradesSummary[components/grades-summary]
  GradesPage --> CourseGradeTable[components/course-grade-table]
  CourseGradeTable --> CalcHelpers[lib/calculations]
  GradesPage --> FeedbackDialog[components/feedback-detail-dialog]
  GradesPage --> EmptyState[components/grades-empty-state]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `GradeOverviewResponse`: 코스 리스트, 각 코스 총점, 평균 점수, late 제출 수 등.
   - `CourseGradeResponse`: 과제별 점수, 비중, late 여부, 피드백, 제출 상태.
   - **Unit Test**: Zod 파서로 정상/비정상 데이터 검증(점수 범위, 가중치 합계 등).

2. `repository.ts`
   - `getActiveEnrollments(learnerId)`.
   - `getAssignmentsForCourses(courseIds)` → 가중치/마감/late 허용 포함.
   - `getSubmissionsForLearner(learnerId, courseIds)`.
   - **Unit Test**: Supabase 모킹으로 올바른 테이블/필터 호출 확인.

3. `service.ts`
   - 권한 체크: 요청자 ID와 enrollment 매칭.
   - Course별로 assignments/submissions 조인 → 점수(0~100) 검증, 가중치 합 확인.
   - late 여부는 submission 플래그 사용, 피드백 최신 상태 정렬.
   - 코스 총점 계산(가중치*점수 합산, 누락 시 0 처리).
   - **Unit Test**:
     - 코스별 진행률 계산(정상/미제출/채점 대기/late).
     - 가중치 합 100 넘는 경우는 경고(응답 details에 추가) 혹은 normalize.
     - 제출 없음 → 미제출 상태.
     - 코스 없음 → 빈 배열 반환.

4. `route.ts`
   - `GET /grades/overview` → 전체 성적, `GET /courses/:courseId/grades` → 특정 코스.
   - 세션에서 Learner ID 추출, 코스 ID 파라미터 검증.
   - 서비스 호출 후 `respond`로 결과 전달.
   - **Unit Test**: 성공, 401/403, 500 케이스.

5. `src/backend/hono/app.ts`
   - `registerGradeRoutes(app)` 추가.

### Frontend
6. `lib/dto.ts`
   - 백엔드 응답을 `GradeOverview`, `CourseGrade`, `AssignmentGrade` 타입으로 매핑.
   - 날짜/점수/가중치 변환 시 타입 안전성 확보.
   - **Unit Test**: DTO 파싱 실패(점수 110 등) 시 예외.

7. `lib/calculations.ts`
   - `formatScore`, `calcWeightedTotal`, `buildLateBadge`, `calcAverageScore` 등의 순수 함수.
   - **Unit Test**: 점수 계산, late 표시 로직 검증.

8. `hooks/useGradesOverview.ts`
   - React Query `useQuery`로 `/api/grades/overview` 호출.
   - 캐시 키: `['grades','overview']`, staleTime 60초.
   - **Unit Test**: MSW 모킹으로 성공/401/500 처리.

9. `hooks/useCourseGrades.ts`
   - 선택된 코스 ID로 `/api/courses/:id/grades` 호출.
   - 성공 시 코스별 테이블에 전달.

10. `components/grades-summary.tsx`
    - 전체 통계 카드(총 코스 수, 평균 점수, late 제출 수 등) 출력.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 코스 3개 평균 80 | 평균 80 출력 |
      | late 제출 2건 | late 표기 |

11. `components/course-grade-table.tsx`
    - 과제 목록 테이블, 점수, 비중, late, 상태, 피드백 버튼 포함.
    - 점수 없을 때 "채점 대기", 미제출 시 "미제출".
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 점수=95, 비중 20% | 행에 정확히 표시 |
      | 미제출 | 미제출 뱃지 |
      | late=true | late 표시 |

12. `components/feedback-detail-dialog.tsx`
    - 피드백 텍스트, 점수, 업데이트 시간 표시.
    - 닫기/재확인 기능.

13. `components/grades-empty-state.tsx`
    - 제출 없음 또는 코스 없음일 때 안내 및 CTA(코스 찾기) 표시.

14. `src/app/(protected)/grades/page.tsx`
    - 인증 가드(`useCurrentUser`), `useGradesOverview` 호출.
    - 로딩 스켈레톤, 에러/empty 상태 분기.
    - 코스 선택 드롭다운(필요 시)과 `CourseGradeTable`/`FeedbackDialog` 연동.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 정상 응답 | 요약 + 코스 테이블 표시 |
      | empty 응답 | empty state |
      | 401 | 로그인 리다이렉션 |
      | 500 | 오류 메시지 + 재시도 |

15. 접근성/표시 개선
    - 테이블 caption/aria-label, 피드백 모달 focus trap 적용.

### 공통/환경
16. 테스트 인프라
    - `tests/grades` 디렉터리에 서비스/헬퍼/훅 유닛 테스트 추가.

17. 문서 공유
    - QA 시나리오를 `docs/006/spec.md`와 함께 공유.

18. 후속 TODO
    - Instructor 측에서 채점 완료 시 알림 연동.
    - 성적 export(CSV) 요구사항 등장 시 확장 용이하게 설계.
