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
  title: "Better404 - Smart 404 Page Recommendations",
  description: "Transform your 404 pages with intelligent recommendations. Better404 uses AI-powered semantic search to help users find what they're looking for instead of hitting dead ends.",
  keywords: [
    "404 page",
    "smart 404",
    "404 recommendations", 
    "semantic search",
    "AI search",
    "user experience",
    "website optimization",
    "better404",
    "404 solutions",
    "page not found"
  ],
  authors: [{ name: "Better404" }],
  creator: "Better404",
  publisher: "Better404",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://better404.dev"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Better404 - Smart 404 Page Recommendations",
    description: "Transform your 404 pages with intelligent recommendations. Better404 uses AI-powered semantic search to help users find what they're looking for instead of hitting dead ends.",
    url: "https://better404.dev",
    siteName: "Better404",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Better404 - Smart 404 Page Recommendations",
    description: "Transform your 404 pages with intelligent recommendations. Better404 uses AI-powered semantic search to help users find what they're looking for instead of hitting dead ends.",
    creator: "@better404",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Better404",
    "description": "AI-powered 404 page recommendations that help users find what they're looking for instead of hitting dead ends.",
    "url": "https://better404.dev",
    "applicationCategory": "WebApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "Better404"
    },
    "featureList": [
      "Smart 404 page recommendations",
      "AI-powered semantic search",
      "Easy integration with HTML/React snippets",
      "Automatic website crawling and indexing",
      "Real-time content recommendations"
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
