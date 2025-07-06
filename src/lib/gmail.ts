import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function fetchAndStoreGmailMessages(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 10,
  });

  const messages = res.data.messages || [];
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

    const email = await prisma.email.create({
      data: {
        gmailid: message.id!,
        subject,
        snippet,
        body: decodedBody,
        sender: headers.find((h) => h.name === "From")?.value || "",
        receivedat: new Date(),
        recipients,
      },
    });

    savedEmails.push(email);
  }

  return savedEmails;
}
