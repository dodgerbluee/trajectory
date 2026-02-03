import { useCallback, useRef, useState } from 'react';

interface UseFormStateOptions<T> {
  initialValue: T;
}

interface UseFormStateResult<T> {
  state: T;
  update: (field: keyof T, value: any) => void;
  batchUpdate: (fields: Partial<T>) => void;
  getCurrent: () => T;
  reset: () => void;
}

export function useFormState<T extends Record<string, any>>(
  options: UseFormStateOptions<T>
): UseFormStateResult<T> {
  const [state, setState] = useState(options.initialValue);
  const stateRef = useRef(state);
  const initialRef = useRef(options.initialValue);

  const update = useCallback((field: keyof T, value: any) => {
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
