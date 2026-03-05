import { IconBadge } from "@/components/icon-badge";
import { ListChecks } from "lucide-react";

export const CourseStatusSection = ({ children, title }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ListChecks} />
        <h2 className="text-xl font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
};
