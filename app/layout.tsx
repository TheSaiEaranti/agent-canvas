import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Canvas",
  description: "A visual canvas for composing and debugging AI agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
