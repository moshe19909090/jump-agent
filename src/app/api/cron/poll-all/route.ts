// /api/cron/poll-all/route.ts
import { NextResponse } from "next/server";

const paths = ["/api/cron/gmail", "/api/cron/calendar", "/api/cron/hubspot"];

export async function GET() {
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Missing BASE_URL in environment variables" },
      { status: 500 }
    );
  }

  console.log({baseUrl: baseUrl});
  

  const results = await Promise.allSettled(
    paths.map((path) =>
      fetch(`${baseUrl}${path}`)
        .then((res) => res.json())
        .catch((err) => ({ error: err.message }))
    )
  );

  const formatted = results.map((res, i) => ({
    source: paths[i].split("/").pop(),
    ...(res.status === "fulfilled"
      ? { data: res.value }
      : { error: res.reason }),
  }));

  return NextResponse.json({ results: formatted });
}
