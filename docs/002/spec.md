# Use Case: 코스 검색 & 수강신청/취소 (Learner)

- **Primary Actor**: 수강 중이거나 신규인 Learner 사용자
- **Precondition**: Learner는 로그인하여 기본 프로필과 인증을 완료했고, 코스 카탈로그 화면에 접근했다.
- **Trigger**: Learner가 검색어 또는 필터를 적용하거나 특정 코스 상세 화면에서 수강신청/취소 버튼을 클릭한다.

## Main Scenario
1. Learner는 검색어와 필터(카테고리, 난이도, 정렬)를 입력하고 검색을 실행한다.
2. FE는 입력값을 검증한 뒤 `/api/courses`에 쿼리 파라미터로 요청을 전송한다.
3. BE는 `courses`와 연관 데이터에서 `status='published'`인 코스를 조회하여 리스트를 반환한다.
4. Learner가 원하는 코스를 선택하면 FE가 `/api/courses/:id`를 호출해 상세 정보를 표시한다.
5. Learner가 수강신청 버튼을 누르면 FE는 `/api/enrollments`에 코스 ID를 담아 POST 요청을 보낸다.
6. BE는 코스가 `published` 상태인지 확인하고, `enrollments`에 동일 코스-사용자 조합이 있는지 검사한다.
7. 중복이 없으면 BE는 `enrollments`에 레코드를 생성하고 성공 메시지와 코스 식별자를 반환한다.
8. FE는 성공 메시지를 표시하고 Learner 대시보드 상태를 갱신한다.
9. Learner가 수강 취소를 선택하면 FE는 `/api/enrollments/:id`에 PATCH (또는 DELETE) 요청으로 `status='cancelled'` 처리한다.
10. BE는 해당 수강 기록을 찾아 상태를 갱신하고, 업데이트 결과를 FE로 반환한다.

## Edge Cases
- 필터 입력 누락/형식 오류: FE가 즉시 오류 메시지를 표시하고 요청을 차단한다.
- 검색 결과 없음: BE가 빈 목록을 반환하면 FE는 "검색 결과 없음" 안내를 표시한다.
- 코스가 `published`가 아님: BE가 403/409로 거절하고 FE는 "신청 불가" 안내를 띄운다.
- 이미 수강 중인 코스에 재신청: BE가 `409 DUPLICATE_ENROLLMENT`를 반환하고 FE는 중복 신청 안내를 제공한다.
- 수강 취소 시 이미 `cancelled` 상태: BE가 멱등 응답(200 또는 204)을 주고 FE는 상태 변화 없음으로 처리한다.
- DB/네트워크 오류: BE가 500 또는 타임아웃을 반환하면 FE는 재시도 옵션과 오류 메시지를 제공한다.

## Business Rules
- Learner는 `courses.status='published'`인 코스만 신청할 수 있다.
- `enrollments`에는 동일한 `learner_id`와 `course_id` 조합이 중복 저장되지 않는다.
- 수강 취소는 기존 레코드를 삭제하지 않고 `status='cancelled'`로 갱신하여 이력을 유지한다.
- 성공/실패 여부는 Learner 대시보드 UI에 즉시 반영되어야 한다.
- 검색 필터는 기획된 항목(카테고리, 난이도, 최신/인기 정렬)에 한정한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 검색어/필터 입력
FE -> BE: GET /api/courses?query=...
BE -> Database: SELECT courses WHERE status='published'
Database --> BE: 코스 목록
BE --> FE: 코스 리스트 응답
FE -> User: 검색 결과 표시

User -> FE: 코스 상세 요청
FE -> BE: GET /api/courses/:id
BE -> Database: SELECT course detail
Database --> BE: 코스 상세 데이터
BE --> FE: 코스 상세 응답
FE -> User: 상세 정보 렌더

User -> FE: 수강신청 클릭
FE -> BE: POST /api/enrollments {courseId}
BE -> Database: SELECT enrollments WHERE learner+course
Database --> BE: 중복 여부
BE -> Database: INSERT INTO enrollments
Database --> BE: insert success
BE --> FE: 신청 성공 응답
FE -> User: 성공 메시지 및 대시보드 갱신

User -> FE: 수강 취소 클릭
FE -> BE: PATCH /api/enrollments/:id {status: cancelled}
BE -> Database: UPDATE enrollments SET status='cancelled'
Database --> BE: update success
BE --> FE: 취소 성공 응답
FE -> User: 취소 완료 메시지
@enduml
