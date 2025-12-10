import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Way We Reminisce",
  description: "2025년을 돌아보며 기억에 남는 순간과 새해 소망을 기록해보세요",
  openGraph: {
    title: "The Way We Reminisce",
    description: "2025년을 돌아보며 기억에 남는 순간과 새해 소망을 기록해보세요",
    images: [
      {
        url: "/img/og.png",
        width: 1200,
        height: 630,
        alt: "The Way We Reminisce",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Way We Reminisce",
    description: "2025년을 돌아보며 기억에 남는 순간과 새해 소망을 기록해보세요",
    images: ["/img/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${ebGaramond.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
