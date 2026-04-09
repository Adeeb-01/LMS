import React from "react";
import PipelineDashboard from "./_components/pipeline-dashboard";

export default async function PipelinePage({ params }) {
  const { courseId, lessonId, locale } = await params;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <PipelineDashboard 
        courseId={courseId} 
        lessonId={lessonId} 
        locale={locale} 
      />
    </div>
  );
}
