import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://taxclip.co"),
  title: {
    default: "TaxClip - AI Receipt Scanner & Tax Management for Freelancers",
    template: "%s | TaxClip",
  },
  description:
    "Snap, scan, and organize receipts in seconds with AI-powered OCR. Export to QuickBooks, CSV, or PDF. Perfect for freelancers, small businesses, and accountants. Free forever.",
  keywords: [
    "receipt scanner",
    "receipt app",
    "tax management",
    "OCR receipt",
    "expense tracker",
    "QuickBooks export",
    "receipt organizer",
    "tax deduction",
    "business expenses",
    "freelancer accounting",
    "receipt management",
    "AI receipt scanner",
    "tax receipts",
    "bookkeeping",
    "accounting software",
  ],
  authors: [{ name: "TaxClip" }],
  creator: "TaxClip",
  publisher: "TaxClip",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://taxclip.co",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taxclip.co",
    siteName: "TaxClip",
    title: "TaxClip - AI Receipt Scanner for Freelancers",
    description:
      "Snap, scan, organize receipts in seconds. AI-powered OCR + QuickBooks export.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxClip - AI Receipt Scanner",
    description: "Snap, scan, organize receipts in seconds with AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
