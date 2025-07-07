import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { threadId, role, content } = await req.json();

  if (!threadId || !role || !content) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    await pool.query(
      `INSERT INTO "ChatMessage" (thread_id, role, content)
       VALUES ($1, $2, $3)`,
      [threadId, role, content]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving chat message:", err);
    return NextResponse.json(
      { error: "Failed to save chat message" },
      { status: 500 }
    );
  } finally {
    // await pool.end();
  }
}
