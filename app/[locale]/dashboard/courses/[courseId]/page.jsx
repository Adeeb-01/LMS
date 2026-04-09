import { ListChecks } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "./_components/category-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { ModulesForm } from "./_components/module-form";
import { PriceForm } from "./_components/price-form";
import { TitleForm } from "./_components/title-form";
import { CourseActions } from "./_components/course-action";
import AlertBanner from "@/components/alert-banner";
import { getCourseDetails } from "@/queries/courses";
import { SubTitleForm } from "./_components/subtitle-form";
import { getCategories } from "@/queries/categories";
import { replaceMongoIdInArray } from "@/lib/convertData";
import { ObjectId } from "mongoose";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { getCourseWithOwnershipCheck } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CourseInfoSection } from "./_components/course-info-section";
import { CourseMediaSection } from "./_components/course-media-section";
import { CoursePricingSection } from "./_components/course-pricing-section";
import { CourseStatusSection } from "./_components/course-status-section";
import CourseIndexingSummary from "./_components/course-indexing-summary";
import { PublishBadge } from "@/components/ui/publish-badge";
import { validatePublishRequirementsAction } from "@/app/actions/course";
import { PublishChecklist } from "./_components/publish-checklist";

const EditCourse = async ({ params }) => {
  const t = await getTranslations("CourseEdit");
  const { courseId } = await params;
  
  // Security: Verify ownership before allowing edit access
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    notFound();
  }
  
  const course = await getCourseWithOwnershipCheck(courseId, loggedInUser.id, loggedInUser);
  
  // If user doesn't own this course, return 404 to prevent info leakage
  if (!course) {
    notFound();
  }

  const validation = await validatePublishRequirementsAction(courseId);
  const categories = await getCategories();

  const mappedCategories = categories.map((c) => ({
    value: c.title,
    label: c.title,
    id: c.id,
  }));

  // Sanitize ObjectId & Buffer
  function sanitizeData(data) {
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (value instanceof ObjectId) return value.toString();
        if (Buffer.isBuffer(value)) return value.toString("base64");
        return value;
      })
    );
  }

  const rawModules = replaceMongoIdInArray(course?.modules || []).sort(
    (a, b) => a.order - b.order
  );
  const modules = sanitizeData(rawModules);

  // ✅ FIX: safe image url (avoid /undefined)
  const courseImageUrl = course?.thumbnail
    ? `/assets/images/courses/${course.thumbnail}`
    : "";

  return (
    <>
      {!course?.active && (
        <AlertBanner
          label={t("unpublishedBanner")}
          variant="warning"
        />
      )}

      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <div className="flex items-center gap-x-2">
              <h1 className="text-2xl font-medium">{t("courseSetup")}</h1>
              <PublishBadge 
                published={course?.active} 
                deleted={!!course?.deletedAt}
              />
            </div>
            <Link href={`/dashboard/courses/${courseId}/quizzes`}>
              <Button variant="outline" size="sm">
                <ListChecks className="w-4 h-4 me-2" />
                {t("quizzes")}
              </Button>
            </Link>
          </div>
          <CourseActions 
            courseId={courseId} 
            isActive={course?.active} 
            canPublish={validation.canPublish}
          />
        </div>

        <div className="mt-6">
          <PublishChecklist missing={validation.missing} />
        </div>

        <div className="mt-10">
          <CourseIndexingSummary courseId={courseId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Left Column */}
          <div className="space-y-6">
            <CourseInfoSection title={t("basicInfo")}>
              <TitleForm
                initialData={{ title: course?.title }}
                courseId={courseId}
              />
              <SubTitleForm
                initialData={{ subtitle: course?.subtitle }}
                courseId={courseId}
              />
              <DescriptionForm
                initialData={{ description: course?.description }}
                courseId={courseId}
              />
              <CategoryForm
                initialData={{ value: course?.category?.title }}
                courseId={courseId}
                options={mappedCategories}
              />
            </CourseInfoSection>

            <CourseMediaSection title={t("courseMedia")}>
              <ImageForm
                initialData={{ imageUrl: courseImageUrl }}
                courseId={courseId}
              />
            </CourseMediaSection>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <CourseStatusSection title={t("courseModules")}>
              <ModulesForm initialData={modules} courseId={courseId} />
            </CourseStatusSection>

            <CoursePricingSection title={t("coursePricing")}>
              <PriceForm
                initialData={{ price: course?.price }}
                courseId={courseId}
              />
            </CoursePricingSection>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCourse;
