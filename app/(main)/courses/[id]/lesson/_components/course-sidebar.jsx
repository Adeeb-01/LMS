 
import { CourseProgress } from "@/components/course-progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { PlayCircle } from "lucide-react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { ReviewModal } from "./review-modal";
import { DownloadCertificate } from "./download-certificate";
import { GiveReview } from "./give-review";
import { SidebarModules } from "./sidebar-modules";
import { getCourseDetails } from "@/queries/courses";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Watch } from "@/model/watch-model";
import { ObjectId } from "mongoose";
import { getReport } from "@/queries/reports";
import Quiz from "./quiz";

export const CourseSidebar = async ({courseId}) => {

  const course = await getCourseDetails(courseId);
  const loggedinUser = await getLoggedInUser();

  const report = await getReport({ course:courseId, student: loggedinUser.id  })

  const totalCompletedModules = report?.totalCompletedModeules ? report?.totalCompletedModeules.length : 0;

  const totalModules = course?.modules ? course.modules.length : 0;

  const totalProgress = (totalModules > 0) ? (totalCompletedModules/totalModules) * 100 : 0;





  const updatedModules = await Promise.all(course?.modules.map(async(module) => {
    const moduleId = module._id.toString();
    const lessons = module?.lessonIds;

  const updatedLessons = await Promise.all(lessons.map(async (lesson) => {
    const lessonId = lesson._id.toString();
    const watch = await Watch.findOne({lesson: lessonId, module:moduleId , user: loggedinUser.id }).lean();
    if (watch?.state === 'completed') {
      lesson.state = 'completed';
    }
    return lesson;
  }))
    return module; 
  }));

  //console.log(updatedModules);

  const updatedallModules = updatedModules ? sanitizeData(updatedModules) : [];


  // Sanitize function for handle ObjectID and Buffer
function sanitizeData(data) {
  // Handle null/undefined
  if (!data || data === undefined || data === null) {
    return null;
  }
  
  try {
    const stringified = JSON.stringify(data, (key, value) => {
      if (value instanceof ObjectId) {
          return value.toString();
      }
      if (Buffer.isBuffer(value)) {
        return value.toString("base64");
      }
      return value;
    });
    
    return JSON.parse(stringified);
  } catch (error) {
    console.error('Error sanitizing data:', error);
    return null;
  }
}

  const quizSetall = course?.quizSet;
  const isQuizComplete = report?.quizAssessment ? true : false;
  const quizSet = quizSetall ? sanitizeData(quizSetall) : null;

  //console.log({quizSet});
  //console.log({isQuizComplete});

  return (
    <>
      <div className="h-full border-r flex flex-col overflow-y-auto shadow-sm">
        <div className="p-8 flex flex-col border-b">
          <h1 className="font-semibold">{course.title}</h1>
          {/* Check purchase */}
          {
            <div className="mt-10">
              <CourseProgress variant="success" value={totalProgress} />
            </div>
          }
        </div> 
        
        <SidebarModules courseId={courseId} modules={updatedallModules} />

        <div className="w-full px-4 lg:px-14 pt-10 border-t">
          {
            quizSet && <Quiz courseId={courseId} quizSet={quizSet} isTaken={isQuizComplete} />
          }
          
        </div>

        <div className="w-full px-6 mb-10">
        <GiveReview courseId={courseId} loginid={loggedinUser.id} /> 
        <DownloadCertificate courseId={courseId} totalProgress={totalProgress}  />
        </div> 



      </div>
      
    </>
  );
};
