import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";

const schema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  accessToken: z.string().optional(), // Optional token for Gmail tool
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { messages, accessToken } = parsed.data;
  const question = messages.at(-1)?.content || "No question";
  const chatHistory = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  // Step 1: Embed user input and retrieve relevant context
  const embedding = await getEmbedding(question);
  const formattedVector = `[${embedding.join(",")}]`;

  const rawResults = await pool.query(
    `
    SELECT e.subject, e.snippet, e.body, ee.vector <#> $1::vector AS distance
    FROM "EmailEmbedding" ee
    JOIN "Email" e ON e.id = ee.emailid
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formattedVector]
  );

  const notesResult = await pool.query(
    `
  SELECT content, vector <#> $1::vector AS distance
  FROM "NoteEmbedding"
  ORDER BY distance ASC
  LIMIT 5
  `,
    [formattedVector]
  );

  const noteDocs = notesResult.rows.map(
    (row) => `HubSpot Note:\n${row.content}`
  );

  const emailDocs = rawResults.rows.map(
    (row) => `Email:\n${row.subject}\n${row.snippet}\n${row.body}`
  );

  // Fetch saved memory instructions
  const instructionsResult = await pool.query(
    `
    SELECT text, vector <#> $1::vector AS distance
    FROM "InstructionMemoryEmbedding"
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formattedVector]
  );

  const instructionDocs = instructionsResult.rows.map(
    (row) => `🧠 Ongoing Instruction:\n${row.text}`
  );

  // await pool.end();
  const context = [...emailDocs, ...noteDocs, ...instructionDocs].join(
    "\n---\n"
  );

  console.log("📄 Top context emails:\n", context.slice(0, 300));

  // Step 2: Run LangChain agent with tools
  const executor = await getAgentExecutor();
  const now = new Date().toISOString();
  const systemPrompt = `
You are an AI assistant for financial advisors. You can use tools like Gmail and HubSpot to help your user.
The current date and time is: ${now}
When calling the Gmail tool, always include:
- "accessToken": the OAuth access token
- "to": the recipient's email address
- "subject": the subject of the email
- "body": the plain text body of the email

⚠️ Always include "accessToken" when calling send_gmail. Without it, the tool will fail.

Use this Gmail access token if needed: ${accessToken || "N/A"}

You also have tools for HubSpot:
- search_hubspot_contact
- create_hubspot_note

Use them together if needed. If a user mentions a person (e.g. Brian), first search for the contact before creating the note.

You also have a tool called "save_instruction" to persist automation rules for future use.

Examples:
User: Can you send an email to john@example.com?
Assistant: What should the subject and body be?

User: Schedule a meeting with Sara Smith next week  
Assistant:  
[calls search_hubspot_contact with query="Sara Smith"]  
[calls send_gmail with accessToken, to="sara@example.com", subject="Let's schedule a meeting", body="Hi Sara, how about next Tuesday or Thursday?"]

User: When someone emails me about taxes, reply with a meeting link.  
Assistant: [calls save_instruction with instruction="When someone emails me about taxes, reply with a meeting link."]

📌 When something happens (like a new email or calendar event), review saved instructions and act accordingly.
You have a tool called "schedule_meeting" which schedules meetings on the user's Google Calendar.

When using this tool, provide the following fields:
- "accessToken": the user's Google OAuth access token (use ${
    accessToken || "N/A"
  })
- "attendees": array of email addresses
- "summary": title of the meeting
- "description": optional longer description
- "start": ISO date-time string for when the meeting starts (e.g. "2025-07-08T15:00:00Z")
- "end": ISO date-time string for when the meeting ends

Example:
User: Schedule a meeting with Brian tomorrow at 2pm
Assistant:
[calls search_hubspot_contact with query="Brian"]
[calls schedule_meeting with {
  accessToken: "...",
  attendees: ["brian@example.com"],
  summary: "Meeting with Brian",
  start: "2025-07-08T14:00:00Z",
  end: "2025-07-08T14:30:00Z"
}]

Available Tools:

1. send_gmail
  - Required: accessToken, to, subject, body

2. schedule_meeting
  - Required: accessToken, attendees (array), summary, start, end
  - Optional: description

3. create_hubspot_note
  - Required: contactId, content

4. create_hubspot_contact
  - Required: email, firstName, lastName

5. search_hubspot_contact
  - Required: query (name or email)

6. save_instruction
  - Required: instruction (ongoing automation rule)



Here is the full chat history:
${chatHistory}

Here is relevant context from the user's email inbox and HubSpot notes:
${context}

User: ${question}
`.trim();

  const response = await executor.call({
    input: systemPrompt,
    config: {
      metadata: {
        accessToken, // inject directly
      },
    },
  });

  return NextResponse.json({ reply: response.output });
}
