import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await pool.query(`INSERT INTO "UserInstruction" (content) VALUES ($1)`, [
    parsed.data.content,
  ]);

  // await pool.end();

  return NextResponse.json({ message: "✅ Instruction saved" });
}
