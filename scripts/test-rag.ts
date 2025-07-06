// scripts/test-rag.ts

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getEmbedding } from "../src/lib/embedding"; // ✅ relative path
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient();

async function main() {
  const query = "What did Supabase email me about?";
  const queryEmbedding = await getEmbedding(query);
  const formatted = `[${queryEmbedding.join(",")}]`;

  const result = await pool.query(
    `
    SELECT
      e.subject,
      e.snippet,
      e.body,
      ee.vector <#> $1::vector AS distance
    FROM "EmailEmbedding" ee
    JOIN "Email" e ON e.id = ee.emailid
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formatted]
  );

  console.log("📄 Top matching emails:");
  for (const row of result.rows) {
    console.log(`\n📌 Subject: ${row.subject}`);
    console.log(`📝 Snippet: ${row.snippet}`);
    console.log(`📬 Distance: ${row.distance}`);
  }

  await pool.end();
  await prisma.$disconnect();
}

main();
