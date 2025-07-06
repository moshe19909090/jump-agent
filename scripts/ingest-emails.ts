import { PrismaClient } from "@prisma/client";
import { getEmbedding } from "@/lib/embedding";
import { Pool } from "pg";

const prisma = new PrismaClient();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const emails = await prisma.email.findMany({
    where: {
      EmailEmbedding: null,
    },
  });

  console.log(`Found ${emails.length} emails to embed...`);

  for (const email of emails) {
    try {
      const content = `${email.subject}\n\n${email.body}`;
      const vector = await getEmbedding(content);
      const formattedVector = `[${vector.join(",")}]`;

      await pg.query(
        `INSERT INTO "EmailEmbedding" ("emailid", "vector") VALUES ($1, $2::vector)`,
        [email.id, formattedVector]
      );

      console.log(`✅ Embedded: ${email.subject}`);
    } catch (error) {
      console.error(`❌ Failed to embed email ID: ${email.id}`, error);
    }
  }

  console.log("✨ Done embedding emails.");
  await pg.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
