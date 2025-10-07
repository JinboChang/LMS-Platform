# Use Case: 과제 관리 (Instructor)

- **Primary Actor**: 해당 코스를 보유한 Instructor
- **Precondition**: Instructor는 로그인 상태이며 관리하려는 코스에 대한 편집 권한을 가지고 있다.
- **Trigger**: Instructor가 과제 관리 페이지에서 새 과제를 생성하거나 기존 과제를 수정/상태 변경하려고 한다.

## Main Scenario
1. Instructor가 코스의 과제 관리 화면으로 이동한다.
2. FE는 과제 목록과 "새 과제 생성" 버튼을 렌더링한다.
3. Instructor가 새 과제를 만들기 위해 버튼을 누르고 필수 필드(제목, 설명, 마감일, 점수 비중, 제출 지침, late 허용 여부 등)를 입력한다.
4. FE는 입력값을 검증한 뒤 `/api/instructor/courses/:courseId/assignments`에 POST 요청을 보낸다.
5. BE는 Instructor가 해당 코스를 소유하고 있는지 확인한 뒤 `assignments` 테이블에 `status='draft'`로 과제를 생성한다.
6. Instructor가 과제를 수정하려면 목록에서 과제를 선택하고 수정 폼을 열어 변경된 필드를 제출한다.
7. FE는 변경 내용을 PUT/PATCH 요청으로 `/api/instructor/courses/:courseId/assignments/:assignmentId`에 전송한다.
8. BE는 소유자 검증 후 필드를 업데이트하고, `draft -> published` 전환 시 게시 조건을 확인한다.
9. 마감 이후 자동으로 `published -> closed` 전환 또는 Instructor가 수동 전환을 수행하면 BE는 `assignments.status`를 `closed`로 갱신한다.
10. BE는 성공 메시지와 갱신된 과제 데이터를 FE로 반환하고, FE는 목록을 새로고침한다.

## Edge Cases
- 필수 필드 누락: BE가 400/422 오류를 반환하고 FE는 필드별 오류 메시지를 표시한다.
- Instructor가 소유하지 않은 과제를 수정하려는 경우: BE가 403을 반환한다.
- `draft -> published` 전환 시 제출 지침이나 마감일이 누락된 경우: BE가 상태 전환을 거부한다.
- 이미 `closed` 상태인 과제를 다시 열려고 하면 BE가 409를 반환하거나 금지한다.
- DB 오류: BE가 500을 반환하고 FE는 재시도 옵션과 오류 메시지를 제공한다.
- 코스 내 과제들의 score_weight 합계가 100%를 초과하면 BE는 422로 거절하고 합계를 반환한다.
- 동일 제목 과제를 연속으로 생성하거나 수정하면 409로 충돌을 알리고 기존 데이터만 유지한다.

## Business Rules
- 과제 제목은 코스 내에서 유일해야 하며 중복 시 409를 반환한다.
- 과제들의 score_weight 합계는 100%를 초과할 수 없다.
- 새 과제는 기본적으로 `status='draft'`로 생성된다.
- `draft -> published` 전환 시 마감일, 점수 비중, 제출 지침 등 필수 정보가 채워져 있어야 한다.
- `published` 상태의 과제는 Learner가 열람하고 제출할 수 있으며, 마감이 지나면 자동 혹은 수동으로 `closed`가 된다.
- Instructor는 본인이 소유한 코스의 과제만 생성/수정/상태 전환할 수 있다.
- Late 제출 허용 여부는 `assignments.late_submission_allowed` 필드로 제어하며, 변경 시 Learner 제출 정책에 즉시 반영된다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 새 과제 생성 클릭
FE -> User: 과제 생성 폼 렌더링
User -> FE: 과제 정보 입력 후 제출
FE -> BE: POST /api/instructor/courses/:courseId/assignments {fields}
BE -> Database: INSERT INTO assignments
Database --> BE: 생성된 과제 ID
BE --> FE: 생성 성공 응답
FE -> User: 생성 완료 메시지

User -> FE: 기존 과제 수정 요청
FE -> BE: PATCH /api/instructor/courses/:courseId/assignments/:assignmentId {fields}
BE -> Database: UPDATE assignments SET ...
Database --> BE: update success
BE --> FE: 수정 성공 응답
FE -> User: 수정/상태 전환 결과 표시
@enduml
