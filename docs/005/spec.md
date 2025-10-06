# Use Case: 과제 제출/재제출 (Learner)

- **Primary Actor**: 해당 과제를 열람한 Learner
- **Precondition**: Learner는 로그인 상태이며 해당 코스 수강 상태가 `active`이고, 과제가 `status='published'` 또는 late 허용 정책 하에 제출 가능해야 한다.
- **Trigger**: Learner가 과제 상세 페이지에서 제출 버튼을 클릭하고 제출 폼을 완료한다.

## Main Scenario
1. Learner가 과제 상세 페이지에서 제출 버튼을 누른다.
2. FE는 제출 폼(텍스트, 링크)을 검증하고 `/api/assignments/:assignmentId/submissions`에 POST 요청을 보낸다.
3. BE는 Learner가 해당 코스에 `status='active'`인지 확인하고 과제가 `status='published'`인지 검증한다.
4. BE는 마감일을 확인하여 late 허용 여부에 따라 제출 가능성을 판단한다.
5. 제출 가능하면 BE는 `assignment_submissions`에 제출 내용을 기록하고 `status='submitted'`, `submitted_at`을 업데이트한다.
6. BE는 제출이 지연된 경우 `late=true`를 설정하고, 허용되지 않은 경우 403 오류를 반환한다.
7. BE는 성공 응답과 함께 현재 제출 상태를 FE로 전달한다.
8. FE는 성공 메시지를 표시하고 과제 상세/대시보드 상태를 갱신한다.

## Edge Cases
- 폼 검증 실패(텍스트 공백, 링크 형식 오류): FE가 제출 전 오류 메시지를 보여주고 요청을 차단한다.
- Learner가 해당 코스를 수강 중이 아닌 경우: BE가 403으로 응답하고 FE는 접근 불가 메시지를 표시한다.
- 과제가 `closed` 상태이거나 late 허용이 `false`인데 마감 이후 제출하려는 경우: BE가 403을 반환하고 FE는 제출 불가 안내를 띄운다.
- 기존 제출이 있는 경우: BE가 덮어쓰거나 새 버전을 기록(비즈니스 정책에 따라)하고 FE는 "재제출 완료" 메시지를 표시한다.
- DB 오류 또는 네트워크 실패: BE가 500을 반환하면 FE는 재시도 옵션과 함께 오류 메시지를 노출한다.

## Business Rules
- 제출은 Learner의 `status='active'` enrollment와 과제 `status='published'`가 동시에 충족될 때만 가능하다.
- 마감 시간이 지났을 경우 `assignments.late_submission_allowed=true`일 때만 제출할 수 있으며, 이때 `late=true`를 기록한다.
- 제출 텍스트와 링크는 비어 있지 않아야 하며, 링크는 올바른 URL 형식이어야 한다.
- 재제출 시 기존 제출 상태를 업데이트하며 최신 제출만 평가 대상이 된다.
- 제출 성공 후 Learner는 즉시 진행 상태를 확인할 수 있어야 한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 제출 폼 작성 후 제출 클릭
FE -> BE: POST /api/assignments/:assignmentId/submissions
BE -> Database: SELECT enrollment WHERE learner & course
Database --> BE: enrollment status
BE -> Database: SELECT assignment WHERE id
Database --> BE: assignment detail
BE -> Database: SELECT submission WHERE learner & assignment
Database --> BE: existing submission
BE -> Database: UPSERT assignment_submissions
Database --> BE: submission saved
BE --> FE: 제출 성공 응답 (상태, late 여부)
FE -> User: 성공 메시지 및 상태 업데이트
@enduml
