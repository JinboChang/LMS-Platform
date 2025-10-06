# Use Case: 성적 & 피드백 열람 (Learner)

- **Primary Actor**: 과제 제출 이력이 있는 Learner
- **Precondition**: Learner는 로그인 상태이며 해당 코스의 `status='active'` 수강 상태를 유지하고 있다.
- **Trigger**: Learner가 성적 페이지(`/grades`)에 진입하거나 특정 코스의 성적 탭을 선택한다.

## Main Scenario
1. Learner가 성적 페이지를 열면 FE는 `/api/grades/overview`(혹은 `/api/courses/:courseId/grades`)를 호출한다.
2. BE는 Learner의 `enrollments`에서 활성 코스 목록을 가져온다.
3. BE는 각 코스에 대해 `assignment_submissions`와 `assignments`를 조합하여 과제별 점수, late 여부, 피드백 내용을 조회한다.
4. BE는 각 과제의 점수와 비중을 사용해 코스 총점을 계산한다.
5. BE는 과제별 제출 상태, 점수, 피드백, late 표시, 코스 총점 요약을 포함한 데이터를 FE로 반환한다.
6. FE는 코스별 섹션에 과제 목록, 점수, 피드백, late 표시를 렌더링한다.
7. Learner가 특정 과제의 피드백을 클릭하면 상세 피드백 모달 또는 섹션이 표시된다.

## Edge Cases
- 제출 이력이 없는 과제: BE가 `status='not_submitted'`로 표시하고 FE는 "미제출" 상태를 보여준다.
- 점수가 아직 없는 경우: BE가 `score=null`로 반환하고 FE는 "채점 대기" 상태를 표시한다.
- 피드백이 없는 경우: FE는 "피드백 없음" 메시지를 표시한다.
- Learner가 코스를 수강 중이 아니거나 인증에 실패한 경우: BE가 401/403을 반환하고 FE는 로그인/접근 불가 안내를 띄운다.
- DB 오류: BE가 500을 반환하면 FE는 오류 메시지와 재시도 버튼을 제공한다.

## Business Rules
- Learner는 본인이 수강 중인 코스의 제출 데이터만 조회할 수 있다.
- late 여부는 `assignment_submissions.late` 플래그 기준으로 표시한다.
- 코스 총점 계산은 각 과제 점수와 `assignments.score_weight`를 곱하여 합산한다.
- 피드백은 `assignment_submissions.feedback_text`와 `feedback_updated_at` 기준 최신 상태를 보여준다.
- 점수는 0~100 범위를 벗어나면 표시하지 않고 오류로 기록한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 성적 페이지 진입
FE -> BE: GET /api/grades/overview
BE -> Database: SELECT enrollments WHERE learner_id & status='active'
Database --> BE: 활성 코스 목록
BE -> Database: SELECT assignments, submissions WHERE course & learner
Database --> BE: 과제/제출 데이터
BE --> FE: 성적/피드백 응답 (코스별 총점 포함)
FE -> User: 성적, 피드백, late 여부 표시
@enduml
