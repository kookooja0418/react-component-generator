# src/AGENTS.md

## Module Context

React 19 + Vite 프론트엔드. `App.tsx`가 상태를 소유하고 `useComponentGenerator` 훅이 `/api/generate` 호출을 담당한다.

## Tech Stack and Constraints

- 스타일은 `App.css` 한 파일의 전역 클래스로 관리한다 (CSS Modules, CSS-in-JS 없음). 테마 토큰은 `App.css`의 `:root` 변수, 폰트는 `index.css`의 `@font-face`다.
- 폰트는 `galmuri/dist`의 woff2를 직접 선언해 쓴다. `galmuri.css`를 통째로 import하면 모든 크기의 ttf가 번들에 포함되어 수십 MB가 된다 (src/index.css:1-20).
- 미리보기 렌더러는 react-live다. 생성된 컴포넌트는 인라인 스타일을 쓰므로 `.preview-render` 안쪽 스타일이 앱 CSS 변수에 의존하면 안 된다.

## Implementation Patterns

- 컴포넌트는 `src/components/`에 named export로 둔다 (default export는 `App.tsx`만).
- API 호출은 훅에서만 한다. 컴포넌트가 직접 `fetch('/api/generate')`를 호출하지 않는다 (예외: 설정 조회 `/api/config`는 App.tsx:25).

## Testing Strategy

```bash
bunx vitest run src
```

- 현재 테스트는 `PromptInput.test.tsx`뿐이다. `ComponentCard`, `useComponentGenerator`, `App`은 테스트가 없다.
- 테스트는 한국어 버튼 이름으로 요소를 찾는다 ('컴포넌트 생성', '생성 중...': PromptInput.test.tsx:9, 18, 27). 해당 문구를 바꾸면 테스트도 같이 수정한다.
- `PromptInput`의 `textbox` 역할이 하나여야 한다 (PromptInput.test.tsx:17 `getByRole('textbox')`). 입력 요소를 추가할 때 이 가정을 확인한다.

## Local Golden Rules

- `App.tsx`의 `handleGenerate`가 재생성 버튼의 콜백으로도 쓰인다 (src/App.tsx:176). API 키 검증 로직을 이 함수 밖으로 빼면 재생성 경로에서 검증이 빠진다.
- 프로바이더를 바꾸면 입력한 API 키를 비운다 (src/App.tsx:41-44). 다른 프로바이더로 키가 전송되는 것을 막는 동작이므로 유지한다.
- 새 결과는 목록 맨 앞에 추가된다 (`[newComponent, ...prev]`, src/hooks/useComponentGenerator.ts:42). 순서를 바꾸면 최신 결과가 화면 아래로 밀린다.
- 클래스명은 테스트에서 쓰지 않지만 `App.css` 하나가 모든 컴포넌트를 담당한다. JSX 클래스명을 바꾸면 `App.css`의 같은 이름 선택자와 반응형 블록 (`@media`)까지 함께 수정한다.
