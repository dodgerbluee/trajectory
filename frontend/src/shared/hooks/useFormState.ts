import { useCallback, useRef, useState } from 'react';

interface UseFormStateOptions<T> {
  initialValue: T;
}

interface UseFormStateResult<T> {
  state: T;
  update: <K extends keyof T>(field: K, value: T[K]) => void;
  batchUpdate: (fields: Partial<T>) => void;
  getCurrent: () => T;
  reset: () => void;
}

export function useFormState<T = Record<string, unknown>>(
  options: UseFormStateOptions<T>
): UseFormStateResult<T> {
  const [state, setState] = useState(options.initialValue);
  const stateRef = useRef(state);
  const initialRef = useRef(options.initialValue);

  const update = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState((prev) => {
      const next = { ...prev, [field]: value };
      stateRef.current = next;
      return next;
    });
  }, []);

  const batchUpdate = useCallback((fields: Partial<T>) => {
    setState((prev) => {
      const next = { ...prev, ...fields };
      stateRef.current = next;
      return next;
    });
  }, []);

  const getCurrent = useCallback(() => stateRef.current, []);

  const reset = useCallback(() => {
    setState(initialRef.current);
    stateRef.current = initialRef.current;
  }, []);

  return { state, update, batchUpdate, getCurrent, reset };
}
