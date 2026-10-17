# 정처기 문제 서비스 설계

## 목표

정보처리기사 공부용 플래시카드 서비스. 사용자가 항목(카테고리)·문제·답을 등록하고,
선택한 항목(단일/복수)의 문제를 랜덤 순서로 풀며 "답안보기"로 답을 확인한다.

- 먼저 로컬에서 사용, 이후 인터넷 배포 예정 (단일 사용자, 로그인 없음)
- 자동 채점 없음 — 스스로 확인하는 방식
- 범위 밖: 로그인, 채점, 오답노트

## 스택

- Node.js 20+, Express (유일한 런타임 의존성)
- 저장소: JSON 파일 (`data/db.json`, 경로는 `DATA_FILE` 환경변수로 변경 가능)
- 프론트: 빌드 도구 없는 바닐라 JS, Express가 `public/`을 정적 서빙
- 테스트: Node 내장 `node:test`

## 구조

```
server.js        createApp(store) — 정적 파일 + REST API, 진입점에서 listen
src/store.js     createStore(filePath) — JSON 읽기/쓰기, 파일 접근은 여기서만
data/db.json     데이터 (gitignore)
public/          index.html(문제 풀기), manage.html(관리), app.js, manage.js, api.js, style.css
test/            store.test.js, api.test.js
```

### store

- 시작 시 파일을 메모리로 로드, 파일이 없으면 빈 데이터로 시작
- 변경 시 임시 파일에 쓰고 `rename` (원자적 저장)
- 쓰기는 직렬화(프라미스 체인)해 동시 요청에도 파일이 깨지지 않게 함
- 저장소 교체 시 이 모듈만 바꾸면 되도록 인터페이스를 좁게 유지

## 데이터

```json
{
  "categories": [{ "id": "uuid", "name": "데이터베이스" }],
  "questions":  [{ "id": "uuid", "categoryId": "uuid", "question": "...", "answer": "..." }]
}
```

ID는 `crypto.randomUUID()`.

## API

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/api/categories` | 항목 목록 (각 항목의 문제 수 `count` 포함) |
| POST | `/api/categories` | `{name}` 항목 추가 → 201 |
| PUT | `/api/categories/:id` | `{name}` 이름 수정 |
| DELETE | `/api/categories/:id` | 항목 + 소속 문제 삭제 → 204 |
| GET | `/api/questions?categoryIds=a,b` | 문제 목록 (생략 시 전체) |
| POST | `/api/questions` | `{categoryId, question, answer}` 추가 → 201 |
| PUT | `/api/questions/:id` | 문제 수정 (부분 수정 허용) |
| DELETE | `/api/questions/:id` | 문제 삭제 → 204 |

에러: 빈 문자열/누락 필드, 없는 `categoryId` → 400 `{error}`; 없는 id → 404 `{error}`.
문자열은 trim 후 검증.

## 화면

- **관리 (`/manage.html`)**: 항목 추가·이름변경·삭제(확인창, 문제도 삭제됨을 안내),
  항목 선택 후 문제/답 입력, 문제 목록에서 수정·삭제
- **문제 풀기 (`/`)**: 항목 체크박스(문제 수 표시, 전체 선택) → 시작 →
  클라이언트에서 Fisher–Yates 셔플 → 문제 카드 → 답안보기 → 다음 → 진행도(n/총) →
  완료 시 다시 풀기/항목 다시 선택
- 사용자 입력은 `textContent`로 렌더링 (XSS 방지), 답의 줄바꿈 유지

## 배포 시 주의

- JSON 파일이 유지되는 영구 디스크가 필요 (Railway/Fly.io 볼륨, VPS 등)
- 공개 배포 시 누구나 수정 가능하므로, 배포 단계에서 관리자 비밀번호(환경변수) 추가 권장 — 이번 범위 밖

## 테스트

- store: 로드/빈 시작, CRUD, 항목 삭제 시 문제 연쇄 삭제, 재로드 시 영속성
- API: 각 엔드포인트 정상/에러 케이스, `categoryIds` 필터
