"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "I can answer questions about any Jump meeting. What do you want to know?",
  },
  {
    role: "user",
    content: "Find meetings I’ve had with Bill and Tim this month",
  },
  {
    role: "assistant",
    content:
      "Sure, here are some recent meetings that you, Bill, and Tim all attended. I found 2 in May.\n\n🗓️ Thursday 12–1:30pm – Quarterly All Team Meeting\n🗓️ Friday 1–2pm – Strategy review",
  },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    // placeholder assistant response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Got it! I'll check that for you." },
      ]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full max-h-screen border border-gray-200 rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="border-b px-4 py-2 bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-lg">Ask Anything</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium text-black">Chat</span>
          <span className="text-gray-400 cursor-pointer">History</span>
          <span className="text-blue-600 cursor-pointer">+ New thread</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-center text-xs text-gray-400 py-1 border-b">
        Context set to all meetings – 11:17am May 13, 2025
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] p-3 rounded-lg ${
              msg.role === "user"
                ? "ml-auto bg-blue-100 text-right"
                : "mr-auto bg-gray-100"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="border-t p-4 flex items-center gap-2 bg-gray-50">
        <button className="text-xl">➕</button>
        <select className="text-sm border px-2 py-1 rounded">
          <option>All meetings</option>
        </select>
        <input
          type="text"
          className="flex-1 border px-3 py-2 rounded text-sm"
          placeholder="Ask anything about your meetings…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
