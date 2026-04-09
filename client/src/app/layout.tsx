import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import MidnightWalletProvider from "@/components/providers/wallet-wrapper";
import CoreLayout from "@/components/layouts/CoreLayout";

const poppins = Poppins({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["100", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Ghost Finance",
  description: "GHOST Protocol — Private P2P Lending on Midnight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={`${poppins.className} antialiased`}>
        <MidnightWalletProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              <CoreLayout>{children}</CoreLayout>
          </ThemeProvider>
        </MidnightWalletProvider>
      </body>
    </html>
  );
}
