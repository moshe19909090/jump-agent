// tools/createHubspotContactTool.ts
import { StructuredTool } from "langchain/tools";
import { z } from "zod";
import axios from "axios";
import { getValidHubspotAccessToken } from "../../../utils/readHubspotToken";

export class CreateHubspotContactTool extends StructuredTool {
  name = "create_hubspot_contact";
  description = "Create a new contact in HubSpot";

  schema = z.object({
    accessToken: z.string(),
    email: z.string(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
  });

  async _call({ email, firstname, lastname }: z.infer<this["schema"]>) {
    const access_token = await getValidHubspotAccessToken();
    const res = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/contacts`,
      {
        properties: {
          email,
          firstname,
          lastname,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return `Created new contact ${firstname ?? ""} ${
      lastname ?? ""
    } (${email}) with ID ${res.data.id}`;
  }
}
