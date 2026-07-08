import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cairo, poppins } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div
        className={cn(
          locale === "ar" ? cairo.className : poppins.className,
          "min-h-[inherit]"
        )}
      >
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
