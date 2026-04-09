import React from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const GenerationStatus = ({ status, className }) => {
  const statusConfig = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10 border-yellow-500/20",
    },
    processing: {
      label: "Processing",
      icon: Loader2,
      className: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-blue-500/20 animate-pulse",
      iconClassName: "animate-spin",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-500 hover:bg-green-500/10 border-green-500/20",
    },
    failed: {
      label: "Failed",
      icon: XCircle,
      className: "bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20",
    },
    cancelled: {
      label: "Cancelled",
      icon: Ban,
      className: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/10 border-gray-500/20",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1.5 px-2 py-1", config.className, className)}>
      <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} />
      {config.label}
    </Badge>
  );
};

export default GenerationStatus;
