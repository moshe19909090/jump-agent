import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { NextApiRequest } from "next";

export async function getGoogleOAuthClient(req: NextRequest | NextApiRequest) {
  const token = await getToken({ req });

  if (!token || typeof token === "string" || !token.accessToken) {
    throw new Error("No access token found in session");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token.accessToken });

  return google.gmail({ version: "v1", auth });
}
