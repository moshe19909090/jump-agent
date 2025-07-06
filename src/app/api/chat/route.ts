import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { Pool } from "pg";
import { z } from "zod";
import { getEmbedding } from "@/lib/embedding"; // make sure this is correct path

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

  // Embed the user question
  const embedding = await getEmbedding(question);
  const formattedVector = `[${embedding.join(",")}]`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Manually query pgvector for top matches
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

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  let resultText = "";

  if (docs.length) {
    const context = docs.join("\n---\n");

    const completion = await model.call([
      {
        role: "system",
        content: `You are a helpful assistant for financial advisors. Use the following emails as context:\n\n${context}`,
      },
      {
        role: "user",
        content: question,
      },
    ]);

    resultText = completion.text;
  } else {
    resultText =
      "Sorry, I couldn’t find any relevant information in your email data.";
  }

  await pool.end();

  return NextResponse.json({ reply: resultText });
}
