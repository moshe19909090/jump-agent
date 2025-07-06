import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { z } from "zod";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";

const schema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const question = parsed.data.messages.at(-1)?.content || "No question";

  // Step 1: Embed the question and fetch similar docs via pgvector
  const embedding = await getEmbedding(question);
  const formattedVector = `[${embedding.join(",")}]`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const rawResults = await pool.query(
    `
    SELECT e.subject, e.snippet, e.body, ee.vector <#> $1::vector AS distance
    FROM "EmailEmbedding" ee
    JOIN "Email" e ON e.id = ee.emailid
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formattedVector]
  );

  const docs = rawResults.rows.map((row) => {
    return `${row.subject}\n${row.snippet}\n${row.body}`;
  });

  console.log("📄 Retrieved docs:", docs.slice(0, 2));
  await pool.end();

  // Step 2: Use Langchain agent for tool calling + reasoning
  const context = docs.join("\n---\n");
  const executor = await getAgentExecutor();

  let resultText = "";

  try {
    const response = await executor.call({
      input: question,
      context, // you can access this in tools if needed
    });

    resultText = response.output;
  } catch (e) {
    console.error("🛑 Agent error:", e);
    resultText =
      "Sorry, something went wrong while trying to complete your request.";
  }

  return NextResponse.json({ reply: resultText });
}
