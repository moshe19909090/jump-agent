import { SendGmailTool } from "./sendGmailTool";
import "dotenv/config";

async function main() {
  const tool = new SendGmailTool();

  const result = await tool.call({
    // accessToken: process.env.TEST_GMAIL_ACCESS_TOKEN!,
    to: "youremail@example.com", // Replace with a real recipient
    subject: "Test from Jump Agent",
    body: "This is a test email sent using the SendGmailTool.",
  });

  console.log(result);
}

main().catch(console.error);
