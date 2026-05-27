import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agent-canvas.vercel.app";
const DESCRIPTION =
  "A visual canvas for composing and debugging AI agents. Drag out prompt, tool, and output nodes, wire them up, hit Run, and watch the agent execute — output streaming into each box as it goes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Agent Canvas — compose & debug AI agents visually",
  description: DESCRIPTION,
  keywords: [
    "AI agents",
    "agent debugging",
    "visual programming",
    "LLM",
    "node editor",
    "React Flow",
  ],
  openGraph: {
    title: "Agent Canvas",
    description: DESCRIPTION,
    url: "/",
    siteName: "Agent Canvas",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Agent Canvas — a visual canvas for composing and debugging AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Canvas",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
