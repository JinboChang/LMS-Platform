# Use Case: 운영 (Operator)

- **Primary Actor**: 신고 처리 및 메타데이터 관리 권한이 있는 Operator
- **Precondition**: Operator는 로그인 상태이며 운영 대시보드에 접근할 수 있는 권한을 가진다.
- **Trigger**: Operator가 신고 목록을 확인하거나 메타데이터(카테고리/난이도)를 관리하려고 운영 화면에 접근한다.

## Main Scenario
1. Operator가 운영 대시보드에 진입한다.
2. FE는 신고 목록, 필터(신고 유형, 상태)를 제공하고 “처리” 버튼을 표시한다.
3. Operator가 특정 신고를 선택하면 FE는 신고 상세(대상, 사유, 작성자 정보 등)를 표시한다.
4. Operator가 처리 결과를 결정(예: 경고, 제출 무효화, 계정 제한)하고 처리 상태를 업데이트하면 FE는 `/api/operator/reports/:reportId`에 PATCH 요청을 보낸다.
5. BE는 Operator 권한을 검증한 뒤 `reports` 테이블의 `status`를 `investigating -> resolved`로 전환하고, `report_actions` 테이블에 조치 정보(경고, 무효화, 계정 제한 등)를 기록한다.
6. Operator가 메타데이터(코스 카테고리/난이도)를 관리하려고 하면 FE는 `/api/operator/categories` 혹은 `/api/operator/difficulty-levels`와 같은 엔드포인트로 CRUD 요청을 전송한다.
7. BE는 권한 검증 후 해당 메타데이터를 생성, 수정, 비활성화(soft delete)한다.
8. 처리 결과가 FE로 반환되고, FE는 신고 목록과 메타데이터 리스트를 갱신한다.

## Edge Cases
- Operator 권한이 없는 사용자가 운영 화면에 접근하려는 경우: BE가 403을 반환하고 FE는 접근 불가 메시지를 표시한다.
- 신고가 이미 `resolved` 상태인데 다시 처리하려는 경우: BE가 409를 반환해 중복 처리를 방지한다.
- 잘못된 조치 유형(정의되지 않은 enum) 입력 시: BE가 400/422 오류를 반환한다.
- DB 오류: BE가 500을 반환하고 FE는 재시도 옵션과 오류 메시지를 표시한다.

## Business Rules
- 신고 처리 상태는 `received -> investigating -> resolved` 순서로 전환된다.
- 조치 유형은 경고, 제출 무효화, 계정 제한 등 사전에 정의된 enum 값만 허용된다.
- 메타데이터 관리 시, 기존 데이터를 삭제하는 대신 비활성화 플래그를 사용한다.
- 모든 운영 활동은 감사 로그(시간, 처리자, 조치 내용)를 남겨야 한다.
- Operator 대시보드 접근은 전용 권한이 있는 계정만 허용된다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 운영 대시보드 접근
FE -> BE: GET /api/operator/reports
BE -> Database: SELECT reports WHERE status IN (...)
Database --> BE: 신고 목록
BE --> FE: 신고 데이터 응답
FE -> User: 신고 목록 렌더링

User -> FE: 신고 처리 제출
FE -> BE: PATCH /api/operator/reports/:reportId {status, action}
BE -> Database: UPDATE reports SET status
BE -> Database: INSERT INTO report_actions
Database --> BE: update/insert success
BE --> FE: 처리 결과 응답
FE -> User: 성공 메시지 및 목록 갱신
@enduml
