import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthProvider as AuthProviderNew } from "@/lib/auth-context-new";
import { CartProvider } from "@/lib/cart-context";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shopping Website - Earn Points, Get Rewards",
  description: "Modern e-commerce platform with points rewards system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <AuthProviderNew>
            <CartProvider>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation />
                <main className="flex-1 pb-16">
                  {children}
                </main>
                <Footer />
              </div>
            </CartProvider>
          </AuthProviderNew>
        </AuthProvider>
      </body>
    </html>
  );
}
