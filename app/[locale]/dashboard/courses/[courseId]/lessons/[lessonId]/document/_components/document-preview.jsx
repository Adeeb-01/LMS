"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Type, List, Table as TableIcon, Heading1, Heading2, Heading3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Component to preview extracted text structure
 * @param {Object} extractedText - The extracted text data from LectureDocument
 */
export const DocumentPreview = ({ extractedText }) => {
  const t = useTranslations("LectureDocument");

  if (!extractedText || !extractedText.structuredContent) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm">{t("noDocument")}</p>
      </div>
    );
  }

  const { structuredContent, wordCount } = extractedText;

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${Math.min(block.level || 1, 3)}`;
        const headingStyles = {
          1: "text-2xl font-bold mt-6 mb-4 border-b pb-2",
          2: "text-xl font-bold mt-5 mb-3",
          3: "text-lg font-bold mt-4 mb-2"
        };
        return (
          <div key={index} className={cn(headingStyles[block.level] || headingStyles[3])}>
            {block.content}
          </div>
        );
      
      case 'list':
        return (
          <div key={index} className="flex gap-2 my-2 ml-4">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <p className="text-sm leading-relaxed">{block.content}</p>
          </div>
        );

      case 'table':
        return (
          <div key={index} className="my-4 overflow-x-auto border rounded-md bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <TableIcon className="h-3 w-3" />
              <span>Table Content</span>
            </div>
            <p className="text-sm italic">{block.content}</p>
          </div>
        );

      default:
        return (
          <p key={index} className="text-sm leading-relaxed my-3 text-foreground/90">
            {block.content}
          </p>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            {t("preview")}
          </CardTitle>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {t("wordCount", { count: wordCount })}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full rounded-md border p-6 bg-background">
          {structuredContent.length > 0 ? (
            <div className="max-w-prose mx-auto">
              {structuredContent.map((block, i) => renderBlock(block, i))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {extractedText.fullText || "No content found."}
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
