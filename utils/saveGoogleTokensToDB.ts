// src/utils/saveGoogleTokensToDB.ts
import { pool } from "@/lib/db";

type TokenPayload = {
  userId: string | null;
  access_token: string;
  refresh_token: string;
  expires_in: number; // in seconds
  scope?: string;
};

export async function saveGoogleTokensToDB({
  userId,
  access_token,
  refresh_token,
  expires_in,
  scope,
}: TokenPayload) {
  const expires_at = Math.floor(Date.now() / 1000) + expires_in;

  await pool.query(
    `
    INSERT INTO "GoogleToken" (user_id, access_token, refresh_token, expires_at, scope)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      scope = EXCLUDED.scope
  `,
    [userId, access_token, refresh_token, expires_at, scope || null]
  );
}
