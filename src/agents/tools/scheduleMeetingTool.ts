import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { google } from "googleapis";

export class ScheduleMeetingTool extends StructuredTool {
  name = "schedule_meeting";
  description =
    "Schedules a confirmed meeting in Google Calendar. Use only after time has been agreed upon.";

  schema = z.object({
    accessToken: z.string(),
    attendees: z.array(z.string()),
    summary: z.string(),
    description: z.string().optional(),
    start: z.string(), // ISO date string
    end: z.string(), // ISO date string
  });

  async _call(input: z.infer<this["schema"]>) {
    try {
      const { accessToken, attendees, summary, description, start, end } =
        input;

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: "v3", auth });

      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary,
          description,
          start: { dateTime: start },
          end: { dateTime: end },
          attendees: attendees.map((email) => ({ email })),
        },
      });

      return `✅ Meeting scheduled from ${start} to ${end} with: ${attendees.join(
        ", "
      )}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("❌ schedule_meeting failed:", err);
      return `❌ Failed to schedule meeting: ${err.message}`;
    }
  }
}
