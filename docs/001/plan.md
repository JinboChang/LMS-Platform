# Onboarding 모듈 설계 계획

## 개요
- `src/features/onboarding/backend/schema.ts`: 온보딩 요청/응답 및 DB 레코드 검증을 위한 Zod 스키마 정의.
- `src/features/onboarding/backend/error.ts`: Supabase/Auth/DB 단계별 에러 코드를 규격화한 상수/타입.
- `src/features/onboarding/backend/service.ts`: Supabase Admin API 호출과 `users` 테이블 저장을 아우르는 비즈니스 로직.
- `src/features/onboarding/backend/route.ts`: `POST /api/onboarding` 엔드포인트 등록 및 요청 처리.
- `src/backend/hono/app.ts`: 온보딩 라우트 등록 추가.
- `src/features/onboarding/lib/form-schema.ts`: 프런트엔드 폼 검증용 Zod 스키마와 기본 값/유틸.
- `src/features/onboarding/hooks/useOnboardingMutation.ts`: React Query 기반 온보딩 제출 훅, 에러 메시지 정규화.
- `src/features/onboarding/components/onboarding-form.tsx`: 역할 선택 및 기본 정보 입력 UI 컴포넌트.
- `src/features/onboarding/components/role-card.tsx`: 역할 선택 카드 UI 분리(hover/선택 상태 재사용 목적).
- `src/app/onboarding/page.tsx`: 온보딩 페이지 쉘, 인증 가드 및 리디렉션 로직 포함.
- `src/app/signup/page.tsx`: 온보딩 미완료 사용자일 때 `/onboarding`으로 안내하는 후속 동작 추가.
- `src/features/onboarding/lib/role-options.ts`: 역할 옵션 상수 및 I18N label 매핑.
- `src/features/onboarding/lib/supabase-admin.ts`: Supabase Admin 호출 래퍼(테스트 용이성 확보).

## Diagram
```mermaid
graph TD
  User[사용자 입력] --> FEPage[onboarding/page.tsx]
  FEPage --> FormComp[components/onboarding-form]
  FormComp --> MutationHook[hooks/useOnboardingMutation]
  MutationHook --> ApiClient[/@/lib/remote/api-client\]
  ApiClient --> HonoRoute[backend/route.ts]
  HonoRoute --> Service[backend/service.ts]
  Service --> SupabaseAuth[Supabase Admin API]
  Service --> UsersTable[(public.users)]
  HonoRoute --> Schema[backend/schema.ts]
  FEPage --> FormSchema[lib/form-schema.ts]
```

## Implementation Plan
### Backend
1. `src/features/onboarding/backend/schema.ts`
   - 요청 바디(`email`, `name`, `phoneNumber`, `role`)와 응답(`accessToken`, `role`)을 Zod로 정의하고 타입 내보내기.
   - `role`은 `learner | instructor`로 제한, 전화번호는 E.164 패턴 기본 적용.
   - **Unit Test**: `vitest` 도입 후 스키마 파싱 성공/실패 케이스(정상, 빈 값, 잘못된 전화번호)를 테스트.

2. `src/features/onboarding/backend/error.ts`
   - `onboardingErrorCodes` 상수(예: `EMAIL_ALREADY_EXISTS`, `AUTH_CREATE_FAILED`, `PROFILE_INSERT_FAILED`).
   - 서비스/라우트에서 재사용할 타입 `OnboardingServiceError` 정의.
   - **참고**: 단순 상수라 테스트 대신 서비스 단위 테스트에서 검증.

3. `src/features/onboarding/backend/supabase-admin.ts`
   - Supabase Admin 호출을 함수(`createUserWithSession`, `ensureProfile`)로 캡슐화.
   - Supabase SDK 의존성을 주입 가능하게 설계하여 테스트 시 모킹.
   - **Unit Test**: `vitest`로 happy path, 이메일 중복, 기타 오류 발생 시 throw 여부 확인(모킹).

4. `src/features/onboarding/backend/service.ts`
   - 의존성 주입을 통해 `supabaseAdmin` 유틸과 `SupabaseClient`를 받아 처리.
   - 트랜잭션 유사 플로우: Auth 생성 실패 시 즉시 반환, Auth 성공 후 DB insert 실패 시 생성된 Auth 사용자 롤백(`auth.admin.deleteUser`).
   - 성공 시 세션 토큰/역할을 담아 `success` 반환.
   - **Unit Test**:
     - 시나리오: (a) 전체 성공, (b) 이메일 중복 → `EMAIL_ALREADY_EXISTS`, (c) Auth 기타 오류 → `AUTH_CREATE_FAILED`, (d) DB insert 실패 → 롤백 후 `PROFILE_INSERT_FAILED`.
     - Supabase 클라이언트/유틸을 `vi.fn()`으로 모킹.

