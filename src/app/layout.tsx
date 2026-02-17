import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientProviders } from "@/components/layout/ClientProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata configuration: Controls the <head> section of your HTML
export const metadata: Metadata = {
  // 1. The title that appears in the browser tab
  title: "SkillLinkr",

  // 2. The description used for SEO and social sharing previews
  description: "Connect with SkillLinkr students",

  // 3. The Favicon / Website Icon configuration
  icons: {
    icon: [
      {
        url: "/logo.png", // Path to your image file in the 'public' folder
        type: "image/png", // MIME type of the image
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
