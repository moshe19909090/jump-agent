// utils/saveHubspotToken.ts
import fs from "fs/promises";
import path from "path";

const tokenPath = path.resolve(process.cwd(), "hubspot-token.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveHubspotToken(tokenData: any) {
  await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 2));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readHubspotToken(): Promise<any> {
  const raw = await fs.readFile(tokenPath, "utf-8");
  return JSON.parse(raw);
}
