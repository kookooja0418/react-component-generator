export const MAX_HISTORY = 20;

export function addToHistory(history: string[], prompt: string): string[] {
  const trimmed = prompt.trim();
  if (!trimmed) return history;
  return [trimmed, ...history.filter((p) => p !== trimmed)].slice(0, MAX_HISTORY);
}
