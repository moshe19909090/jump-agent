import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI!;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const hubspotAuthUrl = new URL("https://app.hubspot.com/oauth/authorize");

  hubspotAuthUrl.searchParams.set("client_id", HUBSPOT_CLIENT_ID);
  hubspotAuthUrl.searchParams.set("redirect_uri", HUBSPOT_REDIRECT_URI);
  hubspotAuthUrl.searchParams.set(
    "scope",
    [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.owners.read",
    ].join(" ")
  );
  hubspotAuthUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(hubspotAuthUrl.toString());
}
