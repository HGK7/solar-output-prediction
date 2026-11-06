import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { BackendStatusProvider } from "@/lib/backend-status-context";
import { GuestPreferencesProvider } from "@/lib/guest-preferences-context";
import { ZenithPreferencesProvider } from "@/context/zenith-preferences-context";
import { TopNav } from "@/components/layout/top-nav";
import { Toaster } from "@/components/ui/sonner";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zenith",
  description:
    "Swiss photogrammetric solar intelligence workbench and 25-year financial ledger for residential, commercial, and utility-scale solar planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} ${newsreader.variable} ${ibmPlexMono.variable} min-h-dvh bg-[#FAF8F5] text-[#18181B] font-sans antialiased selection:bg-[#F59E0B] selection:text-[#18181B]`}
      >
        <GuestPreferencesProvider>
          <ZenithPreferencesProvider>
            <BackendStatusProvider>
              <TopNav />
              <div className="mx-auto max-w-[1440px] border-x border-[#E6E3DC] min-h-[calc(100dvh-60px)] bg-[#FAF8F5]">
                {children}
              </div>
              <Toaster position="bottom-right" richColors={false} />
            </BackendStatusProvider>
          </ZenithPreferencesProvider>
        </GuestPreferencesProvider>
      </body>
    </html>
  );
}
