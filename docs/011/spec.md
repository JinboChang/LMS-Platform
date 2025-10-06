# Use Case: Assignment 게시/마감 (Instructor)

- **Primary Actor**: 과제를 관리할 권한이 있는 Instructor
- **Precondition**: Instructor는 로그인 상태이며 과제가 속한 코스의 소유자이다.
- **Trigger**: Instructor가 과제 상태를 `draft -> published` 혹은 `published -> closed`로 전환하려고 한다.

## Main Scenario
1. Instructor가 코스 과제 목록 화면에서 상태가 `draft`인 과제를 선택하고 “게시” 버튼을 클릭한다.
2. FE는 상태 전환을 확인하는 다이얼로그를 띄우고 필수 정보가 모두 입력되어 있는지 검증한다.
3. Instructor가 확인하면 FE는 `/api/instructor/courses/:courseId/assignments/:assignmentId/status`에 PATCH 요청(`nextStatus='published'`)을 보낸다.
4. BE는 Instructor가 해당 코스를 소유하고 있는지, 과제가 게시 요건(제목, 설명, 마감일, 점수 비중, 제출 지침 등)을 충족하는지 확인한다.
5. 요건이 충족되면 BE는 `assignments.status`를 `published`로 업데이트하고 게시 시간을 기록한다.
6. 마감일이 지난 후 자동으로 `published -> closed` 전환이 설정되어 있거나 Instructor가 수동으로 “마감” 버튼을 클릭하면 FE는 동일한 엔드포인트에 `nextStatus='closed'`로 PATCH 요청을 보낸다.
7. BE는 마감 처리 후 Learner 제출을 차단하기 위해 `assignments.status='closed'`, `closed_at` 타임스탬프를 업데이트한다.
8. BE는 전환 결과를 FE로 반환하고 FE는 성공 메시지와 함께 과제 목록을 갱신한다.

## Edge Cases
- 게시 요건을 충족하지 않은 상태에서 게시를 시도한 경우: BE가 409/422 오류를 반환하고 FE는 부족한 항목을 안내한다.
- 이미 `published` 상태인 과제를 다시 게시하려는 경우: BE가 현재 상태 정보를 반환하고 FE는 중복 요청을 방지한다.
- 마감된 과제를 다시 `published`로 되돌리려는 경우: 정책상 허용되지 않으면 BE가 409를 반환한다.
- Instructor 소유가 아닌 과제에 접근한 경우: BE가 403을 반환한다.
- DB 오류: BE가 500을 반환하고 FE는 재시도 옵션을 제공한다.

## Business Rules
- `draft -> published` 전환 시 필수 필드(제목, 설명, 마감일, 점수 비중, 제출 지침, late 허용 여부)가 모두 입력되어 있어야 한다.
- `published -> closed` 전환 후 Learner는 해당 과제에 대해 더 이상 제출할 수 없다.
- 마감일이 지나면 시스템이 자동으로 `closed` 상태로 전환할 수 있도록 예약 작업이나 백엔드 로직이 필요하다.
- 상태 전환 시 `updated_at` 타임스탬프가 갱신되며, 게시 시간/마감 시간은 별도의 필드에 저장된다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 과제 게시/마감 버튼 클릭
FE -> User: 상태 전환 확인 메시지
User -> FE: 확인
FE -> BE: PATCH /api/instructor/courses/:courseId/assignments/:assignmentId/status {nextStatus}
BE -> Database: SELECT assignment WHERE id & instructor owns course
Database --> BE: 과제 데이터
BE -> Database: UPDATE assignments SET status=nextStatus
Database --> BE: update success
BE --> FE: 상태 전환 성공 응답
FE -> User: 성공 메시지 및 목록 갱신
@enduml
