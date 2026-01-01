import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner";
import { dbConnect } from "@/service/mongo";

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

export const metadata = {
  title: "Easy Learning Academy - Best Online Professional Courses",
  description: "Best Online Professional Courses",
};

const poppins = Inter({subsets: ['latin'], variable: "--font-poppins"});

export default async function RootLayout({ children }) {
  // Database connection with error handling
  try {
    await dbConnect();
  } catch (error) {
    console.error('Database connection error:', error);
    // Don't crash the app, but log the error
    // In production, you might want to show a maintenance page
  }

  return (
    <html lang="en">
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`
        )}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
