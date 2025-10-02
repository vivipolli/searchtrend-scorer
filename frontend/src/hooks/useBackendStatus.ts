import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/client';

interface BackendStatus {
  loading: boolean;
  healthy: boolean;
  uptime?: number;
  message?: string;
  error?: string;
}

export const useBackendStatus = (): BackendStatus => {
  const [status, setStatus] = useState<BackendStatus>({ loading: true, healthy: false });

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const response = await fetchHealth();
        if (!isMounted) return;

        setStatus({
          loading: false,
          healthy: true,
          uptime: response.uptime,
          message: response.message,
        });
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          loading: false,
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkHealth();

    const intervalId = setInterval(checkHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return status;
};


