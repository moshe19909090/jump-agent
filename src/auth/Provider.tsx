"use client";

import { SessionProvider } from "next-auth/react";
// import { ThemeProvider } from "your-theme-library"; // Example for other providers

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* <ThemeProvider> */}
      {children}
      {/* </ThemeProvider> */}
    </SessionProvider>
  );
}
