import { useEffect, useState } from 'react';
import type { ProductionOrder } from '@/types';
import { subscribeProductionOrders } from '@/services/productionService';

export function useProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeProductionOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (ordersError) => {
        setError(ordersError.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [reloadKey]);

  return {
    orders,
    loading,
    error,
    refetch: () => setReloadKey((key) => key + 1),
  };
}
