import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Local SEO Rank Tracker",
  description:
    "Track Google Maps rankings by postcode, monitor competitor movement, and report hyper-local wins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        <MainNav />
        {children}
      </body>
    </html>
  );
}
