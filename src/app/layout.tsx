import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { N8nProvider } from "@/lib/api/n8n-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "A dashboard for monitoring and managing your agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <N8nProvider>
          {children}
        </N8nProvider>
      </body>
    </html>
  );
}
