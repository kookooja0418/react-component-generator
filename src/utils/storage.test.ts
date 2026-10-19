import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readStorage, writeStorage } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 값이 없으면 기본값을 반환한다', () => {
    expect(readStorage('k', 'fallback')).toBe('fallback');
  });

  it('저장한 값을 JSON으로 되읽는다', () => {
    writeStorage('k', { a: 1 });
    expect(readStorage('k', null)).toEqual({ a: 1 });
  });

  it('JSON이 깨져 있으면 기본값을 반환한다', () => {
    localStorage.setItem('k', '{broken');
    expect(readStorage('k', 'fallback')).toBe('fallback');
  });

  it('parse가 예외를 던지면 기본값을 반환한다', () => {
    writeStorage('k', 1);
    const parse = () => {
      throw new Error('invalid');
    };
    expect(readStorage('k', 'fallback', parse)).toBe('fallback');
  });

  it('parse가 변환한 값을 반환한다', () => {
    writeStorage('k', 3);
    expect(readStorage('k', 0, (raw) => (raw as number) * 2)).toBe(6);
  });

  it('localStorage 접근이 실패해도 읽기는 기본값을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStorage('k', 'fallback')).toBe('fallback');
  });

  it('localStorage 접근이 실패해도 쓰기는 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeStorage('k', 'v')).not.toThrow();
  });
});
