# Use Case: Instructor 대시보드 조회

- **Primary Actor**: 코스를 보유한 Instructor
- **Precondition**: Instructor는 로그인 상태이며 최소 한 개 이상의 코스를 생성했거나 생성 권한이 있다.
- **Trigger**: Instructor가 대시보드 페이지(`/instructor/dashboard`)에 접속하거나 새로고침을 수행한다.

## Main Scenario
1. Instructor가 대시보드 페이지에 진입한다.
2. FE는 세션 정보를 확인하고 `/api/instructor/dashboard`를 호출한다.
3. BE는 Instructor가 소유한 `courses` 목록을 `draft/published/archived` 상태별로 조회한다.
4. BE는 활성 코스에 대해 `assignment_submissions`를 참조하여 채점 대기(`status='submitted'` 또는 `resubmission_required'`) 과제를 집계한다.
5. BE는 최근 제출 기록(예: 최근 7일)을 조회하여 제출자, 과제, 제출 시간, 상태를 정리한다.
6. BE는 코스 요약, 채점 대기 과제 수, 최근 제출 목록을 포함한 데이터를 FE로 반환한다.
7. FE는 코스 카드, 채점 대기 섹션, 최근 제출 리스트를 렌더링한다.

## Edge Cases
- 코스를 보유하지 않은 Instructor: BE가 빈 리스트를 반환하고 FE는 “등록된 코스가 없습니다” 메시지를 표시한다.
- 채점 대기 과제가 없는 경우: 해당 섹션을 숨기거나 “채점 대기 없음” 안내를 보여준다.
- 최근 제출이 없는 경우: “최근 제출 없음” 메시지를 표시한다.
- 세션 만료/권한 없음: BE가 401/403을 반환하면 FE는 로그인/접근 불가 안내로 리다이렉션한다.
- DB 오류: BE가 500을 반환하면 FE는 오류 메시지와 재시도 옵션을 제공한다.

## Business Rules
- Instructor는 본인이 소유한 코스와 그 과제 제출 데이터만 조회 가능하다.
- 채점 대기 기준: 제출 상태가 `submitted` 또는 `resubmission_required`인 항목.
- 최근 제출 목록은 최신 제출 시간 순으로 최대 N건(예: 20건)만 표기한다.
- Course 상태는 `draft/published/archived` 세 가지로 분리하여 표시한다.
- 데이터 집계는 실시간 조회 기준으로 한다(캐싱 시 만료 정책 필요).

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: Instructor 대시보드 접근
FE -> BE: GET /api/instructor/dashboard
BE -> Database: SELECT courses WHERE instructor_id
Database --> BE: 코스 목록
BE -> Database: SELECT submissions WHERE course IN (...) AND status IN ('submitted','resubmission_required')
Database --> BE: 채점 대기 데이터
BE -> Database: SELECT recent submissions LIMIT N
Database --> BE: 최근 제출 데이터
BE --> FE: 대시보드 응답 (코스/채점 대기/최근 제출)
FE -> User: Instructor 대시보드 렌더링
@enduml
