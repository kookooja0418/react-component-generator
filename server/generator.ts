// AI 응답 텍스트를 react-live에서 실행 가능한 코드로 정규화하는 순수 함수들.
// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.

/** 응답에 섞여 나온 마크다운 코드펜스(```)를 제거한다. */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:jsx|tsx|javascript|typescript)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

const TRUNCATED_MESSAGE = '생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.';

/** SSE 버퍼에서 완성된 이벤트의 data 페이로드를 꺼내고, 아직 덜 온 나머지를 돌려준다. */
export function splitSseData(buffer: string): { payloads: string[]; rest: string } {
  const events = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = events.pop() ?? '';
  const payloads = events.flatMap((event) =>
    event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim()),
  );
  return { payloads, rest };
}

/** Anthropic 스트리밍 이벤트에서 증분 텍스트를 꺼낸다. */
export function anthropicTextDelta(payload: string): string {
  const data = JSON.parse(payload) as {
    type?: string;
    delta?: { type?: string; text?: string; stop_reason?: string };
    error?: { type?: string };
  };
  // 서버 에러 매핑이 메시지의 상태 코드를 보므로 에러 타입을 코드로 바꾼다. 응답 본문은 넣지 않는다.
  if (data.type === 'error') {
    const status = { overloaded_error: 503, rate_limit_error: 429 }[data.error?.type ?? ''];
    throw new Error(`Claude API error: ${status ?? 'stream'}`);
  }
  if (data.type === 'message_delta' && data.delta?.stop_reason === 'max_tokens') {
    throw new Error(TRUNCATED_MESSAGE);
  }
  if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
    return data.delta.text ?? '';
  }
  return '';
}

/** Gemini 스트리밍 청크에서 증분 텍스트를 꺼낸다. 토큰 한도로 잘리면 에러를 던진다. */
export function googleTextDelta(payload: string): string {
  const data = JSON.parse(payload) as {
    error?: { code?: number };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  };
  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.code ?? 'stream'}`);
  }
  const candidate = data.candidates?.[0];
  const reason = candidate?.finishReason;
  if (reason === 'MAX_TOKENS') {
    throw new Error(TRUNCATED_MESSAGE);
  }
  if (reason && reason !== 'STOP') {
    throw new Error(`Gemini 생성이 중단되었습니다: ${reason}`);
  }
  return candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

/**
 * react-live(noInline)는 `render(...)` 호출이 있어야 미리보기를 그린다.
 * 응답에 render 호출이 없으면 첫 컴포넌트 선언을 찾아 자동으로 주입한다.
 */
export function ensureRenderCall(code: string): string {
  if (/\brender\s*\(/.test(code)) return code;

  const match = code.match(/(?:const|function)\s+([A-Z]\w+)/);
  if (match) {
    return `${code}\n\nrender(<${match[1]} />);`;
  }
  return code;
}
