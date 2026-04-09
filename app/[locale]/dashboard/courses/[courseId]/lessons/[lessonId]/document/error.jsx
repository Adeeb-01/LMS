"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DocumentError({ error, reset }) {
  const t = useTranslations("LectureDocument");

  useEffect(() => {
    console.error("Document page error:", error);
  }, [error]);

  return (
    <div className="p-6 h-full flex flex-col items-center justify-center space-y-4">
      <div className="p-3 bg-destructive/10 rounded-full">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">{t("errorTitle")}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {error.message || t("genericError")}
        </p>
      </div>
      <Button 
        onClick={() => reset()}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCcw className="h-4 w-4" />
        {t("retry")}
      </Button>
    </div>
  );
}
