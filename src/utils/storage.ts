// localStorage가 막혀 있거나(시크릿 모드 등) 값이 깨져 있어도 앱이 죽지 않도록 항상 기본값으로 되돌린다.
export function readStorage<T>(key: string, fallback: T, parse?: (raw: unknown) => T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback;
    const raw: unknown = JSON.parse(item);
    return parse ? parse(raw) : (raw as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과·접근 차단 시에는 저장만 건너뛴다.
  }
}
