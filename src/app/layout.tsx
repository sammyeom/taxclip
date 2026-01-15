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
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/icon.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/icon-high.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: {
      url: "/apple-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaxClip",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#06b6d4",
    "msapplication-config": "/browserconfig.xml",
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

// Schema.org structured data for SoftwareApplication
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TaxClip",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free forever with premium features available"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "127",
    "bestRating": "5",
    "worstRating": "1"
  },
  "description": "AI-powered receipt scanner and expense management for freelancers and small businesses. Scan receipts, categorize expenses, and export to QuickBooks.",
  "url": "https://taxclip.co",
  "screenshot": "https://taxclip.co/og-image.png",
  "featureList": [
    "AI-powered OCR receipt scanning",
    "Automatic expense categorization",
    "QuickBooks integration",
    "CSV and PDF export",
    "Multi-receipt batch processing",
    "Tax-ready expense reports"
  ],
  "author": {
    "@type": "Organization",
    "name": "TaxClip",
    "url": "https://taxclip.co"
  }
};

// Organization schema
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TaxClip",
  "url": "https://taxclip.co",
  "logo": "https://taxclip.co/logo.svg",
  "description": "AI-powered receipt scanner and expense management platform",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@taxclip.co",
    "contactType": "customer support"
  },
  "sameAs": []
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#06b6d4" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#06b6d4" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0891b2" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
