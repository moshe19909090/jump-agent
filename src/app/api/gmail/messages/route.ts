import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";
import { gmail_v1 } from "googleapis";

function decodeBase64(body: string) {
  return Buffer.from(body, "base64").toString("utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest) {
  try {
    const gmail = await getGoogleOAuthClient(req);

    const allThreads: gmail_v1.Schema$Thread[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadsRes: any = await gmail.users.threads.list({
        userId: "me",
        maxResults: 100,
        pageToken: nextPageToken,
      });

      allThreads.push(...(threadsRes.data.threads || []));
      nextPageToken = threadsRes.data.nextPageToken;
    } while (nextPageToken);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    for (const thread of allThreads) {
      const threadData = await gmail.users.threads.get({
        userId: "me",
        id: thread.id!,
      });

      for (const message of threadData.data.messages || []) {
        const headers = message.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const from = headers.find((h) => h.name === "From")?.value || "";

        const part =
          message.payload?.parts?.find((p) => p.mimeType === "text/plain") ||
          message.payload;

        const body = decodeBase64(part?.body?.data || "");

        messages.push({
          id: message.id,
          subject,
          from,
          body,
        });
      }
    }

    return NextResponse.json(messages);
  } catch (e) {
    console.error("🔥 Failed to fetch Gmail messages:", e);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
