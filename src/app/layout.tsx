import type { Metadata, Viewport } from "next";
import { Inter, Sansita } from "next/font/google";
import { ThemeWatcher } from "@/components/theme";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Used only for the "All-In Planner" wordmark.
const sansita = Sansita({ subsets: ["latin"], weight: ["800"], variable: "--font-sansita", display: "swap" });

export const metadata: Metadata = {
  title: { default: "All-In Planner", template: "%s · All-In Planner" },
  description: "Your calendar, tasks, daily planner, journal, mood, and fitness tracking in one planner.",
  applicationName: "All-In Planner",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1B48" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by THEME_SCRIPT before paint, so React must not overwrite it.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sansita.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <ThemeWatcher />
      </body>
    </html>
  );
}
