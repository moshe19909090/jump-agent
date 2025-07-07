import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import { google } from "googleapis";

export class GetCalendarEventsTool extends StructuredTool {
  name = "get_calendar_events";
  description =
    "Retrieves upcoming meetings and attendees from Google Calendar";

  schema = z.object({
    accessToken: z.string(),
  });

  async _call({ accessToken }: z.infer<this["schema"]>) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: "v3", auth });
      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = res.data.items || [];

      if (events.length === 0) return "No upcoming events found.";

      return events
        .map((event) => {
          const summary = event.summary || "Untitled";
          const start = event.start?.dateTime || event.start?.date || "N/A";
          const attendees =
            event.attendees?.map((a) => a.email).join(", ") || "None";
          return `📅 ${summary} — 🕓 ${start} — 👥 Attendees: ${attendees}`;
        })
        .join("\n\n");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("❌ get_calendar_events failed:", err);
      return `❌ Failed to get calendar events: ${err.message}`;
    }
  }
}
