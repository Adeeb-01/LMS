import { getLectureDocumentByLesson } from "@/app/actions/lecture-document";
import { StudyMaterials } from "./study-materials";

export default async function StudyMaterialsWrapper({ lessonId }) {
  const docResult = await getLectureDocumentByLesson(lessonId);
  
  if (!docResult.success || !docResult.data) {
    return null;
  }

  return <StudyMaterials document={docResult.data} />;
}
