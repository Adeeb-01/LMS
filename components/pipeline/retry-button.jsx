import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { retryPipelineStage } from "@/app/actions/pipeline";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

const RetryButton = ({ pipelineJobId, stage, onRetry }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("Pipeline");

  const handleRetry = async () => {
    setLoading(true);
    try {
      const result = await retryPipelineStage(pipelineJobId, stage);
      if (result.success) {
        toast({
          title: t('retry_success') || 'Retry Triggered',
          description: t('retry_desc') || 'The stage has been queued for retry.',
        });
        if (onRetry) onRetry();
      } else {
        toast({
          title: t('retry_error') || 'Retry Failed',
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('retry_error') || 'Retry Failed',
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRetry} 
      disabled={loading}
      className="flex items-center gap-1.5 h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 text-primary"
    >
      <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {t('retry') || 'Retry'}
    </Button>
  );
};

export default RetryButton;
