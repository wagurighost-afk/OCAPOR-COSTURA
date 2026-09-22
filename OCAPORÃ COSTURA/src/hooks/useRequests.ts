import { useEffect, useState } from 'react';
import type { CosturaRequest } from '@/types';
import { subscribeRequests } from '@/services/requestService';

export function useRequests() {
  const [requests, setRequests] = useState<CosturaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (requestError) => {
        setError(requestError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [reloadKey]);

  return {
    requests,
    loading,
    error,
    refetch: () => setReloadKey((key) => key + 1),
  };
}
