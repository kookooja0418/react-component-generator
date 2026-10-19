import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const COMPONENTS_STORAGE_KEY = 'rcg:components';

// JSON으로 저장되면 createdAt이 문자열이 되므로 Date로 되돌리고, 형태가 틀리면 예외로 기본값을 쓰게 한다.
function parseComponents(raw: unknown): GeneratedComponent[] {
  if (!Array.isArray(raw)) throw new Error('invalid components');
  return raw.map((item) => {
    const { id, prompt, code, createdAt } = item ?? {};
    const date = new Date(createdAt);
    if (
      typeof id !== 'string' ||
      typeof prompt !== 'string' ||
      typeof code !== 'string' ||
      Number.isNaN(date.getTime())
    ) {
      throw new Error('invalid component');
    }
    return { id, prompt, code, createdAt: date };
  });
}

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

// 서버가 보내는 줄 단위 JSON(NDJSON) 스트림을 이벤트로 풀어준다.
async function* readStreamEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = done ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as StreamEvent;
    }
    if (done) return;
  }
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  /** 생성 중인 코드(스트리밍 누적). 생성 중이 아니면 null. */
  streamingCode: string | null;
  streamingPrompt: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useLocalStorage<GeneratedComponent[]>(
    COMPONENTS_STORAGE_KEY,
    [],
    parseComponents,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingCode, setStreamingCode] = useState<string | null>(null);
  const [streamingPrompt, setStreamingPrompt] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);
    setStreamingPrompt(prompt);
    setStreamingCode('');

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      let received = '';
      let finalCode: string | null = null;

      for await (const event of readStreamEvents(res.body)) {
        if (event.type === 'delta') {
          received += event.text;
          setStreamingCode(received);
        } else if (event.type === 'error') {
          throw new Error(event.error);
        } else if (event.type === 'done') {
          finalCode = event.code;
        }
      }

      if (finalCode === null) {
        throw new Error('응답이 중간에 끊어졌습니다. 다시 시도해주세요.');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: finalCode,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreamingCode(null);
      setStreamingPrompt(null);
      setIsLoading(false);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return {
    components,
    isLoading,
    error,
    streamingCode,
    streamingPrompt,
    generate,
    removeComponent,
    clearAll,
  };
}
