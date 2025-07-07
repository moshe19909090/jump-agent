import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { google } from "googleapis";
import { format } from "date-fns"; // <-- Make sure you install this: npm install date-fns

export class ProposeMeetingTimesTool extends StructuredTool {
  name = "propose_meeting_times";
  description =
    "Suggests free time slots from the user's calendar and emails them to a recipient";

  schema = z.object({
    accessToken: z.string(),
    to: z.string(),
    subject: z.string().optional(),
    body: z.string().optional(),
  });

  async _call(input: z.infer<this["schema"]>) {
    const { accessToken, to, subject, body } = input;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(
      now.getTime() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(); // +5 days

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: "UTC",
        items: [{ id: "primary" }],
      },
    });

    const busy = res.data.calendars?.primary?.busy || [];

    const freeSlots = findFreeTimeSlots(
      busy as { start: string; end: string }[],
      now
    );
    if (!freeSlots.length) {
      return "❌ No available time slots found.";
    }

    const options = freeSlots
      .slice(0, 3)
      .map((slot, i) => {
        const startFormatted = format(slot.start, "EEEE MMMM d, h:mm a");
        const endFormatted = format(slot.end, "h:mm a");
        return `- Option ${i + 1}: ${startFormatted} – ${endFormatted}`;
      })
      .join("\n");

    const emailBody =
      body ||
      `Hi,

I'd like to propose a few times for us to meet. Please let me know
which of the following options works best for you:

${options}

Looking forward to our meeting!

Best regards,  
Your AI Assistant`;

    await sendGmail({
      accessToken,
      to,
      subject: subject || "Meeting Availability",
      body: emailBody,
    });

    return `📧 Sent meeting proposal to ${to}:\n${options}`;
  }
}

// ---------------- Helper Functions ----------------

function findFreeTimeSlots(
  busy: { start: string; end: string }[],
  fromTime: Date,
  durationMinutes = 30
): { start: Date; end: Date }[] {
  const freeSlots: { start: Date; end: Date }[] = [];

  const startOfDay = new Date(fromTime);
  startOfDay.setHours(9, 0, 0, 0); // 9:00 AM
  const endOfDay = new Date(fromTime);
  endOfDay.setHours(17, 0, 0, 0); // 5:00 PM

  const cursor = new Date(startOfDay);

  while (cursor < endOfDay) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60 * 1000);

    const overlaps = busy.some(
      (b) => new Date(b.start) < slotEnd && new Date(b.end) > slotStart
    );

    if (!overlaps && slotEnd <= endOfDay) {
      freeSlots.push({ start: slotStart, end: slotEnd });
    }

    cursor.setMinutes(cursor.getMinutes() + durationMinutes);
  }

  return freeSlots;
}

async function sendGmail({
  accessToken,
  to,
  subject,
  body,
}: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const rawMessage = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`
  ).toString("base64");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, ""),
    },
  });
}
