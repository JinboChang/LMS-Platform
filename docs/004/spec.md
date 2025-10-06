# Use Case: 과제 상세 열람 (Learner)

- **Primary Actor**: 해당 코스에 등록된 Learner
- **Precondition**: Learner는 로그인 상태이며 해당 코스의 수강 상태가 `active`이고, 대시보드나 코스 페이지에서 과제 목록에 접근했다.
- **Trigger**: Learner가 과제 목록에서 특정 과제 카드를 클릭해 상세 보기 페이지/모달을 열려고 한다.

## Main Scenario
1. Learner가 과제 목록에서 과제를 선택한다.
2. FE는 Learner의 enrollment 상태를 확인한 뒤 `/api/courses/:courseId/assignments/:assignmentId`를 요청한다.
3. BE는 Learner가 해당 코스에 `status='active'`로 등록되어 있는지 검증한다.
4. BE는 `assignments` 테이블에서 과제가 `status='published'`인지 확인하고 상세 정보를 조회한다.
5. BE는 `assignment_submissions`에서 Learner의 최근 제출 여부를 확인하고 진행 상태를 포함한 응답을 구성한다.
6. BE는 과제 제목, 설명, 마감일, 점수 비중, 제출 가이드, 제출 상태 등을 포함해 FE로 반환한다.
7. FE는 반환된 정보를 렌더링하고, 과제가 `status='closed'`이면 제출 버튼을 비활성화한다.

## Edge Cases
- Learner가 코스에 등록되어 있지 않은 경우: BE가 403을 반환하고 FE는 접근 불가 메시지를 표시한다.
- 과제가 `published`가 아닌 경우: BE가 404 또는 403으로 응답하고 FE는 "볼 수 없는 과제" 안내를 노출한다.
- 과제가 `closed` 상태인 경우: 상세 정보는 노출하지만 제출 버튼은 비활성화하고 안내 문구를 보여준다.
- 제출 기록이 없는 경우: FE는 "제출 기록 없음" 상태를 표시한다.
- DB 오류: BE가 500을 반환하면 FE는 오류 메시지와 함께 재시도 옵션을 제공한다.

## Business Rules
- Learner는 `status='active'`인 코스의 과제만 조회할 수 있다.
- 과제 상세는 `assignments.status='published'`일 때만 공개된다.
- 마감 이후 `late_submission_allowed=false`이면 제출 UI는 비활성화된다.
- Learner 본인의 제출 기록만 조회 가능하다.
- 과제에 첨부된 제출 지침(텍스트/링크)은 변경되더라도 항상 최신 상태로 표시된다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 과제 상세 보기 요청
FE -> BE: GET /api/courses/:courseId/assignments/:assignmentId
BE -> Database: SELECT enrollment WHERE learner & course
Database --> BE: enrollment status
BE -> Database: SELECT assignment WHERE id & status='published'
Database --> BE: assignment detail
BE -> Database: SELECT submission WHERE learner & assignment
Database --> BE: submission info
BE --> FE: 과제 상세 응답
FE -> User: 상세 정보 렌더 및 제출 UI 상태 반영
@enduml
