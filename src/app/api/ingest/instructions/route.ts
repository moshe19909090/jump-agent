import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_: NextRequest) {
  const { rows } = await pool.query(`SELECT id, text FROM "InstructionMemory"`);

  for (const row of rows) {
    const embedding = await getEmbedding(row.text);

    await pool.query(
      `INSERT INTO "InstructionMemoryEmbedding" (instructionId, text, vector)
       VALUES ($1, $2, $3)
       ON CONFLICT (instructionId) DO NOTHING`,
      [row.id, row.text, `[${embedding.join(",")}]`]
    );
  }

  // await pool.end();
  return NextResponse.json({ message: "✅ Instructions ingested" });
}
