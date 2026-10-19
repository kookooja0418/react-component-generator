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

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
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

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
