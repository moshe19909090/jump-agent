"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useHubspotStatus } from "@/hooks/useHubspotStatus";
import Chat from "@/components/Chat";

export default function HomePage() {
  const { data: session } = useSession();
  const { isConnected: isHubspotConnected, isLoading: isHubspotLoading } =
    useHubspotStatus();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-800">Jump Agent</h1>
        <p className="text-gray-500 text-lg">
          Your AI assistant for client communication & task automation
        </p>

        {!session ? (
          <div className="space-y-4">
            <button
              onClick={() => signIn("google")}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              Sign in with Google
            </button>

            {!isHubspotLoading && (
              <div>
                {isHubspotConnected ? (
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="text-green-600 font-medium">
                      ✅ HubSpot connected
                    </span>
                    <button
                      onClick={() =>
                        (window.location.href = "/api/hubspot/signout")
                      }
                      className="text-red-600 hover:underline"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      (window.location.href = "/api/oauth/hubspot/start")
                    }
                    className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
                  >
                    Connect HubSpot
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600 gap-2">
              <p>
                Signed in as{" "}
                <span className="font-medium">{session.user?.email}</span>
              </p>
              <div className="flex items-center gap-4">
                {!isHubspotLoading &&
                  (isHubspotConnected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">
                        ✅ HubSpot connected
                      </span>
                      <button
                        onClick={() =>
                          (window.location.href = "/api/hubspot/signout")
                        }
                        className="text-red-600 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        (window.location.href = "/api/oauth/hubspot/start")
                      }
                      className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
                    >
                      Connect HubSpot
                    </button>
                  ))}
                <button
                  onClick={() => signOut()}
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Sign out
                </button>
              </div>
            </div>
            <Chat />
          </div>
        )}
      </div>
    </main>
  );
}
