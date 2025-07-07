import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function fetchAndStoreGmailMessages(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const messages = [];
  let nextPageToken: string | undefined = undefined;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      pageToken: nextPageToken,
    });

    messages.push(...(res.data.messages || []));
    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  const savedEmails = [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id!,
      format: "full",
    });

    const headers = msg.data.payload?.headers || [];
    const subject =
      headers.find((h) => h.name === "Subject")?.value || "(no subject)";
    const snippet = msg.data.snippet || "";
    const body =
      msg.data.payload?.parts?.[0]?.body?.data ||
      msg.data.payload?.body?.data ||
      "";

    const decodedBody = Buffer.from(body, "base64").toString("utf-8");
    const recipients = headers
      .filter((h) => ["To", "Cc", "Bcc"].includes(h.name ?? ""))
      .map((h) => h.value || "")
      .filter(Boolean);

    const from = headers.find((h) => h.name === "From")?.value || "";
    const dateHeader = headers.find((h) => h.name === "Date")?.value;
    const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

    const email = await prisma.email.upsert({
      where: { gmailid: message.id! },
      update: {},
      create: {
        gmailid: message.id!,
        subject,
        snippet,
        body: decodedBody,
        sender: from,
        recipients,
        receivedat: receivedAt,
      },
    });

    savedEmails.push(email);
  }

  return savedEmails;
}
