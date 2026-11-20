import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { InlineScript, themeScript } from "@/components/ui/InlineScript";
import { site } from "@/lib/site";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "AutoView 3D — Explore cars in 3D, inside and out",
    template: "%s · AutoView 3D",
  },
  description: site.description,
  applicationName: site.name,
  keywords: ["3D car viewer", "car configurator", "Three.js", "React Three Fiber", "car interior 360", "image to 3D"],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "AutoView 3D — Explore cars in 3D, inside and out",
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090b" },
    { media: "(prefers-color-scheme: light)", color: "#efeee9" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${archivo.variable} ${mono.variable} antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="min-h-svh bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
