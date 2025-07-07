import { useHubspotStatus } from "@/hooks/useHubspotStatus";

export default function HubspotConnectButton() {
  const { isConnected, isLoading } = useHubspotStatus();

  if (isLoading) return null;

  if (isConnected) {
    return <p className="text-green-600">✅ HubSpot connected</p>;
  }

  return (
    <button
      onClick={() => (window.location.href = "/api/oauth/hubspot/start")}
      className="btn btn-primary"
    >
      Connect HubSpot
    </button>
  );
}
