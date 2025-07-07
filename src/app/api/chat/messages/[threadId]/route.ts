import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: { threadId: string } }
) {
  const threadId = context.params.threadId;

  const result = await pool.query(
    `SELECT role, content, created_at
     FROM "ChatMessage"
     WHERE thread_id = $1
     ORDER BY created_at ASC`,
    [threadId]
  );

  return NextResponse.json({ messages: result.rows });
}
