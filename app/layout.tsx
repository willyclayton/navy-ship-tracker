import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USS George Washington — Where is she now?",
  description:
    "Weekly position of USS George Washington (CVN-73) from the USNI News Fleet Tracker, plus Navy news in plain language.",
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
