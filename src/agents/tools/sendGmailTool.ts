import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { sendGmail } from "@/lib/sendGmail"; // adjust path to where you put it

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

    await sendGmail({ accessToken, to, subject, body });

    return `Email sent to ${to} with subject "${subject}"`;
  }
}
