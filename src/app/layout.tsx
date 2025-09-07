import type { Metadata, Viewport } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IsItAI",
  description: "Detect AI-generated images instantly.",
  manifest: "/manifest.json",
  openGraph: {
    title: "IsItAI",
    description: "Detect AI-generated images instantly.",
  },
  twitter: {
    card: "summary",
    title: "IsItAI",
    description: "Detect AI-generated images instantly.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${robotoMono.variable} flex min-h-screen flex-col bg-white text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100 font-sans`}
      >
        {children}
        <ServiceWorkerRegister />
        <footer className="mt-auto p-4 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} IsItAI. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
