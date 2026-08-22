import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USS George Washington — Live Tracker",
  description:
    "Interactive map of USS George Washington (CVN-73): where she is, where she's been, and the ship's crew and air wing at a glance.",
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
