import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { google } from "googleapis";

export class ScheduleMeetingTool extends StructuredTool {
  name = "schedule_meeting";
  description = "Schedules a meeting in the user's Google Calendar";

  schema = z.object({
    accessToken: z.string(),
    attendees: z.array(z.string()),
    summary: z.string(),
    description: z.string().optional(),
    start: z.string(), // ISO date string
    end: z.string(), // ISO date string
  });

  async _call({
    accessToken,
    attendees,
    summary,
    description,
    start,
    end,
  }: z.infer<this["schema"]>) {
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

    return `Meeting scheduled from ${start} to ${end} with: ${attendees.join(
      ", "
    )}`;
  }
}
