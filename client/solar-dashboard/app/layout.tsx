import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConnectionStatusBar } from "@/components/connection-status-bar";
import { BackendStatusProvider } from "@/lib/backend-status-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solar Intelligence Dashboard",
  description:
    "AI-powered solar energy analysis — predict output, evaluate ROI, and get expert recommendations for any location worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <BackendStatusProvider>
          <ConnectionStatusBar />
          {children}
        </BackendStatusProvider>
      </body>
    </html>
  );
}
