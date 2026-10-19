# AGENTS.md

## Operational Commands

패키지 매니저는 bun 고정 (bun.lock 존재). npm/yarn/pnpm 사용 금지.

```bash
bun install
bun run dev        # API 서버(3002) + Vite(5173) 동시 실행
bun run test       # vitest run (src/ + server/ 테스트)
bun run lint       # eslint .
bun run build      # tsc -b && vite build
```

- 단일 테스트: `bunx vitest run <파일 경로>`
- 테스트는 반드시 `bun run test`로 실행한다. `bun test`는 bun 내장 러너를 호출해 vitest 설정(jsdom, setupFiles)이 적용되지 않는다 (package.json `test` 스크립트, vite.config.ts:84-89).
- 작업 완료 전 `bun run test`, `bun run lint`, `bun run build`를 모두 통과시킨다.

## Golden Rules

### Immutable

- API 키를 클라이언트로 내려보내지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다 (server/index.ts:148-153). 키 값, 키가 포함된 URL을 응답·로그에 넣지 않는다.
- 외부 API 에러 메시지에 요청 URL이나 응답 본문을 넣지 않는다. Google은 키가 URL 쿼리에 들어가고 (server/index.ts:99), catch 블록이 `err.message`를 그대로 클라이언트에 반환한다 (server/index.ts:192-211). 에러 메시지는 `Gemini API error: ${status}` 형태의 상태 코드만 유지한다.
- `.env`는 커밋하지 않는다 (.gitignore). 워크트리 생성 시에는 복사된다 (.worktreeinclude).

### Do's and Don'ts

- 서버의 에러 코드 매핑은 메시지 문자열에 `503`/`429`가 포함되는지로 동작한다 (server/index.ts:194, 201). 프로바이더 에러 메시지에서 상태 코드를 빼지 않는다.
- 생성 코드의 후처리 로직(`stripCodeFences`, `ensureRenderCall`)은 `server/generator.ts`에 순수 함수로 둔다. `server/index.ts`는 `Bun.serve`를 즉시 실행해 테스트할 수 없고 테스트도 없다. 로직을 index.ts에 추가하지 말고 분리해서 테스트를 붙인다.
- 생성 코드는 react-live `noInline` 모드에서 실행된다 (src/components/LivePreview.tsx:14). `import` 문, TypeScript 문법, `render()` 누락은 미리보기를 깨뜨린다. 이 제약은 SYSTEM_PROMPT (server/index.ts:7-20)와 `ensureRenderCall` (server/generator.ts:16) 두 곳에서 방어한다. 한쪽만 제거하거나 수정하지 않는다.
- `Provider` 타입이 서버(server/index.ts:57)와 프론트(src/types/index.ts:1)에 각각 정의되어 있다. 프로바이더를 추가하면 두 곳과 `PROVIDER_CONFIG` (src/App.tsx:8), `ENV_KEYS` (server/index.ts:59)를 함께 수정한다.
- API 포트 3002가 `Bun.serve` (server/index.ts:139)와 Vite 프록시 (vite.config.ts:78-80)에 중복 정의되어 있다. 변경 시 둘 다 수정한다.
- 사용자에게 보이는 문구, 주석, 테스트 설명은 한국어로 쓴다.

## Project Context

프롬프트를 입력하면 AI가 React 컴포넌트를 생성하고 실시간 미리보기와 코드를 제공하는 도구.

Tech Stack: React 19, TypeScript, Vite, Bun(API 서버), react-live, Vitest, Testing Library, Anthropic/Google Gemini API.

## Standards and References

- 설치·실행 방법: [README.md](./README.md)
- 커밋: `feat|fix|refactor|chore: 한국어 요약`. 절차는 [.claude/skills/commit/SKILL.md](./.claude/skills/commit/SKILL.md) 참고.
- 규칙과 코드 사이에 괴리가 생기면(라인 번호 이동, 파일 삭제 포함) 작업 끝에 AGENTS.md 업데이트를 제안한다.

## Context Map

- **[서버 수정 (Bun API, 프로바이더 호출, 폴백)](./server/AGENTS.md)** — server/ 아래 파일을 수정할 때.
- **[프론트엔드 수정 (컴포넌트, 스타일, 테스트)](./src/AGENTS.md)** — src/ 아래 파일을 수정할 때.
