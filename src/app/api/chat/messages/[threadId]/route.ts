import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Params = Promise<{ threadId: string }>;

export async function GET(
  req: NextRequest,
  context: { params: Params }
): Promise<NextResponse> {
  const { threadId } = await context.params;

  const result = await pool.query(
    `SELECT role, content, created_at
     FROM "ChatMessage"
     WHERE thread_id = $1
     ORDER BY created_at ASC`,
    [threadId]
  );

  return NextResponse.json({ messages: result.rows });
}
