import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

// 🔁 Helper to refresh the access token using Google's API
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

    return {
      ...token,
      accessToken: credentials.access_token!,
      accessTokenExpires: Date.now() + (credentials.expiry_date ?? 0),
      refreshToken: credentials.refresh_token ?? token.refreshToken,
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
      // Initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + account.expires_at! * 1000; // in ms
        return token;
      }

      // If token is still valid, return it
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token expired, try refreshing
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("🔐 ACCESS TOKEN:", token.accessToken);

      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
