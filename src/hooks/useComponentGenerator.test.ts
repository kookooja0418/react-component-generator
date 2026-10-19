import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator, COMPONENTS_STORAGE_KEY } from './useComponentGenerator';

const encoder = new TextEncoder();
const line = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`);

const streamResponse = (events: object[]) => ({
  ok: true,
  body: new ReadableStream<Uint8Array>({
    start(controller) {
      events.forEach((event) => controller.enqueue(line(event)));
      controller.close();
    },
  }),
});

const stored = [
  { id: '1', prompt: '카드', code: 'render(<div/>)', createdAt: '2026-01-02T03:04:05.000Z' },
];

describe('useComponentGenerator 저장', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 컴포넌트 목록을 초기값으로 복원한다', () => {
    localStorage.setItem(COMPONENTS_STORAGE_KEY, JSON.stringify(stored));
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].prompt).toBe('카드');
  });

  it('복원한 createdAt은 Date 객체다', () => {
    localStorage.setItem(COMPONENTS_STORAGE_KEY, JSON.stringify(stored));
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('형태가 맞지 않는 저장값은 무시하고 빈 목록으로 시작한다', () => {
    localStorage.setItem(COMPONENTS_STORAGE_KEY, JSON.stringify([{ id: 1 }]));
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components).toEqual([]);
  });

  it('생성에 성공하면 목록을 localStorage에 저장한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([{ type: 'done', code: 'render(<p/>)' }])));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('새 카드', undefined, 'google');
    });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(COMPONENTS_STORAGE_KEY) ?? '[]');
      expect(saved[0].prompt).toBe('새 카드');
    });
  });

  it('스트리밍 중에는 받은 코드를 streamingCode에 누적한다', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start: (c) => { controller = c; } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }));
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('버튼', undefined, 'google');
    });
    await act(async () => {
      controller.enqueue(line({ type: 'delta', text: 'const A' }));
      controller.enqueue(line({ type: 'delta', text: ' = 1;' }));
    });
    await waitFor(() => expect(result.current.streamingCode).toBe('const A = 1;'));

    await act(async () => {
      controller.enqueue(line({ type: 'done', code: 'const A = 1;' }));
      controller.close();
      await pending;
    });
  });

  it('완료되면 서버가 보낸 최종 코드로 컴포넌트를 추가하고 streamingCode를 비운다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([
          { type: 'delta', text: '```\nconst A' },
          { type: 'done', code: 'const A = 1;\nrender(<A />);' },
        ]),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.components[0].code).toBe('const A = 1;\nrender(<A />);');
    expect(result.current.streamingCode).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('스트림에서 error 이벤트를 받으면 에러를 표시하고 컴포넌트를 추가하지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([{ type: 'error', error: '과부하' }])));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.error).toBe('과부하');
    expect(result.current.components).toEqual([]);
    expect(result.current.streamingCode).toBeNull();
  });

  it('done 없이 끝난 스트림은 에러로 처리하고 컴포넌트를 추가하지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([{ type: 'delta', text: 'const A' }])));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.error).toBe('응답이 중간에 끊어졌습니다. 다시 시도해주세요.');
    expect(result.current.components).toEqual([]);
  });

  it('한 줄이 여러 청크로 나뉘어 와도 이벤트를 복원한다', async () => {
    const bytes = line({ type: 'done', code: 'const A = 1;' });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.components[0].code).toBe('const A = 1;');
  });

  it('마지막 줄에 개행이 없어도 이벤트를 처리한다', async () => {
    const bytes = line({ type: 'done', code: 'const A = 1;' });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, bytes.length - 1));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.components[0].code).toBe('const A = 1;');
  });

  it('스트림 시작 전 HTTP 에러는 JSON의 error 메시지를 표시한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'API key is required.' }) }),
    );
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('버튼', undefined, 'google');
    });
    expect(result.current.error).toBe('API key is required.');
  });

  it('전체 삭제하면 저장된 목록도 비운다', async () => {
    localStorage.setItem(COMPONENTS_STORAGE_KEY, JSON.stringify(stored));
    const { result } = renderHook(() => useComponentGenerator());
    act(() => result.current.clearAll());
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(COMPONENTS_STORAGE_KEY) ?? 'null')).toEqual([]);
    });
  });
});
