import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";

export async function GET(req: NextRequest) {
  try {
    const gmail = await getGoogleOAuthClient(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threads: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listRes: any = await gmail.users.threads.list({
        userId: "me",
        maxResults: 100,
        pageToken: nextPageToken,
      });

      const batch = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (listRes.data.threads || []).map(async (t: any) => {
          const fullThread = await gmail.users.threads.get({
            userId: "me",
            id: t.id!,
          });

          const messages = (fullThread.data.messages || []).map((msg) => {
            const parts = msg.payload?.parts || [msg.payload];
            const body = parts
              .map((part) => {
                const data = part?.body?.data;
                if (!data) return "";
                return Buffer.from(data, "base64").toString("utf-8");
              })
              .join("\n");

            return {
              subject:
                msg.payload?.headers?.find((h) => h.name === "Subject")
                  ?.value || "",
              from:
                msg.payload?.headers?.find((h) => h.name === "From")?.value ||
                "",
              date:
                msg.payload?.headers?.find((h) => h.name === "Date")?.value ||
                "",
              body,
            };
          });

          return {
            id: t.id,
            messages,
          };
        })
      );

      threads.push(...batch);
      nextPageToken = listRes.data.nextPageToken || undefined;
    } while (nextPageToken);

    return NextResponse.json(threads);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("🔥 Error fetching Gmail threads:", e);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
