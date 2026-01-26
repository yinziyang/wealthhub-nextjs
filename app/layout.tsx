import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AntdMobileProvider from "@/components/AntdMobileProvider";

export const metadata: Metadata = {
  title: "Private Client Assets",
  description: "Private client asset management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AntdMobileProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AntdMobileProvider>
      </body>
    </html>
  );
}
