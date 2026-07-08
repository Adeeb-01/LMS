import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { dbConnect } from "@/service/mongo";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { cairo, geistMono, geistSans, poppins } from "@/lib/fonts";

export const metadata = {
  title: "Easy Learning Academy - Best Online Professional Courses",
  description: "Best Online Professional Courses",
};

/**
 * Resolve active locale for <html lang/dir> before child layouts run.
 * `getLocale()` in the root layout can resolve to defaultLocale too early; middleware
 * sets `x-next-intl-locale` on every negotiated request.
 */
function localeFromRequestHeaders(headerLocale) {
  if (headerLocale && routing.locales.includes(headerLocale)) {
    return headerLocale;
  }
  return routing.defaultLocale;
}

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const locale = localeFromRequestHeaders(headerList.get("x-next-intl-locale"));

  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
  }

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          poppins.variable,
          cairo.variable,
          "antialiased"
        )}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
