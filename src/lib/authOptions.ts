import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";
import { JWT } from "next-auth/jwt";
import { saveGoogleTokensToDB } from "../../utils/saveGoogleTokensToDB";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      refresh_token: token.refreshToken as string,
    });

    const { credentials } = await client.refreshAccessToken();

    const access_token = credentials.access_token!;
    const refresh_token = credentials.refresh_token ?? token.refreshToken!;
    const expires_at = credentials.expiry_date
      ? Math.floor(credentials.expiry_date / 1000)
      : Math.floor(Date.now() / 1000) + 3600;

    // Save updated tokens to DB
    await saveGoogleTokensToDB({
      userId: "1",
      access_token,
      refresh_token,
      expires_in: expires_at - Math.floor(Date.now() / 1000),
      scope: "", // Not returned during refresh
    });

    return {
      ...token,
      accessToken: access_token,
      accessTokenExpires: expires_at * 1000, // convert to ms
      refreshToken: refresh_token,
    };
  } catch (error) {
    console.error("❌ Failed to refresh access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First-time login
      if (account) {
        const access_token = account.access_token!;
        const refresh_token = account.refresh_token!;
        const expires_in = account.expires_at!; // seconds from now

        await saveGoogleTokensToDB({
          userId: "1",
          access_token,
          refresh_token,
          expires_in,
          scope: account.scope || "",
        });

        token.accessToken = access_token;
        token.refreshToken = refresh_token;
        token.accessTokenExpires = Date.now() + expires_in * 1000; // ms

        return token;
      }

      // Token still valid
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Refresh if needed
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
};
