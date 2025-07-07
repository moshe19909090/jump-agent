// File: src/agents/tools/saveInstructionTool.ts
import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { Pool } from "pg";
import { getEmbedding } from "@/lib/embedding";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class SaveInstructionTool extends StructuredTool {
  name = "save_instruction";
  description = "Save an ongoing instruction for future automation.";

  schema = z.object({
    instruction: z
      .string()
      .describe("A user instruction to follow in future events"),
  });

  async _call({ instruction }: z.infer<typeof this.schema>) {
    try {
      // Save raw text
      const result = await pool.query(
        `INSERT INTO "InstructionMemory" (text) VALUES ($1) RETURNING id`,
        [instruction]
      );
      const id = result.rows[0].id;

      // Save embedding
      const embedding = await getEmbedding(instruction);
      await pool.query(
        `INSERT INTO "InstructionMemoryEmbedding" (instructionId, text, vector)
         VALUES ($1, $2, $3)`,
        [id, instruction, `[${embedding.join(",")}]`]
      );

      return "✅ Instruction saved for future use.";
    } catch (err) {
      console.error("❌ Failed to save instruction:", err);
      return "Failed to save instruction.";
    }
  }
}
