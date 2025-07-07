"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

type Message = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg as Message]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          accessToken: session?.accessToken,
        }),
      });

      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg as Message]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Failed to respond." },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 🔁 Auto-ingest Gmail threads and HubSpot notes on load
  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchAllData = async () => {
      try {
        console.log("🔁 Ingesting Gmail threads and HubSpot notes...");

        const [gmailRes, hubspotRes] = await Promise.all([
          fetch("/api/gmail/threads"),
          fetch("/api/ingest/hubspot", { method: "POST" }),
        ]);

        const gmailData = await gmailRes.json();
        const hubspotData = await hubspotRes.json();

        console.log("📩 Gmail Ingestion Success:", gmailData);
        console.log("📝 HubSpot Ingestion Success:", hubspotData);
      } catch (error) {
        console.error("❌ Ingestion failed:", error);
      }
    };

    fetchAllData();
  }, [session?.accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-h-screen border rounded-xl shadow-sm bg-white">
      <div className="border-b px-6 py-4 bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-xl text-gray-800">Jump Agent</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] text-sm whitespace-pre-wrap p-3 rounded-lg transition-all ${
              msg.role === "user"
                ? "ml-auto bg-blue-100 text-right"
                : "mr-auto bg-gray-100"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-gray-400 italic">Thinking…</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`border-t px-4 py-3 bg-gray-50 flex items-center gap-2 transition-opacity ${
          isLoading ? "opacity-60" : "opacity-100"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border px-3 py-2 rounded text-sm"
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          {isLoading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
