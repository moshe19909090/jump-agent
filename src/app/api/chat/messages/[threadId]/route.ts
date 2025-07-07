import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const result = await pool.query(
    `SELECT role, content, created_at
     FROM "ChatMessage"
     WHERE thread_id = $1
     ORDER BY created_at ASC`,
    [params.threadId]
  );

  // await pool.end();

  return NextResponse.json({ messages: result.rows });
}
