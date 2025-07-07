"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import HubspotConnectButton from "@/components/HubspotConnectButton";

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-12 bg-gray-50">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Jump Agent</h1>
          <HubspotConnectButton />
        </div>

        {!session ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-gray-700">Sign in to get started</p>
            <button
              onClick={() => signIn("google")}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Signed in as{" "}
                <span className="font-medium">{session.user?.email}</span>
              </p>
              <button
                onClick={() => signOut()}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
              >
                Sign out
              </button>
            </div>
            <Chat />
          </>
        )}
      </div>
    </main>
  );
}
