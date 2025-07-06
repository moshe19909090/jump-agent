"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Chat from "@/components/Chat";

export default function HomePage() {
  const { data: session } = useSession();

  const fetchThreads = async () => {
    const res = await fetch("/api/gmail/threads");
    const data = await res.json();
    console.log("📩 Gmail Threads:", data);
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Jump Agent</h1>

      {!session ? (
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign in with Google
        </button>
      ) : (
        <>
          <p className="mb-4">Signed in as {session.user?.email}</p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded mb-6"
          >
            Sign out
          </button>
          <Chat />

          <button onClick={fetchThreads}>Fetch Gmail Threads</button>
        </>
      )}
    </main>
  );
}
