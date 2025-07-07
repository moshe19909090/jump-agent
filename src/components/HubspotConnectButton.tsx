"use client";

import { useHubspotStatus } from "@/hooks/useHubspotStatus";

export default function HubspotConnectButton() {
  const { isConnected, isLoading } = useHubspotStatus();

  if (isLoading) return null;

  if (isConnected) {
    return (
      <span className="text-sm text-green-600 font-medium">
        ✅ HubSpot connected
      </span>
    );
  }

  return (
    <button
      onClick={() => (window.location.href = "/api/oauth/hubspot/start")}
      className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
    >
      Connect HubSpot
    </button>
  );
}
