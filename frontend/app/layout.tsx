import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { LiveTicker } from "@/components/alerts/LiveTicker";
import { GlobalProviders } from "@/components/layout/GlobalProviders";
import { ThemeInitializer } from "@/components/layout/ThemeInitializer";

export const metadata: Metadata = {
  title: "World Monitor — Real-time Market Intelligence",
  description: "Crypto, Stocks, Gold, Silver and Forex live monitoring & analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ThemeInitializer />
        <GlobalProviders>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <LiveTicker />
              <main className="flex-1 px-4 md:px-6 pb-6 pt-4 min-w-0">{children}</main>
            </div>
            <AlertFeed />
          </div>
        </GlobalProviders>
      </body>
    </html>
  );
}
