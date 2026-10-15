import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getDict } from "@/lib/i18n";
import { Toaster } from "@/components/toast";

const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });

export const metadata: Metadata = {
  title: "Oman Traditional Shooting",
  description: "National digital platform for traditional shooting championships in the Sultanate of Oman",
  // "Add to Home Screen" opens full-screen like an app
  appleWebApp: { capable: true, title: "Shooting", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the tab bar respect the iPhone home indicator (env(safe-area-inset-bottom))
  themeColor: "#4a0611",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getDict();
  return (
    <html lang={locale} dir={dir}>
      <body className={`${plex.variable} font-sans antialiased min-h-screen overflow-x-clip`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
