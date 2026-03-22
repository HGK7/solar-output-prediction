import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
          <div className="flex h-dvh flex-col overflow-hidden bg-linear-to-br from-yellow-50 via-sky-50 to-white">
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </div>
        </BackendStatusProvider>
      </body>
    </html>
  );
}
