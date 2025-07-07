import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const result = await pool.query(`SELECT content FROM "UserInstruction"`);

  await pool.end();

  return NextResponse.json({
    instructions: result.rows.map((row) => row.content),
  });
}
