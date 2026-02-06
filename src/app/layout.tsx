import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
  manifest: "/manifest.json?v=5",
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=5",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        url: "/favicon-16x16.png?v=5",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png?v=5",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-48.png?v=5",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/icon-96.png?v=5",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/icon-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png?v=5",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/favicon.ico?v=5",
        type: "image/x-icon",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaxClip",
    startupImage: [
      {
        url: "/apple-touch-icon.png?v=5",
      },
    ],
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
        {/* Explicit favicon links for maximum browser compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=5" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=5" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=5" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png?v=5" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png?v=5" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=5" />

        {/* Apple Touch Icons for iOS Safari */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png?v=5" />

        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/favicon.svg" color="#06b6d4" />

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
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-N2KDV8GD');`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N2KDV8GD"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
