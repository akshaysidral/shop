import type { Metadata } from "next";
import type { Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import AppProviders from "../src/controllers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bazario | Shop. Sell. Celebrate.",
  description: "Bazario is a marketplace where buyers shop by category and sellers run festival offers.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
