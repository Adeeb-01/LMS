import { IconBadge } from "@/components/icon-badge";
import { ImageIcon } from "lucide-react";

export const CourseMediaSection = ({ children, title }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ImageIcon} />
        <h2 className="text-xl font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
};
