// ============================================================
// useApi — generic data-fetching hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  deps: unknown[] = [],
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcher();
      if (result.success && result.data !== undefined) {
        setState({ data: result.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: result.error || 'Failed to load data.' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setState({ data: null, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { ...state, refetch };
}
