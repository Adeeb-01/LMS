import { IconBadge } from "@/components/icon-badge";
import { CircleDollarSign } from "lucide-react";

export const CoursePricingSection = ({ children, title }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={CircleDollarSign} />
        <h2 className="text-xl font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
};
