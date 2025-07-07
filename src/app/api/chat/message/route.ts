import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { threadId, role, content } = await req.json();

  await pool.query(
    `INSERT INTO "ChatMessage" (thread_id, role, content) VALUES ($1, $2, $3)`,
    [threadId, role, content]
  );

  // await pool.end();

  return NextResponse.json({ success: true });
}
