import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator, COMPONENTS_STORAGE_KEY } from './useComponentGenerator';

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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'render(<p/>)' }) }),
    );
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('새 카드', undefined, 'google');
    });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(COMPONENTS_STORAGE_KEY) ?? '[]');
      expect(saved[0].prompt).toBe('새 카드');
    });
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
