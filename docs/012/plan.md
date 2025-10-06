# Operator Management 모듈 설계 계획

## 개요
- `src/features/operator/backend/schema.ts`: 신고 처리/메타데이터 관리 요청·응답 Zod 스키마 정의.
- `src/features/operator/backend/repository.ts`: `reports`, `report_actions`, `course_categories`, `difficulty_levels` 조회/업데이트 Supabase 래퍼.
- `src/features/operator/backend/service.ts`: 권한 검증, 신고 상태 전환, 조치 기록, 메타데이터 CRUD 규칙 적용.
- `src/features/operator/backend/route.ts`: `/api/operator/reports`, `/api/operator/categories`, `/api/operator/difficulty-levels` 등 라우트 등록.
- `src/backend/hono/app.ts`: Operator 라우트 등록.
- `src/features/operator/lib/dto.ts`: 프런트에서 사용하는 신고/조치/메타데이터 DTO.
- `src/features/operator/lib/validators.ts`: 신고 처리 및 메타데이터 폼 Zod 스키마.
- `src/features/operator/hooks/useReports.ts`: 신고 목록 조회 훅.
- `src/features/operator/hooks/useReportAction.ts`: 신고 처리 mutation 훅.
- `src/features/operator/hooks/useCategories.ts`, `useDifficultyLevels.ts`: 메타데이터 CRUD 훅.
- `src/features/operator/components/report-table.tsx`: 신고 목록/필터 UI.
- `src/features/operator/components/report-detail-drawer.tsx`: 신고 상세/처리 폼.
- `src/features/operator/components/report-action-result.tsx`: 처리 결과/알림.
- `src/features/operator/components/metadata-editor.tsx`: 카테고리/난이도 관리 UI.
- `src/app/(protected)/operator/page.tsx`: 운영 대시보드 페이지.

## Diagram
```mermaid
graph TD
  Operator[Operator] --> OperatorPage[app/(protected)/operator/page.tsx]
  OperatorPage --> ReportsHook[hooks/useReports]
  OperatorPage --> ReportActionHook[hooks/useReportAction]
  OperatorPage --> CategoriesHook[hooks/useCategories]
  OperatorPage --> DifficultyHook[hooks/useDifficultyLevels]
  ReportsHook --> ApiClient[/@/lib/remote/api-client\]
  ReportActionHook --> ApiClient
  CategoriesHook --> ApiClient
  DifficultyHook --> ApiClient
  ApiClient --> OperatorRoutes[backend/route]
  OperatorRoutes --> OperatorService[backend/service]
  OperatorService --> OperatorRepo[backend/repository]
  OperatorRepo --> Database[(Supabase)]
  OperatorService --> OperatorSchema[backend/schema]
  ReportsHook --> OperatorDTO[lib/dto]
  OperatorPage --> ReportTable[components/report-table]
  OperatorPage --> ReportDetailDrawer[components/report-detail-drawer]
  OperatorPage --> ReportActionResult[components/report-action-result]
  OperatorPage --> MetadataEditor[components/metadata-editor]
  ReportDetailDrawer --> Validators[lib/validators]
```

## Implementation Plan
### Backend
1. `schema.ts`
   - `ReportFilterQuery`, `ReportActionRequest`, `ReportResponse`.
   - `CategoryRequest`(create/update), `DifficultyRequest`.
   - **Unit Test**: 신고 조치 enum 검증, 필수 필드 누락, 정상 케이스.

2. `repository.ts`
   - `listReports(filter)`, `getReport(reportId)`.
   - `updateReportStatus(reportId, status)`.
   - `insertReportAction(reportId, action)`.
   - `listCategories()`, `updateCategory(id, payload)`, `createCategory`, `toggleCategoryActive`.
   - `listDifficultyLevels()` 등.
   - **Unit Test**: Supabase 호출 조건/필드 검증, 예외 처리.

3. `service.ts`
   - 권한 확인: 세션 사용자 role=operator.
   - 신고 처리: 상태 전환 순서(validate `received -> investigating -> resolved`), action enum 확인, 감사 로그 생성.
   - 메타데이터 관리: create/update시 중복 체크, 비활성화 처리.
   - **Unit Test**:
     - 권한 없음 → 403.
     - 상태 전환 순서 오류 → 409.
     - 잘못된 action type → 422.
     - 성공 처리 → 예상 응답 및 DB 업데이트.

4. `route.ts`
   - `GET /operator/reports`, `PATCH /operator/reports/:reportId`, `POST /operator/reports/:reportId/actions`.
   - `GET/POST/PATCH /operator/categories`, `.../difficulty-levels`.
   - `respond` 유틸 사용, 오류 코드/상태 매핑.
   - **Unit Test**: 성공, 검증 실패, 권한 오류, 서버 오류.

5. `src/backend/hono/app.ts`
   - `registerOperatorRoutes(app)` 추가.

### Frontend
6. `lib/validators.ts`
   - 신고 처리 폼(상태, 액션 타입, 메모), 메타데이터 폼(이름, active 플래그) 스키마.
   - **Unit Test**: 필수값 검증.

7. `lib/dto.ts`
   - `ReportItem`, `ReportDetail`, `ReportAction`, `CategoryItem`, `DifficultyItem` 타입 정의.
   - 응답 파싱 실패 시 예외.

8. `hooks/useReports.ts`
   - React Query `useQuery`로 신고 목록/필터 조회.
   - 필터 상태(상태, 유형) 관리.

9. `hooks/useReportAction.ts`
   - `useMutation`으로 신고 처리 PATCH/POST 호출.
   - 성공 시 목록/상세 캐시 무효화.
   - 오류 코드별 메시지(`INVALID_STATUS_FLOW`, `ACTION_REQUIRED`).

10. `hooks/useCategories.ts`, `useDifficultyLevels.ts`
    - 목록 조회/생성/수정 mutation 제공.

11. `components/report-table.tsx`
    - 신고 목록, 필터 UI, 상태 뱃지.
    - 빈 상태/로딩 처리.
    - **QA Sheet**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 필터 적용 | 목록 필터링 |
      | 신고 선택 | 상세 열림 |

12. `components/report-detail-drawer.tsx`
    - 신고 상세 정보(대상, 사유, 타임라인) 표시.
    - 처리 폼(상태/조치 선택, 메모 입력).
    - **QA Sheet**: 처리 완료 시 drawer 닫힘, 필수값 누락 시 경고.

13. `components/report-action-result.tsx`
    - 처리 성공/실패 알림, 감사 로그 링크(optional).

14. `components/metadata-editor.tsx`
    - 카테고리/난이도 리스트, 추가/수정/활성화 토글 UI.
    - **QA Sheet**: 생성/수정/비활성화 흐름.

15. `src/app/(protected)/operator/page.tsx`
    - 인증 가드(role=operator).
    - 신고 테이블, 상세 drawer, 메타데이터 관리 섹션 배치.
    - 로딩/에러/empty 상태 처리.
    - **QA Sheet (페이지)**:
      | 시나리오 | 기대 결과 |
      | --- | --- |
      | 신고 처리 성공 | 목록 갱신, 성공 알림 |
      | 권한 없음 | 접근 불가 안내 |
      | 메타데이터 수정 | 즉시 반영 |

### 공통/환경
16. 테스트 인프라
    - `tests/operator` 디렉터리에 서비스/헬퍼/훅 테스트 배치.

17. 문서/QA 공유
    - QA 시나리오를 `docs/012/spec.md`와 함께 공유.

18. 후속 TODO
    - 자동 알림/이메일 발송 연계.
    - 감사 로그 UI 제공.
