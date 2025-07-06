import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import axios from "axios";

export class CreateHubspotNoteTool extends StructuredTool {
  name = "create_hubspot_note";
  description = "Create a note in HubSpot for a contact";

  schema = z.object({
    accessToken: z.string(),
    contactId: z.string(),
    note: z.string(),
  });

  async _call({ accessToken, contactId, note }: z.infer<this["schema"]>) {
    const response = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/notes",
      {
        properties: {
          hs_note_body: note,
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 202,
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return `Created note with ID ${response.data.id} for contact ${contactId}`;
  }
}
