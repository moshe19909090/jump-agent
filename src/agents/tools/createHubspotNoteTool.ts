// tools/createHubspotNoteTool.ts

import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import axios from "axios";
import { getValidHubspotAccessToken } from "../../../utils/readHubspotToken";

export class CreateHubspotNoteTool extends StructuredTool {
  name = "create_hubspot_note";
  description = "Create a note in HubSpot for a contact";

  schema = z.object({
    accessToken: z.string(),
    contactId: z.string(),
    note: z.string(),
    ownerId: z
      .string()
      .optional()
      .describe("Optional HubSpot owner ID to assign"),
    mentionOwnerIds: z
      .array(z.string())
      .optional()
      .describe("Optional owner IDs to @mention"),
    timestamp: z
      .string()
      .optional()
      .describe(
        "ISO 8601 timestamp for the note (e.g., '2025-07-06T13:45:00Z'). If omitted, current time will be used."
      ),
  });

  async _call(input: z.infer<this["schema"]>) {
    const access_token = await getValidHubspotAccessToken();

    const { contactId, note, ownerId, mentionOwnerIds, timestamp } = input;

    const payload = {
      objectsToAssociate: [
        {
          associationSpec: {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 202, // Contact
          },
          objectIds: [contactId],
        },
      ],
      shouldValidateAssociations: true,
      object: {
        properties: [
          { name: "hs_engagement_type", value: "NOTE" },
          { name: "hs_note_body", value: note },
          { name: "hs_engagement_source", value: "CRM_UI" },
          ...(timestamp
            ? [{ name: "hs_timestamp", value: new Date(timestamp).getTime() }]
            : []),
          ...(ownerId ? [{ name: "hubspot_owner_id", value: ownerId }] : []),
          ...(mentionOwnerIds?.length
            ? [
                {
                  name: "hs_at_mentioned_owner_ids",
                  value: mentionOwnerIds.join(";"),
                },
              ]
            : []),
        ],
      },
    };

    const res = await axios.post(
      "https://api.hubapi.com/engagements/v2/engagements",
      payload,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return `✅ Note added to contact ${contactId}. Engagement ID: ${res.data.engagement.id}`;
  }
}
