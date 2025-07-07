// lib/hubspotTokenStore.ts
let tokenData: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null = null;

export function saveHubspotTokens({
  accessToken,
  refreshToken,
  expiresIn,
}: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  tokenData = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export function getHubspotTokens() {
  return tokenData;
}
