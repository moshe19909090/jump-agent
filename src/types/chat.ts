export type ChatThread = {
  id: number;
  user_id?: string;
  title: string;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  thread_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
