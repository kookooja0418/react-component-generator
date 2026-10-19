import { describe, it, expect } from 'vitest';
import {
  stripCodeFences,
  ensureRenderCall,
  splitSseData,
  anthropicTextDelta,
  googleTextDelta,
} from './generator';

describe('stripCodeFences', () => {
  it('언어 태그가 붙은 코드펜스를 제거한다', () => {
    const input = '```tsx\nconst A = () => null;\n```';
    expect(stripCodeFences(input)).toBe('const A = () => null;');
  });

  it('언어 태그 없는 코드펜스도 제거한다', () => {
    const input = '```\nconst A = 1;\n```';
    expect(stripCodeFences(input)).toBe('const A = 1;');
  });

  it('펜스가 없으면 앞뒤 공백만 정리해 그대로 반환한다', () => {
    expect(stripCodeFences('  const A = 1;  ')).toBe('const A = 1;');
  });
});

describe('ensureRenderCall', () => {
  it('이미 render() 호출이 있으면 그대로 둔다', () => {
    const code = 'const Card = () => null;\nrender(<Card />);';
    expect(ensureRenderCall(code)).toBe(code);
  });

  it('const 컴포넌트 선언에 render 호출을 주입한다', () => {
    const code = 'const Card = () => null;';
    expect(ensureRenderCall(code)).toBe(`${code}\n\nrender(<Card />);`);
  });

  it('function 선언 컴포넌트에도 render 호출을 주입한다', () => {
    const code = 'function Widget() { return null; }';
    expect(ensureRenderCall(code)).toContain('render(<Widget />);');
  });

  it('대문자로 시작하는 컴포넌트 선언이 없으면 원본을 그대로 반환한다', () => {
    const code = 'const value = 42;';
    expect(ensureRenderCall(code)).toBe(code);
  });
});

describe('splitSseData', () => {
  it('완성된 이벤트의 data 페이로드를 꺼내고 나머지는 남긴다', () => {
    const { payloads, rest } = splitSseData('data: {"a":1}\n\ndata: {"a":2}\n\ndata: {"a"');
    expect(payloads).toEqual(['{"a":1}', '{"a":2}']);
    expect(rest).toBe('data: {"a"');
  });

  it('CRLF 구분자도 처리한다', () => {
    const { payloads } = splitSseData('event: x\r\ndata: hello\r\n\r\n');
    expect(payloads).toEqual(['hello']);
  });
});

describe('anthropicTextDelta', () => {
  it('content_block_delta의 text를 반환한다', () => {
    const payload = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: '안녕' } });
    expect(anthropicTextDelta(payload)).toBe('안녕');
  });

  it('텍스트가 없는 이벤트는 빈 문자열이다', () => {
    expect(anthropicTextDelta(JSON.stringify({ type: 'message_start' }))).toBe('');
  });

  it('과부하 에러 이벤트는 503이 담긴 에러를 던진다', () => {
    const payload = JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'x' } });
    expect(() => anthropicTextDelta(payload)).toThrow('503');
  });

  it('요청 한도 에러 이벤트는 429가 담긴 에러를 던진다', () => {
    const payload = JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'x' } });
    expect(() => anthropicTextDelta(payload)).toThrow('429');
  });

  it('응답 본문을 에러 메시지에 넣지 않는다', () => {
    const payload = JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'secret-body' } });
    expect(() => anthropicTextDelta(payload)).toThrow(/^(?!.*secret-body)/);
  });

  it('max_tokens로 끝나면 잘림 에러를 던진다', () => {
    const payload = JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'max_tokens' } });
    expect(() => anthropicTextDelta(payload)).toThrow('잘렸습니다');
  });
});

describe('googleTextDelta', () => {
  it('candidates의 parts 텍스트를 이어서 반환한다', () => {
    const payload = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] });
    expect(googleTextDelta(payload)).toBe('ab');
  });

  it('MAX_TOKENS로 끝나면 잘림 에러를 던진다', () => {
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'a' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(() => googleTextDelta(payload)).toThrow('잘렸습니다');
  });

  it('청크에 error 객체가 있으면 상태 코드가 담긴 에러를 던진다', () => {
    const payload = JSON.stringify({ error: { code: 503, message: 'secret-body' } });
    expect(() => googleTextDelta(payload)).toThrow('Gemini API error: 503');
  });

  it('STOP이 아닌 비정상 종료 사유는 에러를 던진다', () => {
    const payload = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'a' }] }, finishReason: 'SAFETY' }] });
    expect(() => googleTextDelta(payload)).toThrow('SAFETY');
  });

  it('STOP으로 정상 종료하면 텍스트를 반환한다', () => {
    const payload = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'a' }] }, finishReason: 'STOP' }] });
    expect(googleTextDelta(payload)).toBe('a');
  });
});
