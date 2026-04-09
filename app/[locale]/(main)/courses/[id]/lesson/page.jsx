import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Separator } from "@/components/ui/separator";
import VideoDescription from "./_components/video-description";
import { LessonVideoWrapper } from "./_components/lesson-video-wrapper";
import StudyMaterialsWrapper from "./_components/study-materials-wrapper";
import { DocumentSkeleton } from "@/components/documents/document-skeleton";
import { getCourseDetails } from "@/queries/courses";
import { replaceMongoIdInArray, replaceMongoIdInObject } from "@/lib/convertData";
import { LessonSyncWrapper } from "./_components/lesson-sync-wrapper";

export const dynamic = "force-dynamic";

const Course = async ({ params, searchParams }) => {
	const { id } = await params;
	const resolvedSearchParams = await searchParams;
	const { name, module } = resolvedSearchParams || {};
	const course = await getCourseDetails(id);
	const allModules = course?.modules ? replaceMongoIdInArray(course.modules).toSorted((a, b) => a.order - b.order) : [];

	// Find lesson and module from the course's populated data (NOT global lookup by slug)
	let lessonToPay = null;
	let defaultModule = null;

	if (name) {
		// Find the lesson by slug within THIS course's modules
		for (const m of allModules) {
			const sortedLessons = (m.lessonIds || []).toSorted((a, b) => a.order - b.order);
			const foundLesson = sortedLessons.find(l => l.slug === name);
			if (foundLesson) {
				lessonToPay = replaceMongoIdInObject(foundLesson);
				defaultModule = m.slug;
				break;
			}
		}
	}

	// Fallback to first lesson of first module if no name or lesson not found
	if (!lessonToPay && allModules.length > 0 && allModules[0]?.lessonIds?.length > 0) {
		const sortedLessons = allModules[0].lessonIds.toSorted((a, b) => a.order - b.order);
		lessonToPay = replaceMongoIdInObject(sortedLessons[0]);
		defaultModule = allModules[0].slug;
	}

	// Use URL module param only if lesson wasn't found by name (shouldn't normally happen)
	if (!defaultModule && module) {
		defaultModule = module;
	}

	// Serialize for client components (strip ObjectId/Buffer/toJSON)
	const lessonPlain = lessonToPay ? JSON.parse(JSON.stringify(lessonToPay)) : null;

	if (!lessonPlain) {
		const t = await getTranslations("Lesson");
		return (
			<div className="flex flex-col max-w-4xl mx-auto pb-20 p-4">
				<div className="text-center py-12">
					<p className="text-slate-500">{t("noLessonFound")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full max-w-4xl mx-auto pb-12">
			<LessonSyncWrapper lessonId={lessonPlain.id} courseId={id}>
				{/* Video section */}
				<section className="w-full rounded-lg overflow-hidden bg-muted/30">
					<LessonVideoWrapper courseId={id} lesson={lessonPlain} module={defaultModule} />
				</section>

				{/* Lesson details - dir="auto" for correct direction of mixed content (e.g. English titles on Arabic pages) */}
				<section className="mt-6 space-y-4" dir="auto">
					<h1 className="text-2xl font-semibold">{lessonPlain.title}</h1>
					<Separator />
					<VideoDescription description={lessonPlain.description} />
					
					<Suspense fallback={<DocumentSkeleton />}>
						<StudyMaterialsWrapper lessonId={lessonPlain.id} />
					</Suspense>
				</section>
			</LessonSyncWrapper>
		</div>
	);
};
export default Course;
