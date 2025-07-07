import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const result = await pool.query(`SELECT content FROM "UserInstruction"`);

  // await pool.end();

  return NextResponse.json({
    instructions: result.rows.map((row) => row.content),
  });
}