5. `src/features/onboarding/backend/route.ts`
   - `POST /onboarding` 등록, Zod 파싱 실패 시 400 반환.
   - 서비스 호출 후 `respond` 사용, 로깅 포함.
   - **Unit Test**: Hono `app.request`를 사용한 통합 테스트 (성공/검증 오류/서비스 오류 -> 적절한 status & body 확인).

6. `src/backend/hono/app.ts`
   - `registerOnboardingRoutes` 호출 추가 위치 정의 (예: `registerExampleRoutes` 이전/이후).
   - **Regression Check**: 기존 example 라우트와 충돌 없는지 수동 검증.

### Frontend
7. `src/features/onboarding/lib/form-schema.ts`
   - 프런트용 Zod 스키마(백엔드와 동일 필드) 및 기본 값 제공.
   - 전화번호/이름 트리밍, 역할 기본값 없음.
   - **Unit Test**: `vitest` 환경에서 클라이언트 스키마가 서버 스키마와 동일 제약을 갖는지(특히 전화번호/역할) 테스트.

8. `src/features/onboarding/lib/role-options.ts`
   - `const ROLE_OPTIONS = [...]` 형태로 label, description, value 정의.
   - **QA 참고**: 라벨/설명이 기획서와 일치하는지 온보딩 QA에서 확인.

9. `src/features/onboarding/hooks/useOnboardingMutation.ts`
   - `useMutation` 활용, 성공 시 React Query 캐시 정리 및 토스트/리디렉션 로직 반환.
   - 에러 메시지는 `extractApiErrorMessage` 이용, 특정 코드별 사용자 피드백 분기.
   - **Unit Test**: React Query `renderHook` + MSW 모킹으로 성공/에러 메시지 매핑 확인.

10. `src/features/onboarding/components/role-card.tsx`
    - 카드 UI(`use client`), 선택/비활성/포커스 상태 처리.
    - **QA Sheet 포함** (Onboarding Form 항목에 통합).

11. `src/features/onboarding/components/onboarding-form.tsx`
    - `useForm` + `zodResolver`, 역할 선택, 전화번호 입력, 제출 버튼, 로딩/오류 상태 UI 구현.
    - 성공 시 `onSuccess` 콜백으로 페이지에서 리디렉션 처리.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 역할 미선택 상태에서 제출 | Submit 버튼 비활성 또는 오류 메시지 노출 |
      | 잘못된 전화번호 입력 | 전화번호 필드 하단에 검증 오류 표시 |
      | 서버에서 `EMAIL_ALREADY_EXISTS` 수신 | 상단 경고, 로그인 유도 링크 표시 |
      | 성공 응답 수신 | 로딩 스피너 후 역할에 맞는 페이지로 이동 안내 |
      | 네트워크 오류 | 재시도 버튼/메시지 노출 |

12. `src/app/onboarding/page.tsx`
    - `"use client"`; 현재 사용자 상태 확인 (`useCurrentUser`).
    - 인증되지 않은 경우 `/login` 리디렉션, 이미 프로필이 존재하면 역할별 대시보드로 이동.
    - 온보딩 완료 시 역할에 따라 `/courses` 또는 `/instructor/dashboard` 등으로 라우팅.
    - **QA Sheet** (페이지 수준): 비로그인 접근 차단, 이미 온보딩 완료 사용자 우회, 신규 사용자 플로우 체킹.

13. `src/app/signup/page.tsx`
    - 가입 성공 시 세션이 있어도 바로 홈 이동 대신 `/onboarding`으로 안내(프로필 여부 검사 필요 시 API 호출).
    - Supabase `signUp` 응답에 session이 없을 때도 안내 문구 업데이트.
    - **QA Sheet**: 회원가입 후 온보딩 이동, 이메일 인증 후 재진입 동작 등.

### 공통/환경 정리
14. `docs/001/spec.md` → (참고 전용, 변경 없음).
15. `package.json`
    - `vitest`, `@testing-library/react`, `@testing-library/react-hooks` 추가 및 `test` 스크립트 정의.
    - **Unit Test**: 모든 신규 테스트 `npm run test`로 실행.

16. 테스트 인프라 설정
    - `vitest.config.ts` 작성, `jsdom` 환경 구성(UI 테스트), `setupTests.ts`에서 React Query/MSW 초기화.
    - **Unit Test**: 샘플 테스트 통과 여부 확인.

17. 라우팅/타입 보강
    - 새 API 타입 export를 위해 `src/features/onboarding/lib/dto.ts` 작성(백엔드 응답 Zod → 타입).
    - 프런트 훅에서 DTO 사용으로 타입 안정성 확보.
    - **Unit Test**: DTO 파싱 성공/실패 케이스는 form-schema 테스트에서 함께 검증.

18. 문서/QA 전달
    - QA 시나리오를 `docs/001/spec.md`와 연동하여 팀 공유 (plan.md 참고 명시).
    - **검증**: QA 팀과 확인 후 필요 시 시트 업데이트.
