import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";

const schema = z.object({
  instruction: z.string(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { instruction } = parsed.data;

  try {
    // Step 1: Insert into InstructionMemory
    const result = await pool.query(
      `INSERT INTO "InstructionMemory" (text) VALUES ($1) RETURNING id`,
      [instruction]
    );
    const instructionId = result.rows[0].id;

    // Step 2: Embed instruction
    const embedding = await getEmbedding(instruction);

    await pool.query(
      `INSERT INTO "InstructionMemoryEmbedding" (instructionId, text, vector)
       VALUES ($1, $2, $3)`,
      [instructionId, instruction, `[${embedding.join(",")}]`]
    );

    // await pool.end();

    return NextResponse.json({ message: "✅ Instruction saved & embedded" });
  } catch (err) {
    console.error("❌ Error saving instruction:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
