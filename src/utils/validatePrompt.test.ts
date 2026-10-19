import { describe, it, expect } from 'vitest';
import { validatePrompt, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePrompt', () => {
  it('최대 길이는 500자다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });

  it('500자 이하면 유효하다', () => {
    expect(validatePrompt('프로필 카드').valid).toBe(true);
  });

  it('정확히 500자는 유효하다', () => {
    expect(validatePrompt('가'.repeat(500)).valid).toBe(true);
  });

  it('501자부터는 유효하지 않다', () => {
    expect(validatePrompt('가'.repeat(501)).valid).toBe(false);
  });

  it('유효하지 않으면 초과 글자 수를 알려주는 에러 메시지를 반환한다', () => {
    const result = validatePrompt('가'.repeat(510));
    expect(result.error).toBe('프롬프트는 500자까지 입력할 수 있어요. 10자를 줄여주세요.');
  });

  it('유효하면 에러 메시지가 없다', () => {
    expect(validatePrompt('프로필 카드').error).toBeUndefined();
  });

  it('길이는 앞뒤 공백을 제외하고 센다', () => {
    const result = validatePrompt(`  ${'가'.repeat(500)}  `);
    expect(result.length).toBe(500);
    expect(result.valid).toBe(true);
  });
});
