import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT id, title, created_at
      FROM "ChatThread"
      WHERE user_id = $1 AND is_archived = false
      ORDER BY created_at DESC
      `,
      [session.user.email]
    );

    return NextResponse.json({ threads: result.rows });
  } catch (error) {
    console.error("❌ Error fetching threads:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const { title } = await req.json();
    const threadTitle = title?.trim() || "Untitled Thread";

    const result = await client.query(
      `
      INSERT INTO "ChatThread" (user_id, title)
      VALUES ($1, $2)
      RETURNING id, title, created_at
      `,
      [session.user.email, threadTitle]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error creating thread:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
