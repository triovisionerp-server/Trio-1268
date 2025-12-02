import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ...existing head... */}
      </head>
      <body>
        {/* ...existing layout markup... */}
        {children}

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}