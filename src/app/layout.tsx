import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteBrand } from "@/lib/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "ACHT MART — Pure Nature, Pure Wellness",
    template: "%s · ACHT MART",
  },
  description:
    "Premium Ayurvedic & herbal wellness products. Become a customer or join our affiliate program — earn on every sale you refer.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#15803d",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const brand = await getSiteBrand();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <Providers>
          <SiteHeader brand={brand} />
          <main className="flex-1">{children}</main>
          <SiteFooter brand={brand} />
          <Toaster
            position="top-right"
            toastOptions={{ duration: 4000, className: "text-sm" }}
          />
        </Providers>
      </body>
    </html>
  );
}
