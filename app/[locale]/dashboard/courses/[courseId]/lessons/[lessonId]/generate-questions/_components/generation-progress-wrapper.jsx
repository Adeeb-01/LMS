"use client";

import React, { useState, useEffect, useCallback } from "react";
import GenerationProgress from "./generation-progress";
import { getGenerationStatus } from "@/app/actions/mcq-generation";
import { useRouter } from "next/navigation";

const GenerationProgressWrapper = ({ jobId, initialJob }) => {
  const [job, setJob] = useState(initialJob);
  const router = useRouter();

  const pollStatus = useCallback(async () => {
    try {
      const result = await getGenerationStatus(jobId);
      if (result.ok) {
        setJob(result.job);
        
        // Stop polling if completed or failed
        if (['completed', 'failed', 'cancelled'].includes(result.job.status)) {
          // Give it a moment to show completion then refresh to show questions
          if (result.job.status === 'completed') {
            setTimeout(() => {
              router.refresh();
            }, 2000);
          }
          return false; // Stop polling
        }
        return true; // Continue polling
      }
      return false;
    } catch (error) {
      console.error("Polling error:", error);
      return false;
    }
  }, [jobId, router]);

  useEffect(() => {
    let intervalId;
    
    const startPolling = async () => {
      const shouldContinue = await pollStatus();
      if (shouldContinue) {
        intervalId = setInterval(async () => {
          const stillContinue = await pollStatus();
          if (!stillContinue && intervalId) {
            clearInterval(intervalId);
          }
        }, 3000);
      }
    };

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollStatus]);

  return (
    <GenerationProgress 
      job={job} 
      onComplete={() => {
        // Handled by router.refresh in pollStatus
      }} 
    />
  );
};

export default GenerationProgressWrapper;
