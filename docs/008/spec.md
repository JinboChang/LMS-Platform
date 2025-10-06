# Use Case: 코스 관리 (Instructor)

- **Primary Actor**: 코스를 생성/편집할 권한이 있는 Instructor
- **Precondition**: Instructor는 로그인 상태이며 최소한 하나 이상의 코스를 편집할 권한을 가지고 있다.
- **Trigger**: Instructor가 코스 관리 페이지에서 새 코스를 생성하거나 기존 코스를 수정/상태 변경하려고 한다.

## Main Scenario
1. Instructor가 코스 관리 페이지에서 “새 코스 생성” 버튼을 클릭한다.
2. FE는 코스 생성 폼(제목, 소개, 카테고리, 난이도, 커리큘럼 등)을 렌더링한다.
3. Instructor가 필수 정보를 입력하고 제출하면 FE는 `/api/instructor/courses`에 POST 요청을 보낸다.
4. BE는 입력값을 검증하고 `courses` 테이블에 `status='draft'`인 새 레코드를 생성한다.
5. BE는 생성된 코스 ID와 초기 상태를 FE로 반환한다.
6. Instructor가 기존 코스를 수정하려면 코스 목록에서 코스를 선택하고 수정 폼을 연다.
7. FE는 변경된 정보를 PUT/PATCH 요청으로 `/api/instructor/courses/:courseId`에 전송한다.
8. BE는 해당 코스가 Instructor 소유인지 확인하고 필드를 업데이트한다.
9. Instructor가 상태를 `draft -> published` 또는 `published -> archived`로 전환하면 BE는 상태 전환 규칙을 검증한 후 `courses.status`를 갱신한다.
10. BE는 성공 메시지와 갱신된 코스 정보를 반환하고 FE는 목록을 갱신한다.

## Edge Cases
- 필수 필드 누락/검증 실패: BE가 400을 반환하고 FE는 오류 메시지를 표시한다.
- Instructor가 소유하지 않은 코스를 수정하려는 경우: BE가 403을 반환한다.
- `draft -> published` 전환 시 필수 항목(예: 소개, 커리큘럼)이 누락된 경우: BE가 409/422 오류로 상태 전환을 거부한다.
- `published -> archived` 전환 시 이미 모든 수강생에게 영향이 갈 수 있으므로 BE가 경고 및 확인 단계를 요구할 수 있다.
- DB 오류: BE가 500을 반환하고 FE는 재시도 옵션을 제공한다.

## Business Rules
- 새 코스는 기본적으로 `status='draft'`로 생성된다.
- `draft -> published` 전환에는 필수 정보(제목, 소개, 카테고리, 난이도, 커리큘럼)가 모두 채워져 있어야 한다.
- `published -> archived` 전환 시 신규 수강 등록이 차단된다.
- Instructor는 본인이 소유한 코스만 수정/상태 변경할 수 있다.
- 코스 정보 수정 시 `updated_at` 타임스탬프가 갱신된다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 새 코스 생성 클릭
FE -> User: 코스 생성 폼 렌더링
User -> FE: 코스 데이터 입력 후 제출
FE -> BE: POST /api/instructor/courses {title, description, ...}
BE -> Database: INSERT INTO courses
Database --> BE: 생성된 코스 ID
BE --> FE: 생성 성공 응답
FE -> User: 코스 생성 완료 메시지

User -> FE: 기존 코스 수정 요청
FE -> BE: PATCH /api/instructor/courses/:courseId {fields}
BE -> Database: UPDATE courses SET ...
Database --> BE: update success
BE --> FE: 수정 성공 응답
FE -> User: 수정 완료 메시지 및 목록 갱신
@enduml
