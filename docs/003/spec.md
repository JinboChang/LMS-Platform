# Use Case: Learner 대시보드 조회

- **Primary Actor**: 현재 코스를 수강 중인 Learner
- **Precondition**: Learner는 로그인되어 있고 온보딩 및 최소 1회 프로필 등록을 완료했으며 대시보드 메뉴에 접근했다.
- **Trigger**: Learner가 대시보드 페이지(`/dashboard`)에 진입하거나 새로고침을 수행한다.

## Main Scenario
1. Learner가 대시보드 페이지로 이동한다.
2. FE는 세션 정보를 확인한 뒤 `/api/dashboard/overview`를 호출한다.
3. BE는 `enrollments`에서 Learner의 `status='active'` 코스 목록을 조회하고, 각 코스에 연결된 `courses` 메타를 가져온다.
4. BE는 각 코스에 대해 `assignments`와 `assignment_submissions`를 조합해 진행률(제출/총 과제), 마감 임박 과제, 최근 피드백을 계산한다.
5. BE는 코스 요약, 진행률, 임박 과제 리스트, 최근 피드백 요약을 포함한 대시보드 응답을 반환한다.
6. FE는 응답 데이터를 기반으로 코스 카드, 진행률 UI, 알림 섹션을 렌더링한다.
7. Learner가 특정 코스를 클릭하면 FE는 해당 코스 상세 또는 과제 페이지로 이동하도록 라우팅한다.

## Edge Cases
- 활성 수강 코스가 없는 경우: BE가 빈 배열을 반환하고 FE는 “수강 중인 코스가 없습니다” 메시지를 표시한다.
- 임박 과제가 없는 경우: 임박 섹션을 숨기거나 기본 안내 문구를 노출한다.
- 최근 피드백이 없는 경우: “최근 피드백 없음” 메시지로 대체한다.
- 세션 만료/인증 실패: BE가 401을 반환하면 FE는 로그인 페이지로 리디렉션한다.
- DB 오류 또는 계산 실패: BE가 500을 반환하면 FE는 재시도 버튼과 함께 오류 알림을 노출한다.

## Business Rules
- 대시보드에는 `status='active'`인 수강 기록만 노출된다.
- 진행률은 `제출된 과제 수 / 전체 과제 수`로 계산하며, 전체 과제가 0이면 0%로 간주한다.
- 임박 과제는 마감 48시간 이내인 `assignments.status='published'` 항목으로 제한한다.
- 최근 피드백은 `assignment_submissions.feedback_updated_at` 기준 최신 3건을 노출한다.
- Learner 본인의 데이터만 조회 가능하며 다른 사용자 데이터 접근은 차단한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 대시보드 페이지 진입
FE -> BE: GET /api/dashboard/overview
BE -> Database: SELECT enrollments WHERE learner_id
Database --> BE: 활성 수강 코스 목록
BE -> Database: SELECT courses, assignments, submissions
Database --> BE: 코스/과제/제출 데이터
BE --> FE: 대시보드 요약 응답
FE -> User: 코스 진행률·임박 과제·피드백 표시
@enduml
