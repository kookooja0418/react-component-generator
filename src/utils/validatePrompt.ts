export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  valid: boolean;
  length: number;
  error?: string;
}

/** 프롬프트 길이를 검증한다. 제출 시 trim되므로 앞뒤 공백은 세지 않는다. */
export function validatePrompt(prompt: string): PromptValidation {
  const length = prompt.trim().length;

  if (length > MAX_PROMPT_LENGTH) {
    const over = length - MAX_PROMPT_LENGTH;
    return {
      valid: false,
      length,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있어요. ${over}자를 줄여주세요.`,
    };
  }

  return { valid: true, length };
}
