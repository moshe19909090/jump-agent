import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { google } from "googleapis";

export class SendGmailTool extends StructuredTool {
  name = "send_gmail";
  description = "Send an email using Gmail";

  schema = z.object({
    accessToken: z.string().describe("OAuth access token"),
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
  });

  async _call(input: z.infer<this["schema"]>): Promise<string> {
    const { accessToken, to, subject, body } = input;

    console.log("📤 Sending Gmail with:");
    console.log({ accessToken, to, subject, body });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return `Email sent to ${to} with subject "${subject}"`;
  }
}
