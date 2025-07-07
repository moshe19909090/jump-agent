import { useEffect, useState } from "react";

export function useHubspotStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetch("/api/hubspot/status")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected);
        setIsExpired(data.expired ?? false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { isConnected, isLoading, isExpired };
}
