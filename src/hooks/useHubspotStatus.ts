// src/hooks/useHubspotStatus.ts
import { useEffect, useState } from "react";

export function useHubspotStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hubspot/status")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { isConnected, isLoading };
}
