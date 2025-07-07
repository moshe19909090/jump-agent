"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

type Message = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contextSummary, setContextSummary] = useState<any>(null);

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
        }),
      });

      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg as Message]);
      if (data.contextSummary) {
        setContextSummary({
          ...data.contextSummary,
          timestamp: new Date().toLocaleString(),
        });
      }
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
    <div className="flex flex-col h-full max-h-screen bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-white">
        <h2 className="font-semibold text-lg text-gray-800">Ask Anything</h2>
        <div className="flex mt-2 space-x-4 text-sm text-gray-600">
          <button className="font-semibold border-b-2 border-blue-500 pb-1">
            Chat
          </button>
        </div>
        {contextSummary && (
          <div className="text-xs text-gray-500 text-center my-2">
            Context: {contextSummary.emails} emails · {contextSummary.notes}{" "}
            notes · {contextSummary.instructions} instructions —{" "}
            {contextSummary.timestamp}
          </div>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] text-sm whitespace-pre-wrap p-3 rounded-lg shadow-sm ${
              msg.role === "user"
                ? "ml-auto bg-blue-100 text-right"
                : "mr-auto bg-white border"
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

      {/* Input box */}
      <div className="border-t px-4 py-3 bg-white flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border px-3 py-2 rounded-full text-sm bg-gray-50"
          placeholder="Ask anything about your meetings…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full"
        >
          {isLoading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
