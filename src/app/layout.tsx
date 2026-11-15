import type { Metadata, Viewport } from "next";
import { Geist_Mono, Lexend } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { CalendarProvider } from "@/lib/calendar";
import "./globals.css";

const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] }); // variable font: any weight 100-900
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trojan Arc",
  description: "Your college arc, planned by Trojans who've been there. A personal success and network hub for USC students.",
  openGraph: {
    title: "Trojan Arc",
    description: "Know what you need, where to start, and whose advice to trust.",
  },
};

export const viewport: Viewport = { themeColor: "#fbf8f4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="ambient" aria-hidden />
        <StoreProvider>
          <CalendarProvider>{children}</CalendarProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
