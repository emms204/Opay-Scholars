import { useEffect } from 'react';
import type { ReachData } from '../types/reach';
import { useExplorerStore } from '../store/explorerStore';

export function useReachData() {
  const { setData, setLoading, setError, data } = useExplorerStore();

  useEffect(() => {
    if (data) return;
    setLoading(true);
    fetch('./data/reach.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load reach.json (${r.status})`);
        return r.json() as Promise<ReachData>;
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [data, setData, setLoading, setError]);

  return useExplorerStore();
}
