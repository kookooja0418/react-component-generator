# server/AGENTS.md

## Module Context

Bun 기반 AI API 프록시. `/api/generate`, `/api/config` 두 엔드포인트를 제공하며 프론트는 Vite 프록시로 접근한다.

## Tech Stack and Constraints

- 런타임은 Bun (`Bun.serve`, `process.env`). 외부 HTTP 클라이언트 라이브러리 없이 전역 `fetch`만 사용한다 (server/index.ts:69, 101).
- 프로바이더 SDK를 쓰지 않고 REST를 직접 호출한다. SDK 도입은 별도 합의 없이 하지 않는다.
- `src/`를 import하지 않는다. 공유 타입은 중복 정의되어 있다 (루트 AGENTS.md 참고).

## Implementation Patterns

- 새 프로바이더 추가: `callXxx(prompt, apiKey)` 함수 작성 후 `/api/generate` 분기 (server/index.ts:183-186)와 `ENV_KEYS`에 연결한다.
- Google 모델 목록은 우선순위 순서이며 `withModelFallback`으로 앞 모델 실패 시 다음 모델을 시도한다 (server/index.ts:5, 134-136). 순서가 곧 우선순위다.
- 순수 로직은 `generator.ts`, `fallback.ts`에 두고 같은 이름의 `.test.ts`를 둔다.

## Testing Strategy

```bash
bunx vitest run server
```

- 테스트 대상은 순수 함수뿐이다 (server/generator.test.ts, server/fallback.test.ts). `index.ts`는 테스트가 없다.
- 새 로직은 `index.ts`가 아닌 별도 모듈에 만들어 vitest에서 import 가능하게 한다.

## Local Golden Rules

- 응답 잘림 처리는 Google 경로에만 있다 (`finishReason === 'MAX_TOKENS'`, server/index.ts:123). Anthropic 경로 (server/index.ts:68-96)는 `stop_reason`을 확인하지 않는다. Anthropic 경로를 수정할 때 잘림 처리 누락을 인지하고, 추가한다면 Google과 같은 한국어 에러 메시지를 쓴다.
- 토큰 한도가 프로바이더별로 다르다 (Anthropic 4096: server/index.ts:78, Google 8192: server/index.ts:107). 한쪽만 올리면 같은 프롬프트의 결과 길이가 달라진다.
- `stripCodeFences`는 SYSTEM_PROMPT의 "no markdown fences" 지시 (server/index.ts:16)와 이중 방어다. 프롬프트를 수정해도 후처리를 삭제하지 않는다.
- 모든 응답에 `CORS_HEADERS`를 붙인다 (server/index.ts:51-55). 새 응답 분기에서 `headers: CORS_HEADERS`를 빠뜨리지 않는다.
- Anthropic 모델 ID는 `callAnthropic` 안에 하드코딩되어 있다 (server/index.ts:77). 모델 변경 시 이 줄만 수정한다.
