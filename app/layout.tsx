import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Footer from "@/next-auth-solana-supabase/components/footer"
import Header from "@/next-auth-solana-supabase/components/header"
import { Toaster } from 'sonner'
import WalletContextProvider from "@/next-auth-solana-supabase/components/wallet/walletProvider";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NextAuth.js Example",
  description:
    "This is an example site to demonstrate how to use NextAuth.js for authentication",
}

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    
    <html lang="en">
      <body className={inter.className}>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WalletContextProvider>
            <div className="flex h-full min-h-screen w-full flex-col justify-between">
              <Header />
          <main className="mx-auto w-full max-w-3xl flex-auto px-4 py-4 sm:px-6 md:py-6">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster />
        </WalletContextProvider>
        </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
    
  )
}
