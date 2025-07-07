import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`INSERT INTO "UserInstruction" (content) VALUES ($1)`, [
    parsed.data.content,
  ]);

  await pool.end();

  return NextResponse.json({ message: "✅ Instruction saved" });
}
