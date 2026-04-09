"use client";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVideoSync } from "./video-text-sync";
import { ConceptGapSummary } from "./concept-gap-summary";

function VideoDescription({ description }) {
  const t = useTranslations("Lesson");
  const rbT = useTranslations("ReciteBack");
  const { conceptGaps } = useVideoSync();

  return (
    <div className="mt-4">
      <Tabs defaultValue="details">
        <TabsList className="bg-transparent p-0 border-b border-border w-full justify-start h-auto rounded-none">
          <TabsTrigger className="capitalize" value="details">
            {t("description")}
          </TabsTrigger>
          {conceptGaps && conceptGaps.length > 0 && (
            <TabsTrigger className="capitalize" value="summary">
              {rbT("sessionSummary") || "Session Summary"}
            </TabsTrigger>
          )}
        </TabsList>
        <div className="pt-3">
          <TabsContent value="details">
            <div>{description}</div>
          </TabsContent>
          {conceptGaps && conceptGaps.length > 0 && (
            <TabsContent value="summary">
              <ConceptGapSummary gaps={conceptGaps} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div> 
  );
}

export default VideoDescription;
