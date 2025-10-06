# Use Case: 제출 채점 & 피드백 작성 (Instructor)

- **Primary Actor**: 과제 채점 권한이 있는 Instructor
- **Precondition**: Instructor는 로그인 상태이며 채점하려는 과제가 속한 코스의 소유자이다.
- **Trigger**: Instructor가 과제 관리 화면에서 특정 제출을 선택하고 채점 및 피드백을 입력하려고 한다.

## Main Scenario
1. Instructor가 채점 대기 목록에서 특정 제출을 선택한다.
2. FE는 제출 상세를 표시하고 점수 입력 필드(0~100)와 피드백 텍스트 영역, 재제출 요청 토글 등을 렌더링한다.
3. Instructor가 점수와 피드백을 입력한 후 제출하면 FE는 `/api/instructor/assignments/:assignmentId/submissions/:submissionId/grade`에 PATCH 요청을 보낸다.
4. BE는 Instructor가 해당 코스를 소유하고 있는지, 제출 상태가 채점 가능한 상태(`submitted` 또는 `resubmission_required`)인지 확인한다.
5. BE는 점수 범위(0~100)를 검증한 뒤 `assignment_submissions` 테이블에 `score`, `feedback_text`, `graded_at`, `status='graded'`를 업데이트한다.
6. Instructor가 재제출을 요구하면 BE는 `status='resubmission_required'`, `feedback_text`를 업데이트하고 Learner에게 재제출이 필요함을 표시한다.
7. BE는 갱신된 제출 상태와 피드백을 FE로 반환한다.
8. FE는 성공 메시지, Learner에게 전달될 상태(graded/resubmission_required)를 표시하고 채점 대기 목록을 갱신한다.

## Edge Cases
- 점수가 0~100 범위를 벗어나는 경우: BE가 400을 반환하고 FE는 오류 메시지를 보여 준다.
- Instructor가 소유하지 않은 제출을 채점하려는 경우: BE가 403을 반환한다.
- 제출 상태가 이미 `graded`이고 추가 변경을 허용하지 않는 정책인 경우: BE가 409를 반환한다.
- DB 오류나 업데이트 실패: BE가 500을 반환하고 FE는 재시도 옵션과 오류 안내를 제공한다.

## Business Rules
- 점수는 0 이상 100 이하의 정수/소수로 입력할 수 있다(정책에 따라 소수 허용 여부 결정).
- 피드백 작성은 선택 사항이지만, 재제출 요청 시에는 사유를 명시해야 한다.
- 재제출 요청 후 Learner가 다시 제출하면 상태가 `submitted`로 돌아가야 한다.
- 채점 완료 시 `graded_at` 타임스탬프가 기록된다.
- 채점 결과는 Learner 대시보드와 성적 페이지에 즉시 반영되어야 한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 제출 선택 및 점수/피드백 입력
FE -> BE: PATCH /api/instructor/assignments/:assignmentId/submissions/:submissionId/grade {score, feedback, status}
BE -> Database: SELECT submission WHERE id & instructor owns course
Database --> BE: 제출 정보
BE -> Database: UPDATE assignment_submissions SET score, feedback, status, graded_at
Database --> BE: update success
BE --> FE: 채점/피드백 결과 응답
FE -> User: 성공 메시지 및 목록 갱신
@enduml
