import { Session } from "next-auth";

export const createNewThread = async (session: Session | null) => {
  const res = await fetch("/api/chat/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: session?.user?.email || undefined }),
  });
  const data = await res.json();
  return data.threadId;
};
