import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import BottomNav from "../components/BottomNav";
import ClearPersistedState from "../components/ClearPersistedState";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clozyt",
  description: "Swipe-to-shop PWA",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-indigo-600 to-fuchsia-500 text-white`}
      >
        <ClearPersistedState />
        <div className="min-h-screen flex flex-col">
          <main className="flex-grow">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
