import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function DifficultyBadge({ difficulty, className }) {
  const t = useTranslations("MCQGeneration");
  const { bValue, bloomLevel, reasoning } = difficulty;

  const getDifficultyColor = (b) => {
    if (b < -0.5) return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
    if (b < 0.5) return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
    if (b < 1.5) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
    return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
  };

  const getDifficultyLabel = (b) => {
    if (b < -0.5) return t("difficulty_levels.easy");
    if (b < 0.5) return t("difficulty_levels.medium_easy");
    if (b < 1.5) return t("difficulty_levels.medium_hard");
    return t("difficulty_levels.hard");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("font-medium cursor-help", getDifficultyColor(bValue), className)}
          >
            {getDifficultyLabel(bValue)} (b={bValue.toFixed(1)})
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-bold">{t(`bloom.${bloomLevel}`)}</p>
            <p className="text-xs text-muted-foreground">{reasoning}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
