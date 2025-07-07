// tools/searchHubspotContactTool.ts
import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import axios from "axios";
import { getValidHubspotAccessToken } from "../../../utils/readHubspotToken";

export class SearchHubspotContactTool extends StructuredTool {
  name = "search_hubspot_contact";
  description = "Search for a contact in HubSpot by name or email";

  schema = z.object({
    accessToken: z.string(),
    query: z.string().describe("Contact's name or email"),
  });

  async _call({ query }: z.infer<this["schema"]>) {
    const access_token = await getValidHubspotAccessToken();

    const res = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        data: {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "EQ",
                  value: query,
                },
              ],
            },
          ],
        },
      }
    );

    const results = res.data.results;
    if (!results.length) {
      return `No contact found for "${query}"`;
    }

    const contact = results[0];
    return `Found contact: ${contact.properties.firstname} ${contact.properties.lastname} (ID: ${contact.id})`;
  }
}
