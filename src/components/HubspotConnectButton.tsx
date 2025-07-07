"use client";

import { useHubspotStatus } from "@/hooks/useHubspotStatus";

export default function HubspotConnectButton() {
  const { isConnected, isLoading } = useHubspotStatus();

  if (isLoading) return null;

  return isConnected ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-green-600 font-medium">
        ✅ HubSpot connected
      </span>
      <button
        onClick={() => (window.location.href = "/api/hubspot/signout")}
        className="px-3 py-1 text-sm text-red-600 hover:underline"
      >
        Disconnect
      </button>
    </div>
  ) : (
    <button
      onClick={() => (window.location.href = "/api/oauth/hubspot/start")}
      className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
    >
      Connect HubSpot
    </button>
  );
}
