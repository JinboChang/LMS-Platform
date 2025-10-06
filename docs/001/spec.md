# Use Case: 역할 선택 & 기본 정보 제출

- **Primary Actor**: 신규 가입 사용자 (Learner 또는 Instructor)
- **Precondition**: 사용자는 이메일 인증을 완료하고 온보딩 화면에 진입했다.
- **Trigger**: 사용자가 역할을 선택하고 필수 정보를 입력한 뒤 "계속"을 클릭한다.

## Main Scenario
1. 사용자는 역할(Learner 또는 Instructor)을 선택하고 이름, 휴대전화 번호, 이메일을 확인한다.
2. FE는 입력값을 검증하고 JSON 페이로드로 `/api/onboarding`에 제출한다.
3. BE는 Supabase Auth API를 호출해 `auth_user_id`를 생성하고 세션 토큰을 발급받는다.
4. BE는 `users` 테이블에 `auth_user_id`, 이메일, 이름, 휴대전화, 선택한 역할을 저장한다.
5. 성공 응답과 함께 기본 권한 토큰이 FE로 전달된다.
6. FE는 역할에 따라 Learner는 코스 카탈로그, Instructor는 강사 대시보드로 리디렉션한다.

## Edge Cases
- 역할 미선택/필수 입력 누락: FE가 즉시 검증 오류 메시지를 표시하고 제출을 중단한다.
- 휴대전화 형식 오류: FE가 포맷 오류 메시지를 반환하고 수정 후 재시도하도록 안내한다.
- 기존 이메일 중복: BE가 Supabase에서 `email_already_exists` 오류를 수신하면 이미 가입된 계정 알림과 로그인 유도 메시지를 반환한다.
- Supabase Auth API 오류: BE가 실패 사유를 로깅 후 "일시적인 문제" 메시지와 함께 재시도 버튼을 제공한다.
- 프로필 저장 실패(DB 연결 오류 등): BE가 트랜잭션을 롤백하고 사용자에게 다시 시도하도록 안내한다.

## Business Rules
- 역할은 `users.role` ENUM(`learner`, `instructor`) 중 하나로 제한된다.
- 이름과 휴대전화 번호는 가입 단계에서 반드시 수집해야 한다.
- 동일 이메일로 중복 가입은 허용되지 않는다.
- Supabase Auth 계정이 생성되지 않으면 로컬 `users` 레코드는 작성되지 않는다.
- 발급된 기본 권한 토큰은 역할별 초기 화면 진입 권한만 제공한다.

## Sequence Diagram

@startuml
participant User
participant FE
participant BE
database Database

User -> FE: 역할 선택 및 기본 정보 입력
FE -> FE: 필수 필드/포맷 검증
FE -> BE: POST /api/onboarding {email, name, phone, role}
BE -> Database: Supabase Auth createUser(email, phone)
Database --> BE: auth_user_id, access_token
BE -> Database: INSERT INTO users(auth_user_id, email, name, phone_number, role)
Database --> BE: insert success
BE --> FE: 201 Created + session token + role
FE -> User: 역할별 초기 화면으로 리디렉션
@enduml
