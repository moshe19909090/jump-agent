// Create new chat thread on server
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  const res = await pool.query(
    `INSERT INTO "ChatThread" (user_id, title) VALUES ($1, $2) RETURNING id`,
    [userId || null, "Untitled"]
  );
  // await pool.end();

  return NextResponse.json({ threadId: res.rows[0].id });
}
