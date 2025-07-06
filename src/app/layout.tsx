import "./globals.css";
// app/layout.tsx
import { Providers } from "../auth/Provider"; // Adjust path as needed

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
