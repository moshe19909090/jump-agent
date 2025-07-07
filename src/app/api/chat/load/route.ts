import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { threadId } = await req.json();

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT role, content
       FROM "ChatMessage"
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId]
    );

    return NextResponse.json({ messages: result.rows });
  } catch (err) {
    console.error("❌ Error loading messages:", err);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  } finally {
    // await pool.end();
  }
}
