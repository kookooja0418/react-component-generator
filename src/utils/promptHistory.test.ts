import { describe, it, expect } from 'vitest';
import { addToHistory, MAX_HISTORY } from './promptHistory';

describe('addToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addToHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addToHistory(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('앞뒤 공백을 제거해 저장한다', () => {
    expect(addToHistory([], '  a  ')).toEqual(['a']);
  });

  it('빈 프롬프트는 추가하지 않는다', () => {
    expect(addToHistory(['a'], '   ')).toEqual(['a']);
  });

  it('최대 개수를 넘으면 오래된 항목부터 버린다', () => {
    const history = Array.from({ length: MAX_HISTORY }, (_, i) => `p${i}`);
    const next = addToHistory(history, 'new');
    expect(next).toHaveLength(MAX_HISTORY);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`p${MAX_HISTORY - 1}`);
  });
});
