import { useState, useEffect } from 'react';

interface NetworkStatus {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveData: boolean;
  isSlowConnection: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  saveData: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

function getConnection(): NetworkInformation | undefined {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const connection = getConnection();
    const effectiveType = connection?.effectiveType || 'unknown';
    return {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      effectiveType,
      saveData: connection?.saveData || false,
      isSlowConnection: ['slow-2g', '2g'].includes(effectiveType),
    };
  });

  useEffect(() => {
    const connection = getConnection();

    const updateStatus = () => {
      const effectiveType = connection?.effectiveType || 'unknown';
      setStatus({
        online: navigator.onLine,
        effectiveType,
        saveData: connection?.saveData || false,
        isSlowConnection: ['slow-2g', '2g'].includes(effectiveType),
      });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    connection?.addEventListener('change', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      connection?.removeEventListener('change', updateStatus);
    };
  }, []);

  return status;
}
