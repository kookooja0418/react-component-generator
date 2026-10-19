import { useState, useEffect } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

export function useLocalStorage<T>(
  key: string,
  initial: T,
  parse?: (raw: unknown) => T,
) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial, parse));

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
