import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nama Perusahaan - Kalkulator Hitung Cetakan",
  description: "Aplikasi kalkulator hitung cetakan profesional",
  icons: {
    icon: "/api/app-icon?size=32",
    apple: "/api/app-icon?size=180",
  },
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cetakan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
