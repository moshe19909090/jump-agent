import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getEmbedding } from "@/lib/embedding";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

  await pool.end();
  return NextResponse.json({ message: "✅ Instructions ingested" });
}
