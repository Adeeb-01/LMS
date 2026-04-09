"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, Type } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVideoSync } from "./video-text-sync";
import { TimestampBadge } from "@/components/alignment/timestamp-badge";

export const StudyMaterials = ({ document }) => {
  const t = useTranslations("LectureDocument");
  const tAlign = useTranslations("Alignment");
  const { activeBlockIndex, seekTo, alignments } = useVideoSync();

  if (!document || document.status !== 'ready') {
    return null;
  }

  const { extractedText, id } = document;

  const onDownload = (format) => {
    window.location.href = `/api/lecture-documents/${id}/download?format=${format}`;
  };

  const handleBlockClick = (blockAlignment) => {
    if (blockAlignment?.status === 'aligned') {
      seekTo(blockAlignment.startSeconds);
    } else if (blockAlignment?.status === 'not-spoken') {
      toast.info(tAlign("notCoveredInVideo"));
    }
  };

  const renderBlock = (block, index) => {
    const isActive = activeBlockIndex === index;
    const blockAlignment = alignments?.find(a => a.blockIndex === index);
    const canSeek = blockAlignment?.status === 'aligned';
    const isNotSpoken = blockAlignment?.status === 'not-spoken';

    const commonProps = {
      onClick: () => handleBlockClick(blockAlignment),
      className: cn(
        "relative group transition-colors duration-200 rounded px-1 -mx-1",
        (canSeek || isNotSpoken) ? "cursor-pointer" : "",
        canSeek ? "hover:bg-primary/5" : "",
        isActive ? "bg-primary/10 ring-1 ring-primary/20" : ""
      )
    };

    const BadgeOverlay = () => (
      canSeek && (
        <div className="absolute -left-12 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TimestampBadge seconds={blockAlignment.startSeconds} onClick={seekTo} />
        </div>
      )
    );

    switch (block.type) {
      case 'heading':
        const headingStyles = {
          1: "text-xl font-bold mt-6 mb-3",
          2: "text-lg font-bold mt-5 mb-2",
          3: "text-md font-bold mt-4 mb-1"
        };
        return (
          <div key={index} {...commonProps} className={cn(commonProps.className, headingStyles[block.level] || headingStyles[3])}>
            <BadgeOverlay />
            {block.content}
          </div>
        );
      case 'list':
        return (
          <div key={index} {...commonProps} className={cn(commonProps.className, "flex gap-2 my-1 ml-4")}>
            <BadgeOverlay />
            <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
            <p className="text-sm">{block.content}</p>
          </div>
        );
      default:
        return (
          <p key={index} {...commonProps} className={cn(commonProps.className, "text-sm leading-relaxed my-2 text-foreground/80")}>
            <BadgeOverlay />
            {block.content}
          </p>
        );
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          {t("studentView")}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onDownload('txt')}>
            <Download className="h-4 w-4 mr-2" />
            TXT
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload('html')}>
            <Download className="h-4 w-4 mr-2" />
            HTML
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-[200px] grid-cols-2 mb-4">
            <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
            <TabsTrigger value="full">{t("view")}</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div className="bg-muted/30 rounded-md p-4 max-h-[200px] overflow-hidden relative">
              <div className="prose prose-sm max-w-none">
                {extractedText.structuredContent.slice(0, 5).map((block, i) => renderBlock(block, i))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
            </div>
          </TabsContent>
          <TabsContent value="full">
            <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-background">
              <div className="prose prose-sm max-w-none">
                {extractedText.structuredContent.map((block, i) => renderBlock(block, i))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
